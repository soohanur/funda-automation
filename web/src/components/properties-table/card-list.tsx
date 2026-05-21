"use client";

/**
 * Mobile property card list — used in place of the 35-column table on
 * phones. Same data, same actions, packed into iOS-style cards.
 *
 * Each card surfaces the fields a buyer-side user actually scans for
 * (address, asking, bid, DOM, energy, agency) and offers the same
 * three actions as the desktop table: open profile, send email, open
 * on funda.nl. Tap-the-card → opens the local profile.
 *
 * Virtualised via @tanstack/react-virtual the same way the desktop
 * table is, so 100k rows render cheaply on a phone too.
 */
import Link from "next/link";
import { useEffect, useRef } from "react";
import { useVirtualizer } from "@tanstack/react-virtual";
import { useQueryClient } from "@tanstack/react-query";
import { ExternalLink, Loader2, Mail } from "lucide-react";
import { propertiesApi } from "@/lib/api/properties";
import { cn } from "@/lib/utils";
import { FundaIcon } from "./icons";
import { parseImages } from "./cells/images";
import type { PropertiesTableRow } from "./types";

const CARD_HEIGHT = 184; // px, includes margin

export function PropertiesCardList({
  items,
  isLoading,
  emptyMessage,
  onEmail,
  className,
  onLoadMore,
  hasMore,
  isLoadingMore,
}: {
  items: PropertiesTableRow[];
  isLoading?: boolean;
  emptyMessage?: React.ReactNode;
  onEmail?: (row: PropertiesTableRow) => void;
  className?: string;
  onLoadMore?: () => void;
  hasMore?: boolean;
  isLoadingMore?: boolean;
}) {
  const scrollRef = useRef<HTMLDivElement | null>(null);
  // eslint-disable-next-line react-hooks/incompatible-library
  const virtualizer = useVirtualizer({
    count: items.length,
    getScrollElement: () => scrollRef.current,
    estimateSize: () => CARD_HEIGHT,
    overscan: 6,
  });

  const virtualItems = virtualizer.getVirtualItems();
  useEffect(() => {
    if (!onLoadMore || !hasMore || isLoadingMore) return;
    const last = virtualItems[virtualItems.length - 1];
    if (!last) return;
    if (last.index >= items.length - 6) onLoadMore();
  }, [virtualItems, hasMore, isLoadingMore, items.length, onLoadMore]);

  if (items.length === 0 && !isLoading) {
    return (
      <div className={cn("card grid place-items-center p-10 text-center text-sm text-[var(--muted-foreground)]", className)}>
        {emptyMessage ?? "No properties to show."}
      </div>
    );
  }

  return (
    <div ref={scrollRef} className={cn("min-h-0 flex-1 overflow-auto", className)}>
      <div style={{ height: virtualizer.getTotalSize(), position: "relative" }}>
        {virtualItems.map((vi) => {
          const p = items[vi.index];
          return (
            <div
              key={p.id}
              style={{
                position: "absolute",
                top: 0,
                left: 0,
                right: 0,
                transform: `translateY(${vi.start}px)`,
                height: CARD_HEIGHT,
              }}
              className="px-3"
            >
              <PropertyCard property={p} onEmail={onEmail} />
            </div>
          );
        })}
      </div>

      {(isLoadingMore || (!hasMore && items.length > 0)) && (
        <div className="flex items-center justify-center gap-2 py-4 text-xs text-[var(--muted-foreground)]">
          {isLoadingMore ? (
            <>
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
              Loading next 30…
            </>
          ) : (
            <span>End of results</span>
          )}
        </div>
      )}
    </div>
  );
}

function PropertyCard({
  property,
  onEmail,
}: {
  property: PropertiesTableRow;
  onEmail?: (row: PropertiesTableRow) => void;
}) {
  const qc = useQueryClient();
  const images = parseImages(property.images);
  const thumb = images[0];

  const onPrefetch = () => {
    qc.prefetchQuery({
      queryKey: ["properties", "detail", property.id],
      queryFn: () => propertiesApi.get(property.id),
      staleTime: 30_000,
    });
  };

  return (
    <div className="card mb-3 h-[172px] overflow-hidden p-3">
      <div className="flex h-full gap-3">
        {/* Thumbnail — square, rounded, lazy-loaded */}
        <div className="relative h-full w-28 shrink-0 overflow-hidden rounded-2xl bg-[var(--muted)]">
          {thumb ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={thumb}
              alt=""
              className="h-full w-full object-cover"
              loading="lazy"
            />
          ) : (
            <div className="grid h-full place-items-center text-xs text-[var(--muted-foreground)]">
              No photo
            </div>
          )}
        </div>

        {/* Content + actions */}
        <div className="flex min-w-0 flex-1 flex-col">
          <Link
            href={`/data/${property.id}`}
            onMouseEnter={onPrefetch}
            className="min-w-0 flex-1"
          >
            <div className="truncate text-[15px] font-semibold leading-tight">
              {property.address ?? "Unnamed property"}
            </div>
            {property.agency_name && (
              <div className="mt-0.5 truncate text-xs text-[var(--muted-foreground)]">
                {property.agency_name}
              </div>
            )}

            <div className="mt-2 grid grid-cols-2 gap-x-3 gap-y-1 text-xs">
              <Field label="Asking" value={fmtPrice(property.asking_price)} />
              <Field label="Bid" value={fmtPrice(property.bidding_price)} highlight />
              <Field label="DOM" value={property.days_on_market ?? "—"} />
              <Field
                label="Energy"
                value={property.energy_label ?? "—"}
                badge={energyTone(property.energy_label)}
              />
            </div>
          </Link>

          <div className="mt-2 flex items-center justify-end gap-1">
            {onEmail && (
              <button
                type="button"
                onClick={(e) => {
                  e.preventDefault();
                  onEmail(property);
                }}
                className="grid h-10 w-10 place-items-center rounded-full text-[var(--color-brand-600)] hover:bg-[var(--color-brand-50)]"
                aria-label="Send email"
              >
                <Mail className="h-4 w-4" />
              </button>
            )}
            {property.url && (
              <a
                href={property.url}
                target="_blank"
                rel="noopener noreferrer"
                onClick={(e) => e.stopPropagation()}
                className="grid h-10 w-10 place-items-center rounded-full text-[var(--muted-foreground)] hover:bg-[var(--muted)]"
                aria-label="Open on funda.nl"
              >
                <ExternalLink className="h-4 w-4" />
              </a>
            )}
            <Link
              href={`/data/${property.id}`}
              onMouseEnter={onPrefetch}
              className="grid h-10 w-10 place-items-center rounded-full text-[var(--color-brand-700)] hover:bg-[var(--color-brand-50)]"
              aria-label="View profile"
            >
              <FundaIcon className="h-4 w-4" />
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}

function Field({
  label,
  value,
  highlight,
  badge,
}: {
  label: string;
  value: string;
  highlight?: boolean;
  badge?: string;
}) {
  return (
    <div className="flex items-baseline gap-1">
      <span className="text-[10px] uppercase tracking-wider text-[var(--muted-foreground)]">
        {label}
      </span>
      {badge ? (
        <span className={cn("rounded-full px-1.5 py-0.5 text-[10px] font-semibold", badge)}>
          {value}
        </span>
      ) : (
        <span
          className={cn(
            "truncate font-medium",
            highlight && "text-[var(--color-brand-700)]",
          )}
        >
          {value}
        </span>
      )}
    </div>
  );
}

function fmtPrice(raw?: string | null): string {
  if (!raw) return "—";
  const digits = raw.replace(/[^\d]/g, "");
  if (!digits) return raw;
  const n = Number(digits);
  if (!Number.isFinite(n)) return raw;
  return `€${n.toLocaleString("en-US")}`;
}

function energyTone(label?: string | null): string | undefined {
  if (!label) return undefined;
  const l = label.trim().toUpperCase();
  if (l.startsWith("A")) return "bg-emerald-50 text-emerald-700";
  if (l === "B" || l === "C") return "bg-lime-50 text-lime-700";
  if (l === "D") return "bg-yellow-50 text-yellow-700";
  if (l === "E" || l === "F") return "bg-orange-50 text-orange-700";
  if (l === "G") return "bg-rose-50 text-rose-700";
  return undefined;
}
