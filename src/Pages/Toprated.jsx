import { Star, Trophy } from "lucide-react";
import React from "react";
import { motion } from "framer-motion";
import { Link } from "react-router-dom";
import { InlineNotice, MovieGridSkeleton } from "../components/feedback/Skeletons";
import { flattenMoviePages, hasDegradedPage, useMovies } from "../hooks/useMovies";

const Toprated = () => {
  const topRatedQuery = useMovies({ sort: "top_rated" });
  const movies = flattenMoviePages(topRatedQuery.data);

  return (
    <div className="container mx-auto px-4 py-8">
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="flex items-center gap-3 mb-8"
      >
        <Trophy className="w-8 h-8 text-yellow-500" />
        <h1 className="text-3xl font-bold">Top Rated Movies</h1>
      </motion.div>

      <InlineNotice>
        {hasDegradedPage(topRatedQuery.data)
          ? "Top-rated data is using cached or fallback results while the provider recovers."
          : null}
      </InlineNotice>

      {topRatedQuery.isLoading && movies.length === 0 ? (
        <MovieGridSkeleton count={3} />
      ) : (
        <div className="space-y-6">
          {movies.map((movie, index) => (
            <motion.div
              key={movie.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: index * 0.05 }}
            >
              <Link to={`/movie/${movie.id}`}>
                <div className="bg-white dark:bg-gray-900 rounded-lg overflow-hidden shadow-md hover:shadow-lg transition-shadow duration-300">
                  <div className="flex">
                    <div className="w-16 bg-yellow-500 flex items-center justify-center text-black font-bold text-xl">
                      #{index + 1}
                    </div>
                    <div className="relative w-32 sm:w-48">
                      <img
                        src={movie.image}
                        alt={movie.title}
                        className="w-full h-full object-cover"
                      />
                    </div>
                    <div className="flex-1 p-6 min-w-0">
                      <div className="flex items-center justify-between gap-4 mb-2">
                        <h2 className="text-xl font-semibold text-gray-900 dark:text-white truncate">
                          {movie.title}
                        </h2>
                        <div className="flex items-center gap-1 bg-gray-100 dark:bg-gray-700 px-2 py-1 rounded-full">
                          <Star className="w-4 h-4 text-yellow-500 fill-current" />
                          <span className="text-sm font-medium text-gray-900 dark:text-white">
                            {movie.rating}
                          </span>
                        </div>
                      </div>
                      <div className="text-gray-400 dark:text-gray-200">
                        <span>{movie.year}</span>
                        <span className="mx-2">|</span>
                        <span>{movie.votes} votes</span>
                      </div>
                    </div>
                  </div>
                </div>
              </Link>
            </motion.div>
          ))}
        </div>
      )}

      {topRatedQuery.nextCursor && (
        <div className="mt-10 flex justify-center">
          <button
            type="button"
            onClick={() => topRatedQuery.fetchNextPage()}
            disabled={topRatedQuery.isFetchingNextPage}
            className="bg-yellow-500 text-black px-6 py-3 rounded-lg font-semibold hover:bg-yellow-400 transition-colors disabled:opacity-60"
          >
            {topRatedQuery.isFetchingNextPage ? "Loading..." : "Load more"}
          </button>
        </div>
      )}
    </div>
  );
};

export default Toprated;
