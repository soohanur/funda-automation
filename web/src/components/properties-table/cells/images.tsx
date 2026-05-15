/**
 * Images cell — shows a thumbnail of the first photo. The list
 * endpoint returns only the first URL (compact mode), so on click we
 * fetch the full property record to populate the lightbox.
 */
import { useState } from "react";
import { Image as ImageIcon, Loader2 } from "lucide-react";
import { propertiesApi } from "@/lib/api/properties";
import type { PropertiesTableRow } from "../types";

export function parseImages(raw?: string | null): string[] {
  if (!raw) return [];
  return raw
    .split(",")
    .map((u) => u.trim())
    .filter((u) => u.length > 0);
}

export function ImagesCell({
  property,
  onOpen,
}: {
  property: PropertiesTableRow;
  onOpen: (images: string[]) => void;
}) {
  const images = parseImages(property.images);
  const [loading, setLoading] = useState(false);

  if (images.length === 0) {
    return <span className="text-[var(--muted-foreground)]">—</span>;
  }

  const handleClick = async () => {
    if (loading) return;
    setLoading(true);
    try {
      const full = await propertiesApi.get(property.id);
      const all = parseImages(full.images);
      onOpen(all.length > 0 ? all : images);
    } catch {
      onOpen(images);
    } finally {
      setLoading(false);
    }
  };

  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={loading}
      className="group relative flex items-center gap-2 rounded-lg border border-[var(--border)] bg-[var(--surface)] px-2 py-1 hover:border-[var(--color-brand-400)]"
      title="View photos"
    >
      <span className="relative h-8 w-12 shrink-0 overflow-hidden rounded-md bg-[var(--muted)]">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={images[0]}
          alt=""
          className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-110"
          loading="lazy"
        />
      </span>
      <span className="flex items-center gap-1 text-xs">
        {loading ? (
          <Loader2 className="h-3.5 w-3.5 animate-spin" />
        ) : (
          <ImageIcon className="h-3.5 w-3.5" />
        )}
      </span>
    </button>
  );
}
