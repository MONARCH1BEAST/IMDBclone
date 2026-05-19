import { ApiError, createHttpClient } from "./httpClient";

const baseUrl = "https://api.themoviedb.org/3";
let client;

const tmdbImage = (path, size = "w500") =>
  path ? `https://image.tmdb.org/t/p/${size}${path}` : null;

const movieGenreNames = {
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

const tvGenreNames = {
  16: "Animation",
  18: "Drama",
  35: "Comedy",
  37: "Western",
  80: "Crime",
  99: "Documentary",
  9648: "Mystery",
  10751: "Family",
  10759: "Action & Adventure",
  10762: "Kids",
  10763: "News",
  10764: "Reality",
  10765: "Sci-Fi & Fantasy",
  10766: "Soap",
  10767: "Talk",
  10768: "War & Politics",
};

function httpClient() {
  if (!client) {
    client = createHttpClient();
  }
  return client;
}

function credentials() {
  return {
    apiKey: process.env.REACT_APP_TMDB_API_KEY,
    bearerToken: process.env.REACT_APP_TMDB_BEARER_TOKEN,
  };
}

function tmdbUrl(path, params = {}) {
  const { apiKey, bearerToken } = credentials();
  if (!apiKey && !bearerToken) {
    throw new ApiError("TMDb credentials are not configured.", {
      provider: "tmdb",
      code: "MISSING_CREDENTIALS",
    });
  }

  const target = new URL(`${baseUrl}${path}`);
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== "") {
      target.searchParams.set(key, value);
    }
  });

  if (!bearerToken && apiKey) {
    target.searchParams.set("api_key", apiKey);
  }

  return target.toString();
}

function request(path, { signal, params } = {}) {
  const { bearerToken } = credentials();
  return httpClient().request(tmdbUrl(path, params), {
    provider: "tmdb",
    headers: bearerToken ? { Authorization: `Bearer ${bearerToken}` } : {},
    signal,
  });
}

function yearFromCredit(credit) {
  const date = credit.release_date || credit.first_air_date || "";
  const year = Number(String(date).slice(0, 4));
  return Number.isFinite(year) && year > 0 ? year : null;
}

function titleFromCredit(credit) {
  return credit.title || credit.name || credit.original_title || credit.original_name || "Untitled";
}

function genreNames(credit) {
  const source = credit.media_type === "tv" ? tvGenreNames : movieGenreNames;
  return (credit.genre_ids || []).map((id) => source[id]).filter(Boolean);
}

function normalizePerson(person) {
  return {
    id: String(person.id),
    name: person.name || "Unknown person",
    biography: person.biography || "No biography is available yet.",
    birthday: person.birthday || null,
    placeOfBirth: person.place_of_birth || "Unavailable",
    alsoKnownAs: person.also_known_as || [],
    photo: tmdbImage(person.profile_path, "w500"),
    photoLarge: tmdbImage(person.profile_path, "h632"),
    knownForDepartment: person.known_for_department || "Acting",
    popularity: person.popularity || 0,
  };
}

function normalizeCredit(credit, roleType) {
  const year = yearFromCredit(credit);
  return {
    id: `${roleType}-${credit.credit_id || credit.id}`,
    tmdbId: String(credit.id),
    mediaType: credit.media_type || "movie",
    roleType,
    title: titleFromCredit(credit),
    year,
    date: credit.release_date || credit.first_air_date || "",
    role: roleType === "cast" ? credit.character || "Cast" : credit.job || "Crew",
    department: credit.department || (roleType === "cast" ? "Acting" : "Crew"),
    genres: genreNames(credit),
    poster: tmdbImage(credit.poster_path, "w185"),
    popularity: credit.popularity || 0,
    voteAverage: credit.vote_average || 0,
    voteCount: credit.vote_count || 0,
  };
}

function normalizeCredits(payload) {
  const cast = (payload.cast || []).map((credit) => normalizeCredit(credit, "cast"));
  const crew = (payload.crew || []).map((credit) => normalizeCredit(credit, "crew"));
  return [...cast, ...crew].sort((a, b) => {
    const yearA = a.year || 0;
    const yearB = b.year || 0;
    if (yearA !== yearB) {
      return yearB - yearA;
    }
    return b.popularity - a.popularity;
  });
}

function topCreditsForSimilar(credits) {
  return credits
    .filter((credit) => credit.tmdbId && credit.mediaType)
    .sort((a, b) => {
      if (b.voteCount !== a.voteCount) {
        return b.voteCount - a.voteCount;
      }
      return b.popularity - a.popularity;
    })
    .slice(0, 5);
}

async function titleCredits(credit, signal) {
  const path =
    credit.mediaType === "tv"
      ? `/tv/${credit.tmdbId}/aggregate_credits`
      : `/movie/${credit.tmdbId}/credits`;

  try {
    return await request(path, { signal });
  } catch (error) {
    return { cast: [] };
  }
}

export const actorService = {
  async getPerson(id, options = {}) {
    const data = await request(`/person/${id}`, {
      signal: options.signal,
      params: { language: options.language || "en-US" },
    });
    return normalizePerson(data);
  },

  async getCombinedCredits(id, options = {}) {
    const data = await request(`/person/${id}/combined_credits`, {
      signal: options.signal,
      params: { language: options.language || "en-US" },
    });
    return normalizeCredits(data);
  },

  async getSimilarActors(id, credits, options = {}) {
    const candidates = new Map();
    const selectedCredits = topCreditsForSimilar(credits);
    const responses = await Promise.all(
      selectedCredits.map((credit) => titleCredits(credit, options.signal))
    );

    responses.forEach((payload, index) => {
      const sourceCredit = selectedCredits[index];
      (payload.cast || []).forEach((person) => {
        if (!person.id || String(person.id) === String(id)) {
          return;
        }

        const existing = candidates.get(person.id) || {
          id: String(person.id),
          name: person.name,
          photo: tmdbImage(person.profile_path, "w185"),
          knownForDepartment: person.known_for_department || "Acting",
          sharedCredits: [],
          score: 0,
        };

        existing.sharedCredits.push(sourceCredit.title);
        existing.score += 1 + (person.popularity || 0) / 100;
        candidates.set(person.id, existing);
      });
    });

    return Array.from(candidates.values())
      .sort((a, b) => b.score - a.score)
      .slice(0, 8);
  },

  genreName(id, mediaType = "movie") {
    return (mediaType === "tv" ? tvGenreNames : movieGenreNames)[id];
  },
};
