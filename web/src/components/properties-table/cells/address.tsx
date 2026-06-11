/**
 * Address cell — bold text + one-click copy button. When truncated,
 * clicking the text expands the full value inline (Excel-like, no popup).
 */
import { useState } from "react";
import { Check, Copy } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { ExpandableText } from "./expandable-text";
import type { PropertiesTableRow } from "../types";

export function AddressCell({
  property,
}: {
  property: PropertiesTableRow;
  label?: string;
  onOverflow?: (label: string, value: string) => void;
}) {
  const raw = (property.address ?? "").toString().trim();
  const [copied, setCopied] = useState(false);

  if (!raw) return <span className="text-[var(--muted-foreground)]">—</span>;

  const onCopy = async (e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      await navigator.clipboard.writeText(raw);
      setCopied(true);
      toast.success("Address copied");
      setTimeout(() => setCopied(false), 1200);
    } catch {
      toast.error("Copy failed");
    }
  };

  return (
    <div className="flex w-full max-w-full items-center gap-1.5 overflow-hidden">
      <ExpandableText text={raw} className="font-medium" />
      <button
        type="button"
        onClick={onCopy}
        className={cn(
          "grid h-7 w-7 shrink-0 place-items-center rounded-md border border-transparent text-[var(--muted-foreground)]",
          "hover:border-[var(--border)] hover:bg-[var(--muted)]",
          copied && "text-emerald-600",
        )}
        title={copied ? "Copied!" : "Copy address"}
        aria-label="Copy address"
      >
        {copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
      </button>
    </div>
  );
}
