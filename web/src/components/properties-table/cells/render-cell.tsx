/**
 * Default text-cell renderer. Used by the generic ClickableCell wrapper
 * for every column except the bespoke ones (bidding, images, contacts).
 */
import { ExternalLink } from "lucide-react";
import { StatusChip } from "./status-chip";
import type { PropertiesTableRow } from "../types";

export function renderCell(p: PropertiesTableRow, key: keyof PropertiesTableRow) {
  const v = p[key];
  if (v === null || v === undefined || v === "")
    return <span className="text-[var(--muted-foreground)]">—</span>;

  if (key === "email_status") return <StatusChip status={String(v)} />;
  if (key === "scrape_date" || key === "sheet_tab" || key === "listed_since")
    return <span className="text-xs text-[var(--muted-foreground)]">{String(v)}</span>;
  if (key === "address") return <span className="font-medium">{String(v)}</span>;
  if (key === "agency_email") {
    return <span className="truncate text-[var(--color-brand-600)]">{String(v)}</span>;
  }
  if (key === "agency_website") {
    const href = String(v);
    return (
      <span className="inline-flex items-center gap-1 truncate text-[var(--color-brand-600)]">
        <span className="truncate">{href.replace(/^https?:\/\//, "")}</span>
        <ExternalLink className="h-3 w-3 shrink-0 opacity-0" />
      </span>
    );
  }
  if (key === "agency_phone") {
    return <span className="text-[var(--color-brand-600)]">{String(v)}</span>;
  }
  if (key === "description") {
    return (
      <span
        className="truncate text-xs text-[var(--muted-foreground)]"
        title={String(v)}
      >
        {String(v)}
      </span>
    );
  }
  return <span className="truncate">{String(v)}</span>;
}
