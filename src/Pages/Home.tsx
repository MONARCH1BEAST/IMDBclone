import React from "react";
import Hero from "../components/Hero.tsx";
import { Award, Clock, Star, TrendingUp } from "lucide-react";
import { Link } from "react-router-dom";
import MovieCarousel from "../components/MovieCarousel.tsx";
import {
  CarouselSkeleton,
  InlineNotice,
} from "../components/feedback/Skeletons";
import {
  flattenMoviePages,
  hasDegradedPage,
  useMovies,
} from "../hooks/useMovies";

const Home = () => {
  const trendingQuery = useMovies({ sort: "trending" });
  const upcomingQuery = useMovies({ sort: "upcoming" });
  const trendingMovies = flattenMoviePages(trendingQuery.data).slice(0, 8);
  const upcomingMovies = flattenMoviePages(upcomingQuery.data).slice(0, 8);

  return (
    <div>
      <Hero />
      <main className="container mx-auto px-4 py-8">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-12">
          {[
            {
              icon: TrendingUp,
              label: "Trending",
              path: "/movies?sort=trending",
              color: "bg-yellow-500",
            },
            {
              icon: Star,
              label: "Top Rated",
              path: "/top-rated",
              color: "bg-purple-500",
            },
            {
              icon: Clock,
              label: "Coming Soon",
              path: "/movies?sort=upcoming",
              color: "bg-blue-500",
            },
            {
              icon: Award,
              label: "Awards",
              path: "/top-rated",
              color: "bg-red-500",
            },
          ].map((category, index) => (
            <Link
              key={index}
              to={category.path}
              className={`${category.color} p-4 rounded-xl flex items-center justify-center gap-2 hover:opacity-70 transition-opacity`}
            >
              <category.icon className="w-5 h-5" />
              <span className="font-medium">{category.label}</span>
            </Link>
          ))}
        </div>
        <section className="mb-12">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-2xl font-bold flex items-center gap-2">
              <TrendingUp className="w-6 h-6 text-yellow-500" />
              Trending Now
            </h2>
            <Link to="/movies?sort=trending" className="text-yellow-500 hover:text-yellow-400">
              View All
            </Link>
          </div>
          <InlineNotice>
            {hasDegradedPage(trendingQuery.data)
              ? "Live trending data is recovering, so cached or fallback results are showing."
              : null}
          </InlineNotice>
          {trendingQuery.isLoading && !trendingMovies.length ? (
            <CarouselSkeleton />
          ) : (
            <MovieCarousel movies={trendingMovies} />
          )}
        </section>
        <section className="mb-12">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-2xl font-bold flex items-center gap-2">
              <Clock className="w-6 h-6 text-yellow-500" />
              Coming Soon
            </h2>
            <Link to="/movies?sort=upcoming" className="text-yellow-500 hover:text-yellow-400">
              View All
            </Link>
          </div>
          <InlineNotice>
            {hasDegradedPage(upcomingQuery.data)
              ? "Upcoming movies are using cached or fallback results while the provider recovers."
              : null}
          </InlineNotice>
          {upcomingQuery.isLoading && !upcomingMovies.length ? (
            <CarouselSkeleton />
          ) : (
            <MovieCarousel movies={upcomingMovies} />
          )}
        </section>
      </main>
    </div>
  );
};

export default Home;
