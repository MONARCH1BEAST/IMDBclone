import { fallbackMovieMap, fallbackMovies } from "../../data/fallbackMovies";
import { ApiError, createHttpClient } from "./httpClient";
import { taggedCache } from "../cache/taggedCache";

const tmdbImage = (path, size = "w780") =>
  path ? `https://image.tmdb.org/t/p/${size}${path}` : undefined;

const roundedRating = (value) => {
  const rating = Number(value);
  if (Number.isNaN(rating) || rating <= 0) {
    return "N/A";
  }
  return Math.round(rating * 10) / 10;
};

const releaseYear = (dateLike) => {
  if (!dateLike) {
    return "TBA";
  }
  return String(dateLike).slice(0, 4);
};

const compactCurrency = (amount) => {
  if (!amount) {
    return "Unavailable";
  }

  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    notation: "compact",
    maximumFractionDigits: 1,
  }).format(amount);
};

const genreNamesById = {
  12: "Adventure",
  14: "Fantasy",
  16: "Animation",
  18: "Drama",
  27: "Horror",
  28: "Action",
  35: "Comedy",
  36: "History",
  37: "Western",
  53: "Thriller",
  80: "Crime",
  99: "Documentary",
  878: "Sci-Fi",
  9648: "Mystery",
  10402: "Music",
  10749: "Romance",
  10751: "Family",
  10752: "War",
  10770: "TV Movie",
};

function normalizeTmdbMovie(movie) {
  const director = movie.credits?.crew?.find((person) => person.job === "Director");
  const trailer = movie.videos?.results?.find(
    (video) => video.site === "YouTube" && video.type === "Trailer"
  );
  const genres = movie.genres?.length
    ? movie.genres.map((genre) => genre.name)
    : (movie.genre_ids || []).map((id) => genreNamesById[id]).filter(Boolean);

  return {
    id: String(movie.id),
    provider: "tmdb",
    title: movie.title || movie.name || "Untitled",
    rating: roundedRating(movie.vote_average),
    image: tmdbImage(movie.poster_path, "w500") || fallbackMovies[0].image,
    backdrop:
      tmdbImage(movie.backdrop_path, "w1280") ||
      tmdbImage(movie.poster_path, "w780") ||
      fallbackMovies[0].backdrop,
    year: releaseYear(movie.release_date || movie.first_air_date),
    releaseDate: movie.release_date || movie.first_air_date || "TBA",
    duration: movie.runtime ? `${movie.runtime} min` : "Unknown",
    genre: genres.length ? genres : ["Movie"],
    director: director?.name || "Unavailable",
    description: movie.overview || "No overview is available yet.",
    cast: (movie.credits?.cast || []).slice(0, 8).map((person) => ({
      id: person.id,
      name: person.name,
      role: person.character || "Cast",
      image: tmdbImage(person.profile_path, "w185") || fallbackMovies[0].cast[0].image,
      bio: person.known_for_department || "Cast member",
    })),
    trailer: trailer
      ? `https://www.youtube.com/watch?v=${trailer.key}`
      : `https://www.youtube.com/results?search_query=${encodeURIComponent(
          `${movie.title || movie.name} trailer`
        )}`,
    awards: [],
    boxOffice: compactCurrency(movie.revenue),
    language: (movie.original_language || "Unknown").toUpperCase(),
    productionCompany: movie.production_companies?.[0]?.name || "Unavailable",
    metacriticScore: null,
    rottenTomatoesScore: null,
    votes: movie.vote_count ? new Intl.NumberFormat("en-US").format(movie.vote_count) : "0",
    rank: undefined,
  };
}

function normalizeOmdbMovie(movie) {
  return {
    id: movie.imdbID,
    provider: "omdb",
    title: movie.Title || "Untitled",
    rating: movie.imdbRating && movie.imdbRating !== "N/A" ? Number(movie.imdbRating) : "N/A",
    image: movie.Poster && movie.Poster !== "N/A" ? movie.Poster : fallbackMovies[0].image,
    backdrop:
      movie.Poster && movie.Poster !== "N/A" ? movie.Poster : fallbackMovies[0].backdrop,
    year: movie.Year || "TBA",
    releaseDate: movie.Released || "TBA",
    duration: movie.Runtime || "Unknown",
    genre: movie.Genre ? movie.Genre.split(", ") : ["Movie"],
    director: movie.Director || "Unavailable",
    description: movie.Plot || "No overview is available yet.",
    cast: movie.Actors
      ? movie.Actors.split(", ").slice(0, 6).map((name, index) => ({
          id: `${movie.imdbID}-${index}`,
          name,
          role: "Cast",
          image: fallbackMovies[index % fallbackMovies.length].cast[0].image,
          bio: "Cast member",
        }))
      : [],
    trailer: `https://www.youtube.com/results?search_query=${encodeURIComponent(
      `${movie.Title} trailer`
    )}`,
    awards:
      movie.Awards && movie.Awards !== "N/A" ? movie.Awards.split(". ").filter(Boolean) : [],
    boxOffice: movie.BoxOffice || "Unavailable",
    language: movie.Language || "Unknown",
    productionCompany: movie.Production || "Unavailable",
    metacriticScore:
      movie.Metascore && movie.Metascore !== "N/A" ? Number(movie.Metascore) : null,
    rottenTomatoesScore: null,
    votes: movie.imdbVotes || "0",
    rank: undefined,
  };
}

function paginate(items, cursor, pageSize = 12) {
  const page = Math.max(1, Number(cursor || 1));
  const start = (page - 1) * pageSize;
  const pageItems = items.slice(start, start + pageSize);
  const nextCursor = start + pageSize < items.length ? String(page + 1) : null;

  return {
    items: pageItems,
    nextCursor,
    cursor: String(page),
    total: items.length,
    provider: "mock",
    generatedAt: new Date().toISOString(),
  };
}

function sortedFallbackMovies(sort) {
  if (sort === "top_rated") {
    return [...fallbackMovies].sort((a, b) => Number(b.rating) - Number(a.rating));
  }

  if (sort === "upcoming") {
    return [...fallbackMovies].sort((a, b) =>
      String(b.releaseDate).localeCompare(String(a.releaseDate))
    );
  }

  return fallbackMovies;
}

export function createMockProvider() {
  return {
    name: "mock",

    async listMovies({ cursor = "1", search = "", sort = "popular" } = {}) {
      const query = search.trim().toLowerCase();
      const movies = query
        ? fallbackMovies.filter((movie) =>
            [movie.title, movie.director, ...(movie.genre || [])]
              .join(" ")
              .toLowerCase()
              .includes(query)
          )
        : sortedFallbackMovies(sort);

      return paginate(movies, cursor, 6);
    },

    async getMovieDetails(id) {
      return fallbackMovieMap.get(String(id)) || fallbackMovies[0];
    },
  };
}

export function createTmdbProvider({ client = createHttpClient() } = {}) {
  const apiKey = process.env.REACT_APP_TMDB_API_KEY;
  const bearerToken = process.env.REACT_APP_TMDB_BEARER_TOKEN;
  const baseUrl = "https://api.themoviedb.org/3";

  // Prefer the v3 API key when available. Only fall back to a v4
  // Bearer token if no API key is present and the token looks like a JWT.
  const useBearer =
    (!apiKey || String(apiKey).trim() === '') &&
    typeof bearerToken === 'string' &&
    bearerToken.startsWith('eyJ');
  const headers = useBearer ? { Authorization: `Bearer ${bearerToken}` } : {};

  function url(path, params = {}) {
    const target = new URL(`${baseUrl}${path}`);
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== "") {
        target.searchParams.set(key, value);
      }
    });
    if (!useBearer && apiKey) {
      target.searchParams.set("api_key", apiKey);
    }
    return target.toString();
  }

  function ensureCredentials() {
    if (!apiKey && !bearerToken) {
      throw new ApiError("TMDb credentials are not configured.", {
        provider: "tmdb",
        code: "MISSING_CREDENTIALS",
      });
    }
  }

  return {
    name: "tmdb",

    async listMovies({ cursor = "1", search = "", sort = "popular", signal } = {}) {
      ensureCredentials();

      const page = Number(cursor || 1);
      const endpoint = search
        ? "/search/movie"
        : sort === "trending"
          ? "/trending/movie/week"
          : sort === "top_rated"
            ? "/movie/top_rated"
            : sort === "upcoming"
              ? "/movie/upcoming"
              : "/movie/popular";

      const params = search
        ? { query: search, page, include_adult: "false" }
        : { page };
      const constructedUrl = url(endpoint, params);
      if (process.env.NODE_ENV === 'development') {
        try {
          console.debug('[TMDB URL]', constructedUrl);
        } catch (e) {}
      }
      const data = await client.request(constructedUrl, {
        provider: "tmdb",
        headers,
        signal,
      });

      return {
        items: (data.results || []).map(normalizeTmdbMovie),
        nextCursor: page < Math.min(data.total_pages || page, 500) ? String(page + 1) : null,
        cursor: String(page),
        total: data.total_results || 0,
        provider: "tmdb",
        generatedAt: new Date().toISOString(),
      };
    },

    async getMovieDetails(id, { signal } = {}) {
      ensureCredentials();
      const constructedUrl = url(`/movie/${id}`, { append_to_response: "credits,videos,external_ids" });
      if (process.env.NODE_ENV === 'development') {
        try {
          console.debug('[TMDB URL]', constructedUrl);
        } catch (e) {}
      }
      const data = await client.request(constructedUrl, {
        provider: "tmdb",
        headers,
        signal,
      });

      return normalizeTmdbMovie(data);
    },
  };
}

export function createOmdbProvider({ client = createHttpClient() } = {}) {
  const apiKey = process.env.REACT_APP_OMDB_API_KEY;
  const baseUrl = "https://www.omdbapi.com/";

  function url(params = {}) {
    const target = new URL(baseUrl);
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== "") {
        target.searchParams.set(key, value);
      }
    });
    target.searchParams.set("apikey", apiKey);
    return target.toString();
  }

  function ensureCredentials() {
    if (!apiKey) {
      throw new ApiError("OMDb credentials are not configured.", {
        provider: "omdb",
        code: "MISSING_CREDENTIALS",
      });
    }
  }

  return {
    name: "omdb",

    async listMovies({ cursor = "1", search = "", signal } = {}) {
      ensureCredentials();
      const data = await client.request(
        url({ s: search || "movie", page: cursor, type: "movie" }),
        { provider: "omdb", signal }
      );

      if (data.Response === "False") {
        throw new ApiError(data.Error || "OMDb returned an error.", {
          provider: "omdb",
          status: data.Error === "Movie not found!" ? 404 : 500,
          body: data,
        });
      }

      return {
        items: (data.Search || []).map(normalizeOmdbMovie),
        nextCursor:
          Number(cursor) * 10 < Number(data.totalResults || 0)
            ? String(Number(cursor) + 1)
            : null,
        cursor: String(cursor),
        total: Number(data.totalResults || 0),
        provider: "omdb",
        generatedAt: new Date().toISOString(),
      };
    },

    async getMovieDetails(id, { signal } = {}) {
      ensureCredentials();
      const data = await client.request(url({ i: id, plot: "full" }), {
        provider: "omdb",
        signal,
      });

      if (data.Response === "False") {
        throw new ApiError(data.Error || "OMDb returned an error.", {
          provider: "omdb",
          status: data.Error === "Movie not found!" ? 404 : 500,
          body: data,
        });
      }

      return normalizeOmdbMovie(data);
    },
  };
}

export function createConfiguredProvider() {
  const preferred = process.env.REACT_APP_MOVIE_PROVIDER;

  if (preferred === "omdb") {
    if (!process.env.REACT_APP_OMDB_API_KEY) {
      console.error(
        "[API Provider] OMDb selected but REACT_APP_OMDB_API_KEY is missing. Falling back to mock provider."
      );
      return createMockProvider();
    }
    return createOmdbProvider();
  }

  if (preferred === "tmdb") {
    if (!process.env.REACT_APP_TMDB_API_KEY && !process.env.REACT_APP_TMDB_BEARER_TOKEN) {
      console.error(
        "[API Provider] TMDb selected but credentials are missing. Falling back to mock provider."
      );
      return createMockProvider();
    }
    return createTmdbProvider();
  }

  if (process.env.REACT_APP_TMDB_API_KEY || process.env.REACT_APP_TMDB_BEARER_TOKEN) {
    if (process.env.NODE_ENV === 'development') {
      console.debug("[API Provider] Using TMDb");
    }
    try { taggedCache.clear(); } catch (e) {}
    return createTmdbProvider();
  }

  if (process.env.REACT_APP_OMDB_API_KEY) {
    if (process.env.NODE_ENV === 'development') {
      console.debug("[API Provider] Using OMDb");
    }
    return createOmdbProvider();
  }

  console.warn(
    "[API Provider] No credentials detected. Using mock provider with fallback data."
  );
  return createMockProvider();
}
