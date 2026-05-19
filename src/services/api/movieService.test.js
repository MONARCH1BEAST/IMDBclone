import { createTaggedMemoryCache } from "../cache/taggedCache";
import { ApiError } from "./httpClient";
import { createMovieService } from "./movieService";

function createFallbackProvider() {
  return {
    name: "mock",
    listMovies: jest.fn(async () => ({
      items: [{ id: "fallback", title: "Fallback Movie" }],
      nextCursor: null,
      cursor: "1",
      total: 1,
      provider: "mock",
    })),
    getMovieDetails: jest.fn(async () => ({
      id: "fallback",
      title: "Fallback Movie",
    })),
  };
}

test("serves fallback data gracefully when the live provider returns 429", async () => {
  const provider = {
    name: "tmdb",
    listMovies: jest.fn(async () => {
      throw new ApiError("Rate limited.", { status: 429, provider: "tmdb" });
    }),
    getMovieDetails: jest.fn(),
  };
  const service = createMovieService({
    provider,
    fallbackProvider: createFallbackProvider(),
    cache: createTaggedMemoryCache(),
  });

  await expect(service.listMovies({ sort: "popular" })).resolves.toMatchObject({
    degraded: true,
    fallbackSource: "mock",
    items: [{ id: "fallback", title: "Fallback Movie" }],
  });
});

test("returns stale cached data during a 5xx burst before falling back to mock data", async () => {
  const provider = {
    name: "tmdb",
    listMovies: jest
      .fn()
      .mockResolvedValueOnce({
        items: [{ id: "cached", title: "Cached Movie" }],
        nextCursor: null,
        cursor: "1",
        total: 1,
        provider: "tmdb",
      })
      .mockRejectedValue(
        new ApiError("Provider down.", { status: 503, provider: "tmdb" })
      ),
    getMovieDetails: jest.fn(),
  };
  const service = createMovieService({
    provider,
    fallbackProvider: createFallbackProvider(),
    cache: createTaggedMemoryCache(),
    cacheTtlMs: -1,
  });

  await service.listMovies({ sort: "popular" });

  await expect(service.listMovies({ sort: "popular" })).resolves.toMatchObject({
    degraded: true,
    fallbackSource: "cache",
    items: [{ id: "cached", title: "Cached Movie" }],
  });
});

test("coalesces simultaneous detail requests for the same movie id", async () => {
  let resolveDetail;
  const detailPromise = new Promise((resolve) => {
    resolveDetail = resolve;
  });
  const provider = {
    name: "tmdb",
    listMovies: jest.fn(),
    getMovieDetails: jest.fn(() => detailPromise),
  };
  const service = createMovieService({
    provider,
    fallbackProvider: createFallbackProvider(),
    cache: createTaggedMemoryCache(),
  });

  const first = service.getMovieDetails("42");
  const second = service.getMovieDetails("42");
  resolveDetail({ id: "42", title: "Shared Movie" });

  await expect(Promise.all([first, second])).resolves.toEqual([
    expect.objectContaining({ id: "42", title: "Shared Movie" }),
    expect.objectContaining({ id: "42", title: "Shared Movie" }),
  ]);
  expect(provider.getMovieDetails).toHaveBeenCalledTimes(1);
});
