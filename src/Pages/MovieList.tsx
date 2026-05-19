import { Search } from "lucide-react";
import React from "react";
import { Link, useSearchParams } from "react-router-dom";
import MovieCard from "../components/MovieCard.tsx";
import {
  InlineNotice,
  MovieGridSkeleton,
} from "../components/feedback/Skeletons";
import {
  flattenMoviePages,
  hasDegradedPage,
  useMovies,
} from "../hooks/useMovies";

const sortOptions = [
  { value: "popular", label: "Popular" },
  { value: "trending", label: "Trending" },
  { value: "top_rated", label: "Top Rated" },
  { value: "upcoming", label: "Coming Soon" },
];

const MovieList = () => {
  const [searchParams] = useSearchParams();
  const search = searchParams.get("search");
  const sort = searchParams.get("sort") || "popular";
  const moviesQuery = useMovies({ search: search || "", sort });
  const movies = flattenMoviePages(moviesQuery.data);

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-8 flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h1 className="text-3xl font-bold">
            {search ? `Search Results for "${search}"` : sort === "upcoming" ? "Coming Soon" : sort === "top_rated" ? "Top Rated" : "Popular Movies"}
          </h1>
          <p className="mt-2 text-sm text-zinc-400">
            {search
              ? "Browse matching titles from the movie provider and saved cache."
              : "Explore current movies with search and quick sort options."
            }
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <span className="text-sm text-zinc-400">Sort by:</span>
          {sortOptions.map((option) => (
            <Link
              key={option.value}
              to={`/movies?sort=${option.value}${search ? `&search=${encodeURIComponent(search)}` : ""}`}
              className={`rounded-full px-4 py-2 text-sm font-semibold transition ${
                sort === option.value
                  ? "bg-yellow-500 text-black"
                  : "bg-zinc-900 text-zinc-300 hover:bg-zinc-800"
              }`}
            >
              {option.label}
            </Link>
          ))}
        </div>
      </div>

      <InlineNotice>
        {hasDegradedPage(moviesQuery.data)
          ? "Live provider data is unavailable, so cached or fallback movies are being shown."
          : null}
      </InlineNotice>

      {moviesQuery.isLoading && movies.length === 0 ? (
        <MovieGridSkeleton />
      ) : movies.length === 0 ? (
        <div className="rounded-lg border border-zinc-800 bg-zinc-900 p-8 text-center">
          <Search className="w-10 h-10 text-zinc-500 mx-auto mb-3" />
          <h2 className="text-xl font-semibold mb-2">No movies found</h2>
          <p className="text-zinc-400">Try another title or clear the search.</p>
        </div>
      ) : (
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
          {movies.map((movie) => (
          <Link key={movie.id} to={`/movie/${movie.id}`}>
            <MovieCard {...movie} />
          </Link>
          ))}
        </div>
      )}

      {moviesQuery.nextCursor && (
        <div className="mt-10 flex justify-center">
          <button
            type="button"
            onClick={() => moviesQuery.fetchNextPage()}
            disabled={moviesQuery.isFetchingNextPage}
            className="bg-yellow-500 text-black px-6 py-3 rounded-lg font-semibold hover:bg-yellow-400 transition-colors disabled:opacity-60"
          >
            {moviesQuery.isFetchingNextPage ? "Loading..." : "Load more"}
          </button>
        </div>
      )}
    </div>
  );
};

export default MovieList;
