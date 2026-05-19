import { QueryClient } from "@tanstack/react-query";
import { telemetry } from "./telemetry";

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000,
      gcTime: 30 * 60 * 1000,
      refetchOnWindowFocus: true,
      refetchOnReconnect: true,
      retry: (failureCount, error) => {
        if (error?.status && error.status < 500 && error.status !== 429) {
          return false;
        }
        return failureCount < 1;
      },
      retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 8000),
      throwOnError: false,
    },
    mutations: {
      onError: (error) => telemetry.recordError({ error }),
    },
  },
});
