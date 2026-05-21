"use client";

/**
 * MobileTopBar — frosted glass app bar shown on phones.
 *
 * Derives the title from the current pathname. Right-side slot reserved
 * for context actions (notifications, profile, etc.) — kept empty for
 * now so brand stays clean.
 */
import { usePathname } from "next/navigation";

const TITLE_BY_PATH: Record<string, string> = {
  "/dashboard": "Dashboard",
  "/scraper": "Funda Scraper",
  "/data": "Global Data",
  "/emails": "Emails",
};

function deriveTitle(pathname: string): string {
  if (TITLE_BY_PATH[pathname]) return TITLE_BY_PATH[pathname];
  if (pathname.startsWith("/data/")) return "Property";
  return "Funda";
}

export function MobileTopBar() {
  const pathname = usePathname();
  return (
    <header className="glass sticky top-0 z-30 border-b md:hidden pt-safe">
      <div className="flex h-12 items-center justify-between px-4">
        <div className="flex items-center gap-2">
          <div className="grid h-8 w-8 place-items-center rounded-xl bg-gradient-to-br from-[var(--color-brand-500)] to-[var(--color-brand-700)] text-white shadow-sm">
            <span className="text-sm font-extrabold tracking-tight">F</span>
          </div>
          <div className="text-sm font-semibold tracking-tight">
            {deriveTitle(pathname)}
          </div>
        </div>
      </div>
    </header>
  );
}
