

import { QueryClient } from '@tanstack/react-query';

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 2, // 2 minutes before refetch
      gcTime: 1000 * 60 * 30,   // keep unused cache 30 min
      retry: 2,
      refetchOnWindowFocus: false, // RN doesn't have "window focus"
    },
    mutations: {
      retry: 1,
    },
  },
});
