import {
  keepPreviousData,
  useInfiniteQuery,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";
import { useEffect, useMemo, useRef } from "react";
import { fallbackMovies } from "../data/fallbackMovies";
import { movieService } from "../services/api/movieService";

const FIRST_PAGE_CURSOR = "1";
const MOVIE_DETAIL_STALE_TIME = 10 * 60 * 1000;

export const movieKeys = {
  all: ["movies"],
  lists: () => [...movieKeys.all, "list"],
  list: ({ search = "", sort = "popular" } = {}) => [
    ...movieKeys.lists(),
    { search, sort },
  ],
  details: () => [...movieKeys.all, "detail"],
  detail: (id) => [...movieKeys.details(), String(id)],
};

export function useMovies({ search = "", sort = "popular" } = {}) {
  const query = useInfiniteQuery({
    queryKey: movieKeys.list({ search, sort }),
    initialPageParam: FIRST_PAGE_CURSOR,
    queryFn: ({ pageParam, signal }) =>
      movieService.listMovies({
        cursor: pageParam || FIRST_PAGE_CURSOR,
        search,
        sort,
        signal,
      }),
    getNextPageParam: (lastPage) => lastPage.nextCursor || undefined,
    placeholderData: keepPreviousData,
  });
  const pages = query.data?.pages || [];
  const nextCursor = pages.length
    ? pages[pages.length - 1].nextCursor || null
    : null;

  return {
    ...query,
    nextCursor,
  };
}

export function useMovieDetails(id) {
  const query = useQuery({
    queryKey: movieKeys.detail(id),
    queryFn: ({ signal }) => movieService.getMovieDetails(id, { signal }),
    enabled: Boolean(id),
  });

  const hasRetriedDegraded = useRef(false);
  const { data, isSuccess, isFetching, refetch } = query;

  useEffect(() => {
    hasRetriedDegraded.current = false;
  }, [id]);

  useEffect(() => {
    if (
      data?.degraded &&
      isSuccess &&
      !isFetching &&
      !hasRetriedDegraded.current
    ) {
      hasRetriedDegraded.current = true;
      refetch();
    }
  }, [data?.degraded, isSuccess, isFetching, refetch]);

  return query;
}

export function prefetchMovieDetails(
  queryClient,
  id,
  { staleTime = MOVIE_DETAIL_STALE_TIME } = {}
) {
  if (!id) {
    return Promise.resolve();
  }

  return queryClient.prefetchQuery({
    queryKey: movieKeys.detail(id),
    queryFn: ({ signal }) => movieService.getMovieDetails(id, { signal }),
    staleTime,
  });
}

function flattenListData(data) {
  return data?.pages?.flatMap((page) => page.items || []) || [];
}

function uniqueMovies(movies) {
  const seen = new Set();
  return movies.filter((movie) => {
    const id = String(movie?.id || "");
    if (!id || seen.has(id)) {
      return false;
    }

    seen.add(id);
    return true;
  });
}

export function adjacentMovieIds(queryClient, id) {
  if (!id) {
    return [];
  }

  const currentId = String(id);
  const cachedLists = queryClient.getQueriesData({
    queryKey: movieKeys.lists(),
  });
  const cachedMovies = uniqueMovies(
    cachedLists.flatMap(([, data]) => flattenListData(data))
  );
  const list = cachedMovies.length ? cachedMovies : fallbackMovies;
  const index = list.findIndex((movie) => String(movie.id) === currentId);

  if (index === -1) {
    return [];
  }

  return [list[index - 1]?.id, list[index + 1]?.id]
    .filter(Boolean)
    .map(String);
}

export function prefetchAdjacentMovies(queryClient, id) {
  return Promise.all(
    adjacentMovieIds(queryClient, id).map((movieId) =>
      prefetchMovieDetails(queryClient, movieId)
    )
  );
}

export function useAdjacentMoviePreloads(id) {
  const queryClient = useQueryClient();

  useEffect(() => {
    prefetchAdjacentMovies(queryClient, id);
  }, [queryClient, id]);
}

export function prefetchOnHover(
  queryClient,
  id,
  { debounceMs = 100, staleTime = MOVIE_DETAIL_STALE_TIME } = {}
) {
  let timeoutId;

  const cancel = () => {
    if (timeoutId) {
      clearTimeout(timeoutId);
      timeoutId = undefined;
    }
  };

  const schedule = () => {
    if (!id) {
      return;
    }

    cancel();
    timeoutId = setTimeout(() => {
      timeoutId = undefined;
      prefetchMovieDetails(queryClient, id, { staleTime });
    }, debounceMs);
  };

  schedule.cancel = cancel;
  return schedule;
}

export function usePrefetchMovieDetails(id) {
  const queryClient = useQueryClient();
  const prefetch = useMemo(
    () => prefetchOnHover(queryClient, id),
    [queryClient, id]
  );

  useEffect(() => () => prefetch.cancel(), [prefetch]);

  return prefetch;
}

export function flattenMoviePages(data) {
  return flattenListData(data);
}

export function hasDegradedPage(data) {
  return Boolean(data?.pages?.some((page) => page.degraded));
}
