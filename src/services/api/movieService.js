import { telemetry } from "../../telemetry";
import { taggedCache } from "../cache/taggedCache";
import { createConfiguredProvider, createMockProvider } from "./providers";

function listCacheKey({ cursor = "1", search = "", sort = "popular" } = {}) {
  return `movies:list:${sort}:${search.trim().toLowerCase()}:${cursor}`;
}

function detailCacheKey(id) {
  return `movies:detail:${id}`;
}

function listTags({ search = "", sort = "popular" } = {}) {
  return ["movies", `movies:${sort}`, search ? `movies:search:${search}` : "movies:browse"];
}

function withDegradedMeta(data, error, source) {
  return {
    ...data,
    degraded: true,
    stale: true,
    fallbackSource: source,
    errorMessage: error?.message || "The live movie provider is temporarily unavailable.",
  };
}

const hasValue = (value) => value !== null && value !== undefined;

export function createMovieService({
  provider = createConfiguredProvider(),
  fallbackProvider = createMockProvider(),
  cache = taggedCache,
  cacheTtlMs = 10 * 60 * 1000,
} = {}) {
  const detailRequests = new Map();

  async function resolveWithFallback({ key, tags, load, fallback }) {
    const cacheOptions = { tags, ttlMs: cacheTtlMs };
    const readCache = async (options = {}) => {
      try {
        return await cache.get(key, options);
      } catch (error) {
        return null;
      }
    };

    const cached = await readCache(cacheOptions);
    // If cached value exists and is not degraded, return it immediately.
    // If it's degraded, attempt to fetch fresh provider data instead of
    // returning fallback/cached degraded content.
    if (hasValue(cached) && !cached.degraded) {
      return cached;
    }

    try {
      const data = await load();
      const fresh = {
        ...data,
        degraded: false,
        stale: false,
        fallbackSource: null,
      };
      await cache.set(key, fresh, { tags, ttlMs: cacheTtlMs });
      return fresh;
    } catch (error) {
      telemetry.recordError({
        provider: provider.name,
        status: error.status,
        error,
      });

      const staleCached = await readCache({
        ...cacheOptions,
        allowStale: true,
      });
      if (hasValue(staleCached)) {
        return withDegradedMeta(staleCached, error, "cache");
      }

      const fallbackData = await fallback();
      return withDegradedMeta(fallbackData, error, "mock");
    }
  }

  return {
    providerName: provider.name,

    listMovies(params = {}) {
      const safeParams = {
        cursor: params.cursor || "1",
        search: params.search || "",
        sort: params.sort || "popular",
        signal: params.signal,
      };

      return resolveWithFallback({
        key: listCacheKey(safeParams),
        tags: listTags(safeParams),
        load: () => provider.listMovies(safeParams),
        fallback: () => fallbackProvider.listMovies(safeParams),
      });
    },

    getMovieDetails(id, options = {}) {
      const movieId = String(id);
      const inFlight = detailRequests.get(movieId);
      if (inFlight) {
        return inFlight;
      }

      const request = resolveWithFallback({
        key: detailCacheKey(id),
        tags: ["movies", `movie:${id}`],
        load: () => provider.getMovieDetails(id, options),
        fallback: () => fallbackProvider.getMovieDetails(id, options),
      }).finally(() => {
        detailRequests.delete(movieId);
      });

      detailRequests.set(movieId, request);
      return request;
    },

    revalidateTag(tag) {
      return cache.revalidateTag(tag);
    },
  };
}

export const movieService = createMovieService();
