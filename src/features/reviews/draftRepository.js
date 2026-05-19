import { getDB } from '../../db/database';

export async function getDraft(movieId) {
  const db = await getDB();
  const tx = db.transaction('drafts', 'readonly');
  const store = tx.objectStore('drafts');
  const draft = await store.get(movieId);
  await tx.done;
  return draft || null;
}

export async function saveDraft(movieId, { body, rating }) {
  const db = await getDB();
  const tx = db.transaction('drafts', 'readwrite');
  const store = tx.objectStore('drafts');

  const draft = {
    movieId,
    body,
    rating: rating === null || rating === undefined ? null : rating,
    savedAt: Date.now(),
  };

  await store.put(draft);
  await tx.done;
  return draft;
}

export async function clearDraft(movieId) {
  const db = await getDB();
  const tx = db.transaction('drafts', 'readwrite');
  const store = tx.objectStore('drafts');
  await store.delete(movieId);
  await tx.done;
}

