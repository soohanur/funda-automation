"use client";

/**
 * MobileNav — bottom tab bar shown on phones (< md breakpoint).
 *
 * Liquid-glass treatment: translucent surface, large blur, soft inner
 * highlight. Tap targets are 56px high (44pt min per Apple HIG with a
 * generous overshoot). Active tab is pill-highlighted in brand colour.
 */
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Building2,
  Database,
  Mail,
} from "lucide-react";
import { cn } from "@/lib/utils";

const TABS = [
  { href: "/dashboard", label: "Home",    icon: LayoutDashboard },
  { href: "/scraper",   label: "Scraper", icon: Building2 },
  { href: "/data",      label: "Data",    icon: Database },
  { href: "/emails",    label: "Emails",  icon: Mail },
];

export function MobileNav() {
  const pathname = usePathname();
  return (
    <nav
      aria-label="Primary"
      className="glass fixed inset-x-0 bottom-0 z-40 border-t md:hidden pb-safe"
    >
      <ul className="mx-auto flex max-w-[640px] items-stretch justify-around">
        {TABS.map((t) => {
          const active = pathname === t.href || pathname.startsWith(`${t.href}/`);
          const Icon = t.icon;
          return (
            <li key={t.href} className="flex flex-1 justify-center">
              <Link
                href={t.href}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "flex h-14 w-full flex-col items-center justify-center gap-0.5 text-[11px] font-medium",
                  "transition-colors",
                  active
                    ? "text-[var(--color-brand-600)]"
                    : "text-[var(--muted-foreground)]",
                )}
              >
                <span
                  className={cn(
                    "grid h-9 w-12 place-items-center rounded-2xl",
                    active && "bg-[var(--color-brand-50)]",
                  )}
                >
                  <Icon className="h-5 w-5" />
                </span>
                <span>{t.label}</span>
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
