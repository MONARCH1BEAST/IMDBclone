import React from "react";
import { Play, Star, Calendar } from "lucide-react";
import { Link } from "react-router-dom";
import { fallbackMovies } from "../data/fallbackMovies";
import { flattenMoviePages, useMovies } from "../hooks/useMovies";

const Hero = () => {
  const [currentMovie, setCurrentMovie] = React.useState(0);
  const { data } = useMovies({ sort: "trending" });
  const featuredMovies = flattenMoviePages(data).slice(0, 4);
  const movies = featuredMovies.length ? featuredMovies : fallbackMovies.slice(0, 4);

  React.useEffect(() => {
    const timer = setInterval(() => {
      setCurrentMovie((prev) => (prev + 1) % movies.length);
    }, 8000);
    return () => clearInterval(timer);
  }, [movies.length]);

  React.useEffect(() => {
    if (currentMovie >= movies.length) {
      setCurrentMovie(0);
    }
  }, [currentMovie, movies.length]);

  const movie = movies[currentMovie];

  return (
    <div className="relative h-[90vh] bg-gradient-to-b from-transparent to-black">
      <div
        className="absolute inset-0 bg-cover bg-center transition-all duration-1000 gradient-mask"
        style={{
          backgroundImage: `url('${movie.backdrop || movie.image}')`,
        }}
      >
        <div className="absolute inset-0 bg-black/30 backdrop-blur-[2px]" />
      </div>

      <div className="relative container mx-auto px-4 h-full flex items-center">
        <div className="max-w-2xl">
          <div className="flex items-center gap-4 mb-4">
            <div className="flex items-center gap-2 bg-black/50 backdrop-blur-md px-3 py-1.5 rounded-full">
              <Star className="w-5 h-5 text-yellow-500 fill-current" />
              <span className="text-yellow-500 font-semibold">
                {movie.rating} Rating
              </span>
            </div>
            <div className="flex items-center gap-2 bg-black/50 backdrop-blur-md px-3 py-1.5 rounded-full">
              <Calendar className="w-5 h-5 text-zinc-400" />
              <span className="text-zinc-300">{movie.releaseDate}</span>
            </div>
          </div>
          <h1 className="text-5xl md:text-7xl font-bold mb-4 text-glow">
            {movie.title}
          </h1>
          <p className="text-zinc-300 text-lg mb-8 line-clamp-3 max-w-xl">
            {movie.description}
          </p>
          <div className="flex items-center gap-4">
            <Link
              to={`/movie/${movie.id}`}
              className="bg-yellow-500 text-black px-8 py-3 rounded-xl font-semibold flex items-center gap-2 hover:bg-yellow-400 transition-all hover:scale-105 duration-300"
            >
              <Play className="w-5 h-5" />
              Watch Trailer
            </Link>
            <Link
              to={`/movie/${movie.id}`}
              className="bg-zinc-900/80 backdrop-blur-md text-white px-8 py-3 rounded-xl font-semibold hover:bg-zinc-800 transition-all hover:scale-105 duration-300"
            >
              More Info
            </Link>
          </div>
        </div>

        <div className="absolute bottom-8 right-4 flex gap-2">
          {movies.map((_, index) => (
            <button
              key={index}
              onClick={() => setCurrentMovie(index)}
              className={`h-1.5 rounded-full transition-all duration-300 ${
                currentMovie === index
                  ? "bg-yellow-500 w-8"
                  : "bg-zinc-600 w-4 hover:bg-zinc-500"
              }`}
            />
          ))}
        </div>
      </div>
    </div>
  );
};

export default Hero;
