/**
 * Phone / Email cell with inline copy button. When truncated, clicking the
 * text expands the full value inline (Excel-like, no popup). The copy icon
 * writes to clipboard, flashes a check, and toasts.
 */
import { useState } from "react";
import { Check, Copy } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { ExpandableText } from "./expandable-text";
import type { PropertiesTableRow } from "../types";

export function CopyableContactCell({
  property,
  field,
  label,
}: {
  property: PropertiesTableRow;
  field: "agency_phone" | "agency_email";
  label: string;
  onOverflow?: (label: string, value: string) => void;
}) {
  const [copied, setCopied] = useState(false);
  const raw = (property[field] ?? "").toString().trim();

  if (!raw) {
    return <span className="text-[var(--muted-foreground)]">—</span>;
  }

  const onCopy = async (e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      await navigator.clipboard.writeText(raw);
      setCopied(true);
      toast.success(`${label} copied`);
      setTimeout(() => setCopied(false), 1200);
    } catch {
      toast.error("Copy failed");
    }
  };

  return (
    <div className="flex w-full max-w-full items-center gap-1.5 overflow-hidden">
      <ExpandableText text={raw} className="text-[var(--color-brand-600)]" />
      <button
        type="button"
        onClick={onCopy}
        className={cn(
          "grid h-7 w-7 shrink-0 place-items-center rounded-md border border-transparent text-[var(--muted-foreground)]",
          "hover:border-[var(--border)] hover:bg-[var(--muted)]",
          copied && "text-emerald-600",
        )}
        title={copied ? "Copied!" : `Copy ${label.toLowerCase()}`}
        aria-label={`Copy ${label.toLowerCase()}`}
      >
        {copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
      </button>
    </div>
  );
}
