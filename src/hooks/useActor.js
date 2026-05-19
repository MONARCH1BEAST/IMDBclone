import { useQuery } from "@tanstack/react-query";
import { actorService } from "../services/api/actorService";

const ACTOR_STALE_TIME = 5 * 60 * 1000;
const ACTOR_GC_TIME = 30 * 60 * 1000;

export const actorKeys = {
  all: ["actors"],
  person: (id, language = "en-US") => [...actorKeys.all, "person", String(id), language],
  credits: (id, language = "en-US") => [...actorKeys.all, "credits", String(id), language],
  similar: (id, signature = "") => [...actorKeys.all, "similar", String(id), signature],
};

export function useActorPerson(id, language = "en-US") {
  return useQuery({
    queryKey: actorKeys.person(id, language),
    queryFn: ({ signal }) => actorService.getPerson(id, { signal, language }),
    enabled: Boolean(id),
    staleTime: ACTOR_STALE_TIME,
    gcTime: ACTOR_GC_TIME,
  });
}

export function useActorCredits(id, language = "en-US") {
  return useQuery({
    queryKey: actorKeys.credits(id, language),
    queryFn: ({ signal }) => actorService.getCombinedCredits(id, { signal, language }),
    enabled: Boolean(id),
    staleTime: ACTOR_STALE_TIME,
    gcTime: ACTOR_GC_TIME,
  });
}

export function useSimilarActors(id, credits) {
  const signature = (credits || [])
    .slice(0, 12)
    .map((credit) => `${credit.mediaType}:${credit.tmdbId}`)
    .join("|");

  return useQuery({
    queryKey: actorKeys.similar(id, signature),
    queryFn: ({ signal }) => actorService.getSimilarActors(id, credits || [], { signal }),
    enabled: Boolean(id) && Boolean(credits?.length),
    staleTime: ACTOR_STALE_TIME,
    gcTime: ACTOR_GC_TIME,
  });
}
