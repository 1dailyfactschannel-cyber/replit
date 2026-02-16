import { QueryClient, QueryFunction } from "@tanstack/react-query";
import { persistQueryClient } from "@tanstack/react-query-persist-client";
import { createSyncStoragePersister } from "@tanstack/query-sync-storage-persister";

async function throwIfResNotOk(res: Response) {
  if (!res.ok) {
    const text = (await res.text()) || res.statusText;
    throw new Error(`${res.status}: ${text}`);
  }
}

export async function apiRequest(
  method: string,
  url: string,
  data?: unknown | undefined,
): Promise<Response> {
  const res = await fetch(url, {
    method,
    headers: data ? { "Content-Type": "application/json" } : {},
    body: data ? JSON.stringify(data) : undefined,
    credentials: "include",
  });

  await throwIfResNotOk(res);
  return res;
}

type UnauthorizedBehavior = "returnNull" | "throw";
export const getQueryFn: <T>(options: {
  on401: UnauthorizedBehavior;
}) => QueryFunction<T> =
  ({ on401: unauthorizedBehavior }) =>
  async ({ queryKey }) => {
    const res = await fetch(queryKey.join("/") as string, {
      credentials: "include",
    });

    if (unauthorizedBehavior === "returnNull" && res.status === 401) {
      return null;
    }

    await throwIfResNotOk(res);
    return await res.json();
  };

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      queryFn: getQueryFn({ on401: "throw" }),
      refetchInterval: false,
      refetchOnWindowFocus: false,
      staleTime: 1000 * 60 * 5, // 5 minutes by default
      gcTime: 1000 * 60 * 30, // 30 minutes - keep unused data in cache
      retry: 1, // Retry failed requests once
      retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
      // Enable optimistic updates
      networkMode: 'offlineFirst',
    },
    mutations: {
      retry: false,
      networkMode: 'offlineFirst',
    },
  },
});

// Setup persistent storage for cache (only in browser)
if (typeof window !== 'undefined') {
  const localStoragePersister = createSyncStoragePersister({
    storage: window.localStorage,
    key: 'teamsync-react-query-cache',
    throttleTime: 1000, // Save at most once per second
  });

  persistQueryClient({
    queryClient,
    persister: localStoragePersister,
    maxAge: 1000 * 60 * 60 * 24, // 24 hours
    // Only persist these query keys
    dehydrateOptions: {
      shouldDehydrateQuery: (query) => {
        const queryKey = query.queryKey[0] as string;
        // Only persist stable data, not realtime data
        return queryKey?.startsWith('/api/projects') ||
               queryKey?.startsWith('/api/user') ||
               queryKey?.startsWith('/api/settings');
      },
    },
  });
}

// Prefetch function for common routes
export const prefetchRoute = async (route: string) => {
  switch (route) {
    case '/projects':
      await queryClient.prefetchQuery({
        queryKey: ['/api/projects'],
        staleTime: 1000 * 60 * 5,
      });
      break;
    case '/tasks':
      await queryClient.prefetchQuery({
        queryKey: ['/api/tasks'],
        staleTime: 1000 * 60 * 5,
      });
      break;
    case '/team':
      await queryClient.prefetchQuery({
        queryKey: ['/api/users'],
        staleTime: 1000 * 60 * 10,
      });
      break;
  }
};
