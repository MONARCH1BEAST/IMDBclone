import { getDB } from '../../db/database';
import {
  FlagSchema,
  ReviewEditSchema,
  ReviewInputSchema,
  ReviewSchema,
  VoteSchema,
} from './reviewSchemas';

const STORE_NAME = 'reviews';
const DEFAULT_USER = { id: 'user-001', name: 'Test User' };

function now() {
  return Date.now();
}

function randomHexDigit(mask) {
  const random =
    typeof crypto !== 'undefined' && crypto.getRandomValues
      ? crypto.getRandomValues(new Uint8Array(1))[0]
      : Math.floor(Math.random() * 256);
  const value = mask === 'x' ? random & 15 : (random & 3) | 8;
  return value.toString(16);
}

function generateReviewId() {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID();
  }

  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, randomHexDigit);
}

function normalizeUser(user = {}) {
  return {
    id: user.id || user.userId || DEFAULT_USER.id,
    name: user.name || user.userName || DEFAULT_USER.name,
  };
}

function normalizeMovieId(movieId) {
  const parsed = typeof movieId === 'string' ? Number(movieId) : movieId;
  if (!Number.isInteger(parsed) || parsed <= 0) {
    throw new Error('Invalid movie id.');
  }
  return parsed;
}

function toClientReview(entry) {
  return ReviewSchema.parse(entry);
}

function notFoundError() {
  const error = new Error('Review not found.');
  error.status = 404;
  return error;
}

async function getReviewStore(mode = 'readonly') {
  const db = await getDB();
  const tx = db.transaction(STORE_NAME, mode);
  return { tx, store: tx.objectStore(STORE_NAME) };
}

async function getAllReviewEntries() {
  const { tx, store } = await getReviewStore('readonly');
  const entries = await store.getAll();
  await tx.done;
  return entries;
}

export async function getReviewsByMovieId(movieId) {
  const normalizedMovieId = normalizeMovieId(movieId);
  const { tx, store } = await getReviewStore('readonly');
  let entries;

  try {
    entries = await store.index('movieId').getAll(normalizedMovieId);
  } catch (error) {
    entries = (await store.getAll()).filter((entry) => entry.movieId === normalizedMovieId);
  }

  await tx.done;

  return entries
    .filter((entry) => entry.deleted === false)
    .map(toClientReview)
    .sort((a, b) => b.createdAt - a.createdAt);
}

export async function createStoredReview({
  movieId,
  rating,
  body,
  idempotencyKey,
  user,
}) {
  const parsed = ReviewInputSchema.parse({
    movieId: normalizeMovieId(movieId),
    rating,
    body,
  });
  const author = normalizeUser(user);
  const { tx, store } = await getReviewStore('readwrite');

  if (idempotencyKey) {
    const existingEntries = await store.getAll();
    const existing = existingEntries.find(
      (entry) => entry.idempotencyKey === idempotencyKey && entry.deleted === false
    );

    if (existing) {
      await tx.done;
      return toClientReview(existing);
    }
  }

  const timestamp = now();
  const review = ReviewSchema.parse({
    id: generateReviewId(),
    movieId: parsed.movieId,
    userId: author.id,
    userName: author.name,
    rating: parsed.rating,
    body: parsed.body,
    createdAt: timestamp,
    updatedAt: timestamp,
    version: 1,
    deleted: false,
    upvotes: 0,
    downvotes: 0,
    userVote: null,
    revisions: [],
    flagged: false,
  });

  await store.put({ ...review, idempotencyKey: idempotencyKey || null });
  await tx.done;
  return review;
}

export async function updateStoredReview({ id, body }) {
  const parsed = ReviewEditSchema.parse({ id, body });
  const { tx, store } = await getReviewStore('readwrite');
  const existing = await store.get(parsed.id);

  if (!existing || existing.deleted) {
    await tx.done;
    throw notFoundError();
  }

  const updated = {
    ...existing,
    body: parsed.body,
    updatedAt: now(),
    version: existing.version + 1,
    revisions: [
      ...(existing.revisions || []),
      {
        id: generateReviewId(),
        originalBody: existing.body,
        newBody: parsed.body,
        editedAt: now(),
        version: existing.version,
      },
    ],
  };

  await store.put(updated);
  await tx.done;
  return toClientReview(updated);
}

export async function softDeleteStoredReview(id) {
  const { tx, store } = await getReviewStore('readwrite');
  const existing = await store.get(id);

  if (!existing || existing.deleted) {
    await tx.done;
    throw notFoundError();
  }

  const updated = {
    ...existing,
    deleted: true,
    updatedAt: now(),
  };

  await store.put(updated);
  await tx.done;
  return { success: true };
}

export async function restoreStoredReview(id) {
  const { tx, store } = await getReviewStore('readwrite');
  const existing = await store.get(id);

  if (!existing) {
    await tx.done;
    throw notFoundError();
  }

  const updated = {
    ...existing,
    deleted: false,
    updatedAt: now(),
  };

  await store.put(updated);
  await tx.done;
  return toClientReview(updated);
}

export async function voteStoredReview({ reviewId, vote }) {
  const parsed = VoteSchema.parse({ reviewId, vote });
  const { tx, store } = await getReviewStore('readwrite');
  const existing = await store.get(parsed.reviewId);

  if (!existing || existing.deleted) {
    await tx.done;
    throw notFoundError();
  }

  let { upvotes, downvotes, userVote } = existing;

  if (userVote === parsed.vote) {
    if (parsed.vote === 'up') upvotes -= 1;
    if (parsed.vote === 'down') downvotes -= 1;
    userVote = null;
  } else {
    if (userVote === 'up' && parsed.vote === 'down') {
      upvotes -= 1;
      downvotes += 1;
    } else if (userVote === 'down' && parsed.vote === 'up') {
      downvotes -= 1;
      upvotes += 1;
    } else {
      if (parsed.vote === 'up') upvotes += 1;
      if (parsed.vote === 'down') downvotes += 1;
    }
    userVote = parsed.vote;
  }

  const updated = {
    ...existing,
    upvotes: Math.max(0, upvotes),
    downvotes: Math.max(0, downvotes),
    userVote,
    updatedAt: now(),
  };

  await store.put(updated);
  await tx.done;
  return toClientReview(updated);
}

export async function flagStoredReview({ reviewId, reason }) {
  const parsed = FlagSchema.parse({ reviewId, reason });
  const { tx, store } = await getReviewStore('readwrite');
  const existing = await store.get(parsed.reviewId);

  if (!existing || existing.deleted) {
    await tx.done;
    throw notFoundError();
  }

  const updated = {
    ...existing,
    flagged: true,
    flagReason: parsed.reason,
    updatedAt: now(),
  };

  await store.put(updated);
  await tx.done;
  return toClientReview(updated);
}

export async function clearStoredReviews() {
  const { tx, store } = await getReviewStore('readwrite');
  await store.clear();
  await tx.done;
}

export async function getStoredReviewCount() {
  const entries = await getAllReviewEntries();
  return entries.filter((entry) => entry.deleted === false).length;
}
