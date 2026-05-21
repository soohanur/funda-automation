"use client";

import { useEffect, useState } from "react";

/**
 * Reactive matchMedia hook. Returns true when the given media query
 * matches the current viewport. SSR-safe — returns `false` until the
 * first effect runs in the browser.
 *
 * Example: const isDesktop = useMediaQuery("(min-width: 768px)");
 */
export function useMediaQuery(query: string): boolean {
  const [matches, setMatches] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined" || !("matchMedia" in window)) return;
    const mql = window.matchMedia(query);
    const handler = () => {
      setMatches(mql.matches);
    };
    handler(); // sync initial state
    mql.addEventListener("change", handler);
    return () => mql.removeEventListener("change", handler);
  }, [query]);

  return matches;
}
