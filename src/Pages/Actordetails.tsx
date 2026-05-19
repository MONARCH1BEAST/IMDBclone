import { useVirtualizer } from "@tanstack/react-virtual";
import {
  Award,
  Calendar,
  Clapperboard,
  ExternalLink,
  Film,
  Globe2,
  Instagram,
  SlidersHorizontal,
  Star,
  Twitter,
  UserRound,
} from "lucide-react";
import React from "react";
import {
  Link,
  NavLink,
  Outlet,
  useOutletContext,
  useParams,
} from "react-router-dom";
import { socialLinksForActor } from "../data/actorSocialLinks";
import {
  useActorCredits,
  useActorPerson,
  useSimilarActors,
} from "../hooks/useActor";

const localeScriptMatchers = {
  ar: /[\u0600-\u06ff]/,
  he: /[\u0590-\u05ff]/,
  ja: /[\u3040-\u30ff\u3400-\u9fff]/,
  ko: /[\uac00-\ud7af]/,
  ru: /[\u0400-\u04ff]/,
  uk: /[\u0400-\u04ff]/,
  zh: /[\u3400-\u9fff]/,
};

function browserLocale() {
  if (typeof navigator === "undefined") {
    return "en-US";
  }

  return navigator.language || navigator.languages?.[0] || "en-US";
}

function displayNameForLocale(person, locale) {
  const language = String(locale || "en").split("-")[0].toLowerCase();
  if (language === "en") {
    return person.name;
  }

  const matcher = localeScriptMatchers[language];
  const localized = matcher
    ? person.alsoKnownAs?.find((name) => matcher.test(name))
    : null;

  return localized || person.name;
}

function creditYearBounds(credits) {
  const years = credits
    .map((credit) => credit.year)
    .filter((year) => Number.isFinite(year));
  if (!years.length) {
    const current = new Date().getFullYear();
    return { min: current, max: current };
  }

  return {
    min: Math.min(...years),
    max: Math.max(...years),
  };
}

function labelForSocial(label) {
  if (label === "instagram") return "Instagram";
  if (label === "twitter") return "Twitter";
  if (label === "imdb") return "IMDb";
  return label;
}

function iconForSocial(label) {
  if (label === "instagram") return Instagram;
  if (label === "twitter") return Twitter;
  return ExternalLink;
}

function jsonLdForPerson(person, displayName, socialLinks) {
  return {
    "@context": "https://schema.org",
    "@type": "Person",
    name: displayName,
    alternateName: person.alsoKnownAs || [],
    image: person.photoLarge || person.photo,
    birthDate: person.birthday || undefined,
    birthPlace: person.placeOfBirth || undefined,
    description: person.biography,
    sameAs: socialLinks.map((link) => link.url),
  };
}

function ActorProfileSkeleton() {
  return (
    <div className="container mx-auto px-4 py-8">
      <div className="animate-pulse rounded-lg bg-zinc-900 h-72 mb-8" />
      <div className="grid md:grid-cols-3 gap-8">
        <div className="animate-pulse rounded-lg bg-zinc-900 h-64" />
        <div className="md:col-span-2 space-y-4">
          <div className="animate-pulse rounded bg-zinc-900 h-8 w-1/2" />
          <div className="animate-pulse rounded bg-zinc-900 h-40" />
          <div className="animate-pulse rounded bg-zinc-900 h-96" />
        </div>
      </div>
    </div>
  );
}

function FilmographyRow({ credit }) {
  return (
    <Link
      to={`/movie/${credit.tmdbId}`}
      className="flex h-full gap-4 rounded-lg border border-zinc-800 bg-zinc-900/70 p-3 hover:bg-zinc-800 transition-colors"
    >
      {credit.poster ? (
        <img
          src={credit.poster}
          alt=""
          loading="lazy"
          decoding="async"
          className="h-24 w-16 rounded object-cover"
        />
      ) : (
        <div className="flex h-24 w-16 shrink-0 items-center justify-center rounded bg-zinc-800 text-zinc-500">
          <Film className="h-5 w-5" />
        </div>
      )}
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <h3 className="truncate font-semibold text-lg">{credit.title}</h3>
          <span className="rounded bg-zinc-800 px-2 py-0.5 text-xs uppercase text-zinc-300">
            {credit.mediaType}
          </span>
        </div>
        <p className="text-sm text-zinc-400">
          {credit.year || "TBA"} · {credit.roleType === "cast" ? "Cast" : credit.department}
        </p>
        <p className="mt-1 truncate text-sm text-zinc-300">{credit.role}</p>
        <div className="mt-2 flex flex-wrap gap-2">
          {credit.genres.slice(0, 3).map((genre) => (
            <span
              key={genre}
              className="rounded-full bg-zinc-800 px-2 py-0.5 text-xs text-zinc-300"
            >
              {genre}
            </span>
          ))}
        </div>
      </div>
      <div className="hidden items-center gap-1 text-yellow-500 sm:flex">
        <Star className="h-4 w-4 fill-current" />
        <span>{credit.voteAverage ? credit.voteAverage.toFixed(1) : "N/A"}</span>
      </div>
    </Link>
  );
}

function Filmography({ credits }) {
  const parentRef = React.useRef(null);
  const bounds = React.useMemo(() => creditYearBounds(credits), [credits]);
  const minYear = bounds.min;
  const maxYear = bounds.max;
  const [roleType, setRoleType] = React.useState("cast");
  const [yearRange, setYearRange] = React.useState(bounds);
  const [selectedGenres, setSelectedGenres] = React.useState(() => new Set());

  React.useEffect(() => {
    setYearRange({ min: minYear, max: maxYear });
    setSelectedGenres(new Set());
  }, [maxYear, minYear]);

  const availableGenres = React.useMemo(() => {
    const genres = new Set();
    credits
      .filter((credit) => credit.roleType === roleType)
      .forEach((credit) => credit.genres.forEach((genre) => genres.add(genre)));
    return Array.from(genres).sort();
  }, [credits, roleType]);

  const filteredCredits = React.useMemo(() => {
    return credits.filter((credit) => {
      if (credit.roleType !== roleType) {
        return false;
      }

      if (credit.year && (credit.year < yearRange.min || credit.year > yearRange.max)) {
        return false;
      }

      if (selectedGenres.size > 0) {
        return credit.genres.some((genre) => selectedGenres.has(genre));
      }

      return true;
    });
  }, [credits, roleType, selectedGenres, yearRange.max, yearRange.min]);

  const rowVirtualizer = useVirtualizer({
    count: filteredCredits.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 128,
    overscan: 8,
  });

  const toggleGenre = (genre) => {
    setSelectedGenres((current) => {
      const next = new Set(current);
      if (next.has(genre)) {
        next.delete(genre);
      } else {
        next.add(genre);
      }
      return next;
    });
  };

  const setMinYear = (value) => {
    setYearRange((current) => ({
      min: Math.min(Number(value), current.max),
      max: current.max,
    }));
  };

  const setMaxYear = (value) => {
    setYearRange((current) => ({
      min: current.min,
      max: Math.max(Number(value), current.min),
    }));
  };

  return (
    <section className="mb-12">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <h2 className="flex items-center gap-2 text-2xl font-bold">
          <Clapperboard className="h-6 w-6 text-yellow-500" />
          Filmography
        </h2>
        <span className="text-sm text-zinc-400">{filteredCredits.length} credits</span>
      </div>

      <div className="mb-5 rounded-lg border border-zinc-800 bg-zinc-900/70 p-4">
        <div className="mb-4 flex items-center gap-2 text-sm font-semibold text-zinc-200">
          <SlidersHorizontal className="h-4 w-4 text-yellow-500" />
          Filters
        </div>

        <div className="grid gap-5 lg:grid-cols-3">
          <fieldset>
            <legend className="mb-2 text-sm text-zinc-400">Role type</legend>
            <div className="flex gap-2">
              {["cast", "crew"].map((type) => (
                <label
                  key={type}
                  className={`rounded-lg border px-3 py-2 text-sm capitalize ${
                    roleType === type
                      ? "border-yellow-500 bg-yellow-500 text-black"
                      : "border-zinc-700 bg-zinc-950 text-zinc-300"
                  }`}
                >
                  <input
                    type="radio"
                    name="roleType"
                    value={type}
                    checked={roleType === type}
                    onChange={() => setRoleType(type)}
                    className="sr-only"
                  />
                  {type}
                </label>
              ))}
            </div>
          </fieldset>

          <div>
            <p className="mb-2 text-sm text-zinc-400">
              Years: {yearRange.min} - {yearRange.max}
            </p>
            <div className="space-y-2">
              <input
                type="range"
                min={minYear}
                max={maxYear}
                value={yearRange.min}
                onChange={(event) => setMinYear(event.target.value)}
                className="w-full accent-yellow-500"
              />
              <input
                type="range"
                min={minYear}
                max={maxYear}
                value={yearRange.max}
                onChange={(event) => setMaxYear(event.target.value)}
                className="w-full accent-yellow-500"
              />
            </div>
          </div>

          <div>
            <p className="mb-2 text-sm text-zinc-400">Genres</p>
            <div className="flex max-h-28 flex-wrap gap-2 overflow-auto pr-1">
              {availableGenres.length ? (
                availableGenres.map((genre) => (
                  <label
                    key={genre}
                    className={`rounded-full border px-3 py-1 text-xs ${
                      selectedGenres.has(genre)
                        ? "border-yellow-500 bg-yellow-500 text-black"
                        : "border-zinc-700 bg-zinc-950 text-zinc-300"
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={selectedGenres.has(genre)}
                      onChange={() => toggleGenre(genre)}
                      className="sr-only"
                    />
                    {genre}
                  </label>
                ))
              ) : (
                <span className="text-sm text-zinc-500">No genres available</span>
              )}
            </div>
          </div>
        </div>
      </div>

      <div
        ref={parentRef}
        className="h-[640px] overflow-auto rounded-lg border border-zinc-800 bg-black/30"
      >
        <div
          className="relative w-full"
          style={{ height: `${rowVirtualizer.getTotalSize()}px` }}
        >
          {rowVirtualizer.getVirtualItems().map((virtualRow) => {
            const credit = filteredCredits[virtualRow.index];
            return (
              <div
                key={credit.id}
                className="absolute left-0 top-0 w-full px-3 py-2"
                style={{
                  height: `${virtualRow.size}px`,
                  transform: `translateY(${virtualRow.start}px)`,
                }}
              >
                <FilmographyRow credit={credit} />
              </div>
            );
          })}
        </div>
        {!filteredCredits.length && (
          <div className="p-8 text-center text-zinc-400">
            No credits match the current filters.
          </div>
        )}
      </div>
    </section>
  );
}

function PanelTabs() {
  const tabClass = ({ isActive }) =>
    `rounded-lg px-4 py-2 text-sm font-semibold transition-colors ${
      isActive
        ? "bg-yellow-500 text-black"
        : "bg-zinc-900 text-zinc-300 hover:bg-zinc-800"
    }`;

  return (
    <nav className="mb-4 flex flex-wrap gap-2" aria-label="Actor subpanels">
      <NavLink end to="" className={tabClass}>
        Awards
      </NavLink>
      <NavLink to="social" className={tabClass}>
        Social links
      </NavLink>
      <NavLink to="similar" className={tabClass}>
        Similar actors
      </NavLink>
    </nav>
  );
}

const Actordetails = () => {
  const { id } = useParams();
  const locale = browserLocale();
  const personQuery = useActorPerson(id, locale);
  const creditsQuery = useActorCredits(id, locale);
  const person = personQuery.data;
  const credits = creditsQuery.data || [];
  const socialLinks = socialLinksForActor(id);
  const displayName = person ? displayNameForLocale(person, locale) : "";

  if (personQuery.isLoading || creditsQuery.isLoading) {
    return <ActorProfileSkeleton />;
  }

  if (personQuery.isError || !person) {
    return (
      <div className="container mx-auto px-4 py-16">
        <div className="rounded-lg border border-zinc-800 bg-zinc-900 p-8">
          <h1 className="mb-2 text-2xl font-bold">Actor unavailable</h1>
          <p className="text-zinc-400">
            TMDb could not load this person profile. Check credentials or try again later.
          </p>
        </div>
      </div>
    );
  }

  const jsonLd = jsonLdForPerson(person, displayName, socialLinks);
  const alternateNames = person.alsoKnownAs || [];

  return (
    <div className="container mx-auto px-4 py-8">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />

      <div className="mb-8 rounded-lg border border-zinc-800 bg-zinc-950 p-6">
        <div className="grid gap-6 md:grid-cols-[220px_1fr]">
          <div>
            {person.photoLarge ? (
              <img
                src={person.photoLarge}
                alt={person.name}
                className="aspect-[2/3] w-full rounded-lg object-cover"
              />
            ) : (
              <div className="flex aspect-[2/3] w-full items-center justify-center rounded-lg bg-zinc-900 text-zinc-500">
                <UserRound className="h-12 w-12" />
              </div>
            )}
          </div>

          <div>
            <p className="mb-2 flex items-center gap-2 text-sm uppercase tracking-wide text-yellow-500">
              <Globe2 className="h-4 w-4" />
              {person.knownForDepartment}
            </p>
            <h1 className="mb-3 text-4xl font-bold">{displayName}</h1>
            {displayName !== person.name && (
              <p className="mb-3 text-zinc-400">English: {person.name}</p>
            )}

            <div className="mb-5 flex flex-wrap gap-4 text-sm text-zinc-300">
              <span className="flex items-center gap-2">
                <Calendar className="h-4 w-4 text-yellow-500" />
                {person.birthday || "Birthday unavailable"}
              </span>
              <span>{person.placeOfBirth}</span>
            </div>

            <p className="mb-5 max-w-4xl text-lg leading-relaxed text-zinc-300">
              {person.biography}
            </p>

            {alternateNames.length > 0 && (
              <div>
                <h2 className="mb-2 text-sm font-semibold text-zinc-400">
                  Also known as
                </h2>
                <div className="flex flex-wrap gap-2">
                  {alternateNames.slice(0, 12).map((name) => (
                    <span
                      key={name}
                      className={`rounded-full px-3 py-1 text-sm ${
                        name === displayName
                          ? "bg-yellow-500 text-black"
                          : "bg-zinc-900 text-zinc-300"
                      }`}
                    >
                      {name}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {creditsQuery.isError ? (
        <div className="mb-12 rounded-lg border border-zinc-800 bg-zinc-900 p-6 text-zinc-300">
          Credits could not be loaded from TMDb.
        </div>
      ) : (
        <Filmography credits={credits} />
      )}

      <section className="rounded-lg border border-zinc-800 bg-zinc-950 p-4">
        <PanelTabs />
        <Outlet
          context={{
            person,
            credits,
            socialLinks,
            displayName,
          }}
        />
      </section>
    </div>
  );
};

export function ActorAwardsPanel() {
  const { credits, displayName } = useOutletContext();
  const careerHighlights = credits
    .slice(0, 6)
    .filter((credit) => credit.voteCount >= 50 || credit.popularity >= 10)
    .slice(0, 4);

  return (
    <section>
      <h2 className="mb-3 flex items-center gap-2 font-semibold">
        <Award className="h-5 w-5 text-yellow-500" />
        Highlights
      </h2>
      <p className="mb-4 text-sm text-zinc-400">
        A quick look at {displayName}&apos;s most watched and best-reviewed credits.
      </p>
      <div className="space-y-3">
        {careerHighlights.length ? (
          careerHighlights.map((credit) => (
            <div key={credit.id} className="rounded-lg bg-zinc-900 p-4">
              <p className="font-semibold text-white">{credit.title}</p>
              <p className="mt-1 text-sm text-zinc-400">
                {credit.year || "TBA"} · {credit.role}
              </p>
              <div className="mt-3 flex flex-wrap gap-2 text-xs text-zinc-300">
                <span className="rounded-full border border-zinc-700 px-2 py-1">
                  {credit.mediaType.toUpperCase()}
                </span>
                <span className="rounded-full border border-zinc-700 px-2 py-1">
                  Rating {credit.voteAverage ? credit.voteAverage.toFixed(1) : "N/A"}
                </span>
                <span className="rounded-full border border-zinc-700 px-2 py-1">
                  {credit.voteCount} votes
                </span>
              </div>
            </div>
          ))
        ) : (
          <div className="rounded-lg bg-zinc-900 p-4 text-sm text-zinc-400">
            No award-style highlights are available for {displayName} right now.
          </div>
        )}
      </div>
    </section>
  );
}

export function ActorSocialPanel() {
  const { socialLinks, displayName } = useOutletContext();

  return (
    <section>
      <h2 className="mb-3 font-semibold">Social links</h2>
      {socialLinks.length ? (
        <div className="space-y-2">
          {socialLinks.map((link) => {
            const Icon = iconForSocial(link.label);
            return (
              <a
                key={link.url}
                href={link.url}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-3 rounded-lg bg-zinc-900 p-3 text-zinc-200 hover:bg-zinc-800"
              >
                <Icon className="h-5 w-5 text-yellow-500" />
                <span>{labelForSocial(link.label)}</span>
                <ExternalLink className="ml-auto h-4 w-4 text-zinc-500" />
              </a>
            );
          })}
        </div>
      ) : (
        <p className="rounded-lg bg-zinc-900 p-3 text-sm text-zinc-400">
          No hardcoded social links are available for {displayName}.
        </p>
      )}
    </section>
  );
}

export function ActorSimilarPanel() {
  const { person, credits } = useOutletContext();
  const similarQuery = useSimilarActors(person.id, credits);

  return (
    <section>
      <h2 className="mb-3 font-semibold">Similar actors</h2>
      {similarQuery.isLoading ? (
        <div className="space-y-2">
          <div className="h-16 animate-pulse rounded-lg bg-zinc-900" />
          <div className="h-16 animate-pulse rounded-lg bg-zinc-900" />
        </div>
      ) : similarQuery.data?.length ? (
        <div className="space-y-2">
          {similarQuery.data.map((actor) => (
            <Link
              key={actor.id}
              to={`/actor/${actor.id}`}
              className="flex items-center gap-3 rounded-lg bg-zinc-900 p-3 hover:bg-zinc-800"
            >
              {actor.photo ? (
                <img
                  src={actor.photo}
                  alt=""
                  className="h-12 w-12 rounded-full object-cover"
                  loading="lazy"
                />
              ) : (
                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-zinc-800">
                  <UserRound className="h-5 w-5 text-zinc-500" />
                </div>
              )}
              <div className="min-w-0">
                <p className="truncate font-medium">{actor.name}</p>
                <p className="truncate text-xs text-zinc-400">
                  Shared: {actor.sharedCredits.slice(0, 2).join(", ")}
                </p>
              </div>
            </Link>
          ))}
        </div>
      ) : (
        <p className="rounded-lg bg-zinc-900 p-3 text-sm text-zinc-400">
          Similar actors could not be inferred from combined credits.
        </p>
      )}
    </section>
  );
}

export default Actordetails;
