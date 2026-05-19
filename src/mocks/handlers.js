import { rest } from 'msw';
import { ReviewInputSchema, ReviewEditSchema } from '../features/reviews/reviewSchemas';

const mockReviews = new Map(); // key: review UUID string, value: Review object
const seenIdempotencyKeys = new Map(); // key: idempotency key, value: review UUID
const mockWatchlist = new Map();
const seenWatchlistKeys = new Set();

const generateId = () => {
  // CRA targets older runtimes; rely on browser globals when available.
  if (typeof crypto !== 'undefined' && crypto.randomUUID) return crypto.randomUUID();
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (mask) => {
    const random =
      typeof crypto !== 'undefined' && crypto.getRandomValues
        ? crypto.getRandomValues(new Uint8Array(1))[0]
        : Math.floor(Math.random() * 256);
    const value = mask === 'x' ? random & 15 : (random & 3) | 8;
    return value.toString(16);
  });
};

export const handlers = [
  rest.get('/api/reviews', (req, res, ctx) => {
    const movieId = Number(req.url.searchParams.get('movieId'));
    const reviews = Array.from(mockReviews.values()).filter(
      (r) => r.movieId === movieId && r.deleted === false
    );
    return res(ctx.status(200), ctx.json(reviews));
  }),

  rest.get('/api/watchlist', (req, res, ctx) => {
    return res(ctx.status(200), ctx.json(Array.from(mockWatchlist.values())));
  }),

  rest.post('/api/watchlist', async (req, res, ctx) => {
    const body = await req.json();
    if (!body || typeof body.movieId !== 'number') {
      return res(ctx.status(400), ctx.json({ error: 'Invalid payload' }));
    }

    const key = `${body.movieId}`;
    if (seenWatchlistKeys.has(key)) {
      return res(ctx.status(200), ctx.json({ movieId: body.movieId, watched: true }));
    }

    mockWatchlist.set(key, {
      movieId: body.movieId,
      title: body.title || 'Unknown Title',
      poster: body.poster || null,
      addedAt: Date.now(),
      updatedAt: Date.now(),
      synced: true,
      deleted: false,
    });
    seenWatchlistKeys.add(key);

    return res(ctx.status(201), ctx.json({ movieId: body.movieId, added: true }));
  }),

  rest.delete('/api/watchlist/:movieId', (req, res, ctx) => {
    const movieId = Number(req.params.movieId);
    const key = `${movieId}`;
    const existing = mockWatchlist.get(key);
    if (!existing) {
      return res(ctx.status(404), ctx.json({ error: 'Not found' }));
    }

    existing.deleted = true;
    existing.updatedAt = Date.now();
    mockWatchlist.set(key, existing);
    return res(ctx.status(200), ctx.json({ movieId, removed: true }));
  }),

  // MSW v1 compatible SSE handler: return a plain string SSE body.
  rest.get('/api/reviews/stream', (req, res, ctx) => {
    const movieId = Number(req.url.searchParams.get('movieId'));

    const id = generateId();
    const review = {
      id,
      movieId,
      userId: 'user-001',
      userName: 'Test User',
      rating: 7,
      body: 'This is a streamed review body that is long enough.',
      createdAt: Date.now(),
      updatedAt: Date.now(),
      version: 1,
      deleted: false,
      upvotes: 3,
      downvotes: 1,
      userVote: null,
      revisions: [],
      flagged: false,
    };

    mockReviews.set(id, review);

    const connected = 'data: {"type":"connected"}\n\n';
    const newReview = `data: ${JSON.stringify({ type: 'new_review', review })}\n\n`;

    return res(
      ctx.status(200),
      ctx.set('Content-Type', 'text/event-stream'),
      ctx.set('Cache-Control', 'no-cache'),
      ctx.body(`${connected}${newReview}`)
    );
  }),

  rest.post('/api/reviews', async (req, res, ctx) => {
    const idempotencyKey = req.headers.get('X-Idempotency-Key');
    if (!idempotencyKey) {
      return res(ctx.status(400), ctx.json({ error: 'Missing idempotency key' }));
    }

    if (seenIdempotencyKeys.has(idempotencyKey)) {
      const existingId = seenIdempotencyKeys.get(idempotencyKey);
      const existing = mockReviews.get(existingId);
      if (existing) return res(ctx.status(200), ctx.json(existing));
    }

    const body = await req.json();
    let parsed;
    try {
      parsed = ReviewInputSchema.parse(body);
    } catch (e) {
      return res(ctx.status(422), ctx.json({ error: 'Validation failed', issues: e.issues }));
    }

    const id = generateId();
    const review = {
      id,
      movieId: parsed.movieId,
      userId: 'user-001',
      userName: 'Test User',
      rating: parsed.rating,
      body: parsed.body,
      createdAt: Date.now(),
      updatedAt: Date.now(),
      version: 1,
      deleted: false,
      upvotes: 0,
      downvotes: 0,
      userVote: null,
      revisions: [],
      flagged: false,
    };

    mockReviews.set(id, review);
    seenIdempotencyKeys.set(idempotencyKey, id);

    return res(ctx.status(201), ctx.json(review));
  }),

  rest.patch('/api/reviews/:id', async (req, res, ctx) => {
    const id = req.params.id;
    const existing = mockReviews.get(id);
    if (!existing) {
      return res(ctx.status(404), ctx.json({ error: 'Not found' }));
    }

    const body = await req.json();
    let parsed;
    try {
      parsed = ReviewEditSchema.parse({ id, body });
    } catch (e) {
      return res(ctx.status(422), ctx.json({ error: 'Validation failed', issues: e.issues }));
    }

    existing.revisions = [
      ...existing.revisions,
      {
        id: generateId(),
        originalBody: existing.body,
        newBody: parsed.body,
        editedAt: Date.now(),
        version: existing.version,
      },
    ];
    existing.body = parsed.body;
    existing.updatedAt = Date.now();
    existing.version += 1;
    mockReviews.set(id, existing);
    return res(ctx.status(200), ctx.json(existing));
  }),

  rest.delete('/api/reviews/:id', (req, res, ctx) => {
    const id = req.params.id;
    const existing = mockReviews.get(id);
    if (!existing) {
      return res(ctx.status(404), ctx.json({ error: 'Not found' }));
    }

    existing.deleted = true;
    existing.updatedAt = Date.now();
    mockReviews.set(id, existing);
    return res(ctx.status(200), ctx.json({ success: true }));
  }),

  rest.patch('/api/reviews/:id/restore', (req, res, ctx) => {
    const id = req.params.id;
    const existing = mockReviews.get(id);
    if (!existing) {
      return res(ctx.status(404), ctx.json({ error: 'Not found' }));
    }

    existing.deleted = false;
    existing.updatedAt = Date.now();
    mockReviews.set(id, existing);
    return res(ctx.status(200), ctx.json(existing));
  }),

  rest.post('/api/reviews/:reviewId/vote', async (req, res, ctx) => {
    const reviewId = req.params.reviewId;
    const existing = mockReviews.get(reviewId);
    if (!existing) {
      return res(ctx.status(404), ctx.json({ error: 'Not found' }));
    }

    const body = await req.json();
    const vote = body?.vote;
    if (vote !== 'up' && vote !== 'down') {
      return res(ctx.status(400), ctx.json({ error: 'Invalid vote' }));
    }

    if (existing.userVote === vote) {
      if (vote === 'up') existing.upvotes -= 1;
      if (vote === 'down') existing.downvotes -= 1;
      existing.userVote = null;
    } else {
      if (existing.userVote === 'up' && vote === 'down') {
        existing.upvotes -= 1;
        existing.downvotes += 1;
      } else if (existing.userVote === 'down' && vote === 'up') {
        existing.downvotes -= 1;
        existing.upvotes += 1;
      } else if (!existing.userVote) {
        if (vote === 'up') existing.upvotes += 1;
        if (vote === 'down') existing.downvotes += 1;
      }
      existing.userVote = vote;
    }

    existing.updatedAt = Date.now();
    mockReviews.set(reviewId, existing);
    return res(ctx.status(200), ctx.json(existing));
  }),

  rest.post('/api/reviews/:reviewId/flag', async (req, res, ctx) => {
    const reviewId = req.params.reviewId;
    const existing = mockReviews.get(reviewId);
    if (!existing) {
      return res(ctx.status(404), ctx.json({ error: 'Not found' }));
    }

    const body = await req.json();
    const reason = body?.reason;
    if (!reason || typeof reason !== 'string' || reason.length < 1 || reason.length > 200) {
      return res(
        ctx.status(422),
        ctx.json({
          error: 'Validation failed',
          issues: [{ code: 'custom', message: 'Invalid reason' }],
        })
      );
    }

    existing.flagged = true;
    existing.updatedAt = Date.now();
    mockReviews.set(reviewId, existing);
    return res(ctx.status(200), ctx.json(existing));
  }),
];

