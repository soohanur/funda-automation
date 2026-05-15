import { cn } from "@/lib/utils";

const TONE_BY_STATUS: Record<string, string> = {
  sent: "bg-emerald-50 text-emerald-700 border-emerald-200",
  failed: "bg-rose-50 text-rose-700 border-rose-200",
  queued: "bg-amber-50 text-amber-700 border-amber-200",
};

const DEFAULT_TONE =
  "bg-[var(--muted)] text-[var(--muted-foreground)] border-[var(--border)]";

/** Tiny coloured pill for the Email Status column. */
export function StatusChip({ status }: { status: string }) {
  const tone = TONE_BY_STATUS[status] ?? DEFAULT_TONE;
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full border px-2 py-0.5 text-[11px] font-medium",
        tone,
      )}
    >
      {status}
    </span>
  );
}
