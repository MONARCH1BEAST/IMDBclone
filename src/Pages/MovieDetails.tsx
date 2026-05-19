import {
  Award,
  BarChart3,
  Calendar,
  Clock,
  DollarSign,
  Globe,
  Share2,
  Star,
} from "lucide-react";
import React, { Suspense, useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import MovieMediaCarousel, {
  isAllowedImageSource,
} from "../components/MovieMediaCarousel.tsx";
import WatchlistToggle from "../features/watchlist/WatchlistToggle";
import {
  InlineNotice,
  MovieDetailsSkeleton,
} from "../components/feedback/Skeletons";
import { useAdjacentMoviePreloads, useMovieDetails } from "../hooks/useMovies";
import ReviewList from "../features/reviews/ReviewList";
import { useReviews } from "../features/reviews/useReviews";
import { getReviewErrorMessage } from "../features/reviews/reviewService";

const staticPlaceholderMovie = {
  id: "static-placeholder",
  title: "Movie details unavailable",
  rating: "N/A",
  image: null,
  backdrop: null,
  year: "TBA",
  releaseDate: "TBA",
  duration: "Unknown",
  genre: ["Offline", "Placeholder"],
  director: "Unavailable",
  description:
    "The live provider, cache, and fallback data are temporarily unavailable. Static placeholder cards are shown until the circuit recovers.",
  cast: [
    {
      id: "placeholder-cast-1",
      name: "Cast unavailable",
      role: "Placeholder card",
      image: null,
      bio: "Cast data will return when the provider recovers.",
    },
    {
      id: "placeholder-cast-2",
      name: "Credits unavailable",
      role: "Placeholder card",
      image: null,
      bio: "Credits are being protected by the fallback UI.",
    },
  ],
  trailer: null,
  awards: ["Static placeholder card", "Provider recovery pending"],
  boxOffice: "Unavailable",
  language: "Unknown",
  productionCompany: "Unavailable",
  metacriticScore: null,
  rottenTomatoesScore: null,
  degraded: true,
  staticPlaceholder: true,
};

const scoreText = (label, value, suffix = "") => {
  if (value === null || value === undefined) {
    return `${label}: Unavailable`;
  }
  return `${label}: ${value}${suffix}`;
};

const ReviewEditor = React.lazy(() => import("../features/reviews/ReviewEditor"));

const MovieDetails = () => {
  const { id } = useParams();
  const movieQuery = useMovieDetails(id);
  useAdjacentMoviePreloads(id);
  const [showReviewEditor, setShowReviewEditor] = useState(false);
  const [reviewSort, setReviewSort] = useState("recent");
  const movieId = Number(id);
  const reviewsQuery = useReviews(movieId);
  const movie =
    movieQuery.data || (movieQuery.isError ? staticPlaceholderMovie : null);

  const reviews = useMemo(() => reviewsQuery.data || [], [reviewsQuery.data]);
  const sortedReviews = useMemo(() => {
    return [...reviews].sort((a, b) => {
      if (reviewSort === "helpful") {
        const scoreA = (a.upvotes || 0) - (a.downvotes || 0);
        const scoreB = (b.upvotes || 0) - (b.downvotes || 0);
        if (scoreA !== scoreB) {
          return scoreB - scoreA;
        }
      }
      return b.createdAt - a.createdAt;
    });
  }, [reviews, reviewSort]);

  if (movieQuery.isLoading && !movie) {
    return <MovieDetailsSkeleton />;
  }

  if (!movie) {
    return (
      <div className="container mx-auto px-4 py-16">
        <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-8">
          <h1 className="text-2xl font-bold mb-2">Movie unavailable</h1>
          <p className="text-zinc-400">
            The live provider and fallback cache could not resolve this title.
          </p>
        </div>
      </div>
    );
  }

  const cast = movie.cast || [];
  const awards = movie.awards?.length ? movie.awards : ["No awards data available"];
  const heroImage = isAllowedImageSource(movie.backdrop || movie.image)
    ? movie.backdrop || movie.image
    : null;
  const posterImage = isAllowedImageSource(movie.image) ? movie.image : null;

  return (
    <div>
      <div className="relative min-h-[90vh]">
        <div
          className={`absolute inset-0 bg-cover bg-center ${
            heroImage ? "" : "bg-gradient-to-br from-zinc-950 via-zinc-900 to-black"
          }`}
          style={heroImage ? { backgroundImage: `url(${heroImage})` } : undefined}
        >
          <div className="absolute inset-0 bg-gradient-to-t from-gray-900 via-gray-900/80" />
        </div>

        <div className="relative container mx-auto px-4 min-h-[90vh] flex items-end pb-12">
          <div className="grid md:grid-cols-3 gap-8 items-end">
            <div className="hidden md:block">
              {posterImage ? (
                <img
                  src={posterImage}
                  alt={movie.title}
                  loading="lazy"
                  decoding="async"
                  className="rounded-lg shadow-xl aspect-[2/3] object-cover"
                />
              ) : (
                <div className="flex aspect-[2/3] items-center justify-center rounded-lg border border-zinc-700 bg-zinc-900 p-6 text-center text-zinc-400 shadow-xl">
                  Poster unavailable
                </div>
              )}
            </div>

            <div className="md:col-span-2">
              <InlineNotice>
                {movie.staticPlaceholder
                  ? "All movie data requests failed, so static placeholder cards are being rendered."
                  : movie.degraded
                  ? "Showing cached or fallback details while the movie provider recovers."
                  : null}
              </InlineNotice>

              <div className="flex flex-wrap items-center gap-4 mb-4">
                <div className="flex items-center gap-2 bg-black/50 backdrop-blur-md px-3 py-1.5 rounded-full">
                  <Star className="w-5 h-5 text-yellow-500 fill-current" />
                  <span className="text-yellow-500 font-semibold">
                    {movie.rating} Rating
                  </span>
                </div>
                <div className="flex items-center gap-2 bg-black/50 backdrop-blur-md px-3 py-1.5 rounded-full">
                  <Clock className="w-5 h-5 text-gray-400" />
                  <span className="text-gray-300">{movie.duration}</span>
                </div>
                <div className="flex items-center gap-2 bg-black/50 backdrop-blur-md px-3 py-1.5 rounded-full">
                  <Calendar className="w-5 h-5 text-gray-400" />
                  <span className="text-gray-300">{movie.releaseDate}</span>
                </div>
              </div>

              <h1 className="text-4xl md:text-6xl font-bold mb-4">
                {movie.title}
              </h1>

              <div className="flex flex-wrap gap-2 mb-6">
                {(movie.genre || []).map((genre) => (
                  <span
                    key={genre}
                    className="px-3 py-1 bg-gray-800/80 backdrop-blur-sm rounded-full text-sm"
                  >
                    {genre}
                  </span>
                ))}
              </div>

              <MovieMediaCarousel movie={movie} />

              <div className="mt-6 flex flex-wrap gap-4 items-center">
                <WatchlistToggle
                  movie={{
                    id: movie.id,
                    title: movie.title,
                    poster: posterImage,
                  }}
                  size="md"
                />
                <button className="bg-gray-800/80 backdrop-blur-sm text-white px-4 py-3 rounded-lg hover:bg-gray-700 transition-colors">
                  <Share2 className="w-5 h-5" />
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
      <main className="container mx-auto px-4 py-12">
        <div className="grid md:grid-cols-3 gap-8">
          <div className="md:col-span-2">
            <section className="mb-12">
              <h2 className="text-2xl font-bold mb-4">Overview</h2>
              <p className="text-gray-300 text-lg leading-relaxed">
                {movie.description}
              </p>
            </section>

            <section className="mb-12">
              <h2 className="text-2xl font-bold mb-6">Awards & Recognition</h2>
              <div className="grid sm:grid-cols-2 gap-4">
                {awards.map((award, index) => (
                  <div
                    key={`${award}-${index}`}
                    className="flex items-center gap-3 bg-gray-800/50 backdrop-blur-sm p-4 rounded-lg"
                  >
                    <Award className="w-5 h-5 text-yellow-500" />
                    <span>{award}</span>
                  </div>
                ))}
                <div className="flex items-center gap-3 bg-gray-800/50 backdrop-blur-sm p-4 rounded-lg">
                  <BarChart3 className="w-5 h-5 text-green-500" />
                  <span>{scoreText("Metacritic", movie.metacriticScore, "/100")}</span>
                </div>
                <div className="flex items-center gap-3 bg-gray-800/50 backdrop-blur-sm p-4 rounded-lg">
                  <BarChart3 className="w-5 h-5 text-red-500" />
                  <span>
                    {scoreText("Rotten Tomatoes", movie.rottenTomatoesScore, "%")}
                  </span>
                </div>
              </div>
            </section>

            {cast.length > 0 && (
              <section>
                <h2 className="text-2xl font-bold mb-6">Top Cast</h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                  {cast.map((actor) => (
                    <Link
                      key={actor.id}
                      to={`/actor/${actor.id}`}
                      className="bg-gray-800/50 backdrop-blur-sm rounded-lg p-4 hover:bg-gray-700/50 transition-colors flex gap-4"
                    >
                      {isAllowedImageSource(actor.image) ? (
                        <img
                          src={actor.image}
                          alt={actor.name}
                          loading="lazy"
                          decoding="async"
                          className="w-24 h-24 rounded-lg object-cover"
                        />
                      ) : (
                        <div className="flex h-24 w-24 shrink-0 items-center justify-center rounded-lg bg-zinc-900 text-xs text-zinc-500">
                          No image
                        </div>
                      )}
                      <div className="min-w-0">
                        <h3 className="font-semibold text-lg mb-1 truncate">
                          {actor.name}
                        </h3>
                        <p className="text-gray-400 mb-2">{actor.role}</p>
                        <p className="text-sm text-gray-400 line-clamp-2">
                          {actor.bio}
                        </p>
                      </div>
                    </Link>
                  ))}
                </div>
              </section>
            )}

            <section className="mb-12">
              <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between mb-6">
                <div>
                  <h2 className="text-2xl font-bold">Reviews</h2>
                  <p className="mt-2 text-sm text-zinc-400">
                    {reviews.length ? `${reviews.length} review${reviews.length === 1 ? '' : 's'} on this movie.` : 'Be the first to share your thoughts.'}
                  </p>
                </div>
                <div className="flex flex-wrap items-center gap-3">
                  <button
                    onClick={() => setShowReviewEditor((current) => !current)}
                    className="rounded-xl bg-yellow-500 px-4 py-2 font-semibold text-black hover:bg-yellow-400 transition-colors"
                  >
                    {showReviewEditor ? 'Close editor' : 'Write a review'}
                  </button>
                  <div className="flex items-center gap-2 rounded-xl border border-zinc-800 bg-zinc-950 p-2 text-sm text-zinc-300">
                    <span>Sort:</span>
                    <button
                      type="button"
                      onClick={() => setReviewSort('recent')}
                      className={`rounded-full px-3 py-1 transition ${
                        reviewSort === 'recent'
                          ? 'bg-yellow-500 text-black'
                          : 'bg-zinc-900 text-zinc-300 hover:bg-zinc-800'
                      }`}
                    >
                      Recent
                    </button>
                    <button
                      type="button"
                      onClick={() => setReviewSort('helpful')}
                      className={`rounded-full px-3 py-1 transition ${
                        reviewSort === 'helpful'
                          ? 'bg-yellow-500 text-black'
                          : 'bg-zinc-900 text-zinc-300 hover:bg-zinc-800'
                      }`}
                    >
                      Helpful
                    </button>
                  </div>
                </div>
              </div>

              {showReviewEditor && (
                <Suspense fallback={<div className="rounded-2xl border border-zinc-800 bg-gray-950 p-6 text-zinc-400">Loading editor...</div>}>
                  <div className="rounded-2xl border border-zinc-800 bg-zinc-900/80 p-6 mb-6 shadow-sm">
                    <ReviewEditor
                      movieId={movieId}
                      onSuccess={() => {
                        setShowReviewEditor(false);
                        reviewsQuery.refetch();
                      }}
                      onCancel={() => setShowReviewEditor(false)}
                    />
                  </div>
                </Suspense>
              )}

              <div aria-label="Reviews" className="mt-6">
                {reviewsQuery.isLoading ? (
                  <div className="rounded-2xl border border-zinc-800 bg-gray-950 p-6 text-zinc-400">
                    Loading reviews...
                  </div>
                ) : reviewsQuery.isError ? (
                  <div className="rounded-2xl border border-red-500/40 bg-red-950/30 p-6 text-sm text-red-100">
                    {getReviewErrorMessage(reviewsQuery.error)}
                  </div>
                ) : sortedReviews.length === 0 ? (
                  <div className="rounded-2xl border border-zinc-800 bg-zinc-900/80 p-8 text-center text-zinc-400">
                    <p className="text-lg font-semibold text-white">No reviews yet.</p>
                    <p className="mt-2">Share your opinion and help others decide.</p>
                  </div>
                ) : (
                  <ReviewList reviews={sortedReviews} movieId={movieId} />
                )}
              </div>
            </section>
          </div>

          <div>
            <div className="sticky top-24 space-y-6">
              <div className="bg-gray-800/50 backdrop-blur-sm rounded-lg p-6">
                <h3 className="font-semibold mb-4">Movie Info</h3>
                <dl className="space-y-4">
                  <div>
                    <dt className="text-gray-400">Director</dt>
                    <dd>{movie.director}</dd>
                  </div>
                  <div>
                    <dt className="text-gray-400">Production Company</dt>
                    <dd>{movie.productionCompany}</dd>
                  </div>
                  <div className="flex items-center gap-2">
                    <dt className="text-gray-400">Box Office</dt>
                    <dd className="flex items-center gap-1">
                      <DollarSign className="w-4 h-4 text-green-500" />
                      {movie.boxOffice}
                    </dd>
                  </div>
                  <div className="flex items-center gap-2">
                    <dt className="text-gray-400">Language</dt>
                    <dd className="flex items-center gap-1">
                      <Globe className="w-4 h-4 text-blue-500" />
                      {movie.language}
                    </dd>
                  </div>
                </dl>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};

export default MovieDetails;
