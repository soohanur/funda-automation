"use client";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { Toaster } from "sonner";
import { useAuth } from "@/lib/auth";

export function Providers({ children }: { children: React.ReactNode }) {
  const [client] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            // 30s default freshness — matches the backend's 30s
            // Sheet→DB auto-sync. Anything fresher just burns
            // re-renders on data the server can't have refreshed yet.
            staleTime: 30_000,
            // Keep data in cache for 5 minutes after the last
            // observer unmounts so back-nav is instant.
            gcTime: 5 * 60_000,
            refetchOnWindowFocus: false,
            // Smarter retry — don't hammer a backend that's truly
            // down; quick first retry covers transient blips.
            retry: 1,
            retryDelay: (attempt) => Math.min(1000 * 2 ** attempt, 8_000),
          },
          mutations: { retry: 0 },
        },
      })
  );
  const hydrate = useAuth((s) => s.hydrate);
  useEffect(() => {
    hydrate();
  }, [hydrate]);

  return (
    <QueryClientProvider client={client}>
      {children}
      <Toaster richColors position="top-right" />
    </QueryClientProvider>
  );
}
