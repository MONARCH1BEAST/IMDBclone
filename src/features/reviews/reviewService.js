import {
  createStoredReview,
  flagStoredReview,
  getReviewsByMovieId,
  restoreStoredReview,
  softDeleteStoredReview,
  updateStoredReview,
  voteStoredReview,
} from './reviewRepository';

const API_PROVIDER = 'api';
const LOCAL_PROVIDER = 'local';

function configuredProvider() {
  return process.env.REACT_APP_REVIEWS_PROVIDER === API_PROVIDER
    ? API_PROVIDER
    : LOCAL_PROVIDER;
}

function apiUrl(path) {
  return path;
}

function isHtmlPayload(value) {
  return typeof value === 'string' && /<\s*html|<!doctype|Cannot\s+(GET|POST|PATCH|DELETE)/i.test(value);
}

async function parseResponsePayload(response) {
  const contentType = response.headers.get('content-type') || '';

  if (contentType.includes('application/json')) {
    try {
      return await response.json();
    } catch (error) {
      return null;
    }
  }

  try {
    return await response.text();
  } catch (error) {
    return null;
  }
}

function buildApiError(response, payload, fallbackMessage) {
  const detail =
    payload && typeof payload === 'object'
      ? payload.error || payload.message
      : isHtmlPayload(payload)
      ? null
      : payload;

  const message = detail
    ? `${fallbackMessage}: ${detail}`
    : `${fallbackMessage}. The review service is not available.`;

  const error = new Error(message);
  error.status = response.status;
  error.payload = payload;

  if (payload && typeof payload === 'object' && payload.issues) {
    error.issues = payload.issues;
  }

  return error;
}

async function requestJson(url, options, fallbackMessage) {
  const response = await fetch(apiUrl(url), options);
  const payload = await parseResponsePayload(response);

  if (!response.ok) {
    throw buildApiError(response, payload, fallbackMessage);
  }

  return payload;
}

export function getReviewProvider() {
  return configuredProvider();
}

export function getReviewErrorMessage(error) {
  if (!error) {
    return 'Something went wrong with reviews.';
  }

  if (error.issues?.length) {
    return 'Please check the review fields and try again.';
  }

  const message = error.message || String(error);

  if (isHtmlPayload(message)) {
    return 'The review service is not available. Your review was not saved.';
  }

  if (/Failed to fetch|NetworkError|Load failed/i.test(message)) {
    return 'The review service could not be reached. Please try again.';
  }

  return message;
}

export async function fetchReviews(movieId) {
  if (configuredProvider() === LOCAL_PROVIDER) {
    return getReviewsByMovieId(movieId);
  }

  const url = `/api/reviews?movieId=${encodeURIComponent(movieId)}`;
  return requestJson(
    url,
    {
      headers: { 'Content-Type': 'application/json' },
    },
    'Failed to fetch reviews'
  );
}

export function generateIdempotencyKey() {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID();
  }

  return `${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

export async function createReview({
  movieId,
  rating,
  body,
  idempotencyKey,
  userId,
  userName,
}) {
  if (configuredProvider() === LOCAL_PROVIDER) {
    return createStoredReview({
      movieId,
      rating,
      body,
      idempotencyKey,
      user: { id: userId, name: userName },
    });
  }

  return requestJson(
    '/api/reviews',
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Idempotency-Key': idempotencyKey,
      },
      body: JSON.stringify({ movieId, rating, body }),
    },
    'Failed to create review'
  );
}

export async function editReview({ id, body }) {
  if (configuredProvider() === LOCAL_PROVIDER) {
    return updateStoredReview({ id, body });
  }

  return requestJson(
    `/api/reviews/${encodeURIComponent(id)}`,
    {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ body }),
    },
    'Failed to edit review'
  );
}

export async function deleteReview(id) {
  if (configuredProvider() === LOCAL_PROVIDER) {
    return softDeleteStoredReview(id);
  }

  return requestJson(
    `/api/reviews/${encodeURIComponent(id)}`,
    {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
    },
    'Failed to delete review'
  );
}

export async function undoDelete(id) {
  if (configuredProvider() === LOCAL_PROVIDER) {
    return restoreStoredReview(id);
  }

  return requestJson(
    `/api/reviews/${encodeURIComponent(id)}/restore`,
    {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
    },
    'Failed to restore review'
  );
}

export async function voteReview({ reviewId, vote }) {
  if (configuredProvider() === LOCAL_PROVIDER) {
    return voteStoredReview({ reviewId, vote });
  }

  return requestJson(
    `/api/reviews/${encodeURIComponent(reviewId)}/vote`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ vote }),
    },
    'Failed to vote'
  );
}

export async function flagReview({ reviewId, reason }) {
  if (configuredProvider() === LOCAL_PROVIDER) {
    return flagStoredReview({ reviewId, reason });
  }

  return requestJson(
    `/api/reviews/${encodeURIComponent(reviewId)}/flag`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ reason }),
    },
    'Failed to flag review'
  );
}
