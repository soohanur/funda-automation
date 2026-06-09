"use client";

/**
 * Shared email date-range filter: preset chips (Today / Yesterday / Week /
 * Month / Custom) + a popover calendar range picker for Custom. Emits a
 * resolved { from, to } (YYYY-MM-DD, inclusive) so callers can hit the
 * emails list + dashboard email-report with the same window.
 */
import { useEffect, useMemo, useRef, useState } from "react";
import {
  addMonths,
  endOfMonth,
  format,
  isAfter,
  isBefore,
  isSameDay,
  startOfMonth,
  startOfWeek,
  subDays,
} from "date-fns";
import { CalendarDays, ChevronLeft, ChevronRight, X } from "lucide-react";
import { cn } from "@/lib/utils";

export type RangePreset = "today" | "yesterday" | "week" | "month" | "all" | "custom";
export type DateRange = { from: string; to: string }; // inclusive YYYY-MM-DD

const PRESETS: { label: string; value: RangePreset }[] = [
  { label: "Today", value: "today" },
  { label: "Yesterday", value: "yesterday" },
  { label: "Week", value: "week" },
  { label: "Month", value: "month" },
  { label: "All", value: "all" },
  { label: "Custom", value: "custom" },
];

const iso = (d: Date) => format(d, "yyyy-MM-dd");

export function presetToRange(p: RangePreset): DateRange | null {
  const now = new Date();
  switch (p) {
    case "today":
      return { from: iso(now), to: iso(now) };
    case "yesterday": {
      const y = subDays(now, 1);
      return { from: iso(y), to: iso(y) };
    }
    case "week":
      return { from: iso(subDays(now, 6)), to: iso(now) };
    case "month":
      return { from: iso(subDays(now, 29)), to: iso(now) };
    case "all":
      return { from: "2020-01-01", to: iso(now) };
    case "custom":
      return null;
  }
}

export function DateRangeFilter({
  preset,
  range,
  onChange,
  className,
}: {
  preset: RangePreset;
  range: DateRange | null;
  onChange: (preset: RangePreset, range: DateRange | null) => void;
  className?: string;
}) {
  const [open, setOpen] = useState(false);
  const wrapRef = useRef<HTMLDivElement>(null);

  // close popover on outside click
  useEffect(() => {
    if (!open) return;
    const onDoc = (e: MouseEvent) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, [open]);

  const pick = (p: RangePreset) => {
    if (p === "custom") {
      setOpen(true);
      onChange("custom", range);
      return;
    }
    onChange(p, presetToRange(p));
    setOpen(false);
  };

  const label =
    preset === "custom" && range
      ? `${range.from} → ${range.to}`
      : preset === "custom"
      ? "Pick dates"
      : null;

  return (
    <div ref={wrapRef} className={cn("relative flex flex-wrap items-center gap-2", className)}>
      <div className="flex overflow-hidden rounded-lg border border-[var(--border)] bg-[var(--surface)]">
        {PRESETS.map((p) => (
          <button
            key={p.value}
            type="button"
            onClick={() => pick(p.value)}
            className={cn(
              "px-3 py-1.5 text-xs font-medium transition-colors",
              p.value === preset
                ? "bg-[var(--color-brand-600)] text-white"
                : "text-[var(--muted-foreground)] hover:bg-[var(--muted)]",
            )}
          >
            {p.label}
          </button>
        ))}
      </div>

      {preset === "custom" && (
        <button
          type="button"
          onClick={() => setOpen((o) => !o)}
          className="inline-flex items-center gap-1.5 rounded-lg border border-[var(--border)] px-3 py-1.5 text-xs font-medium hover:bg-[var(--muted)]"
        >
          <CalendarDays className="h-3.5 w-3.5" />
          {label}
        </button>
      )}

      {open && preset === "custom" && (
        <div className="absolute top-full left-0 z-50 mt-2">
          <RangeCalendar
            value={range}
            onApply={(r) => {
              onChange("custom", r);
              setOpen(false);
            }}
            onClose={() => setOpen(false)}
          />
        </div>
      )}
    </div>
  );
}

export function RangeCalendar({
  value,
  onApply,
  onClose,
}: {
  value: DateRange | null;
  onApply: (r: DateRange) => void;
  onClose: () => void;
}) {
  const [month, setMonth] = useState<Date>(
    value ? new Date(value.from + "T00:00:00") : startOfMonth(new Date()),
  );
  const [from, setFrom] = useState<Date | null>(value ? new Date(value.from + "T00:00:00") : null);
  const [to, setTo] = useState<Date | null>(value ? new Date(value.to + "T00:00:00") : null);

  const days = useMemo(() => {
    const first = startOfMonth(month);
    const gridStart = startOfWeek(first, { weekStartsOn: 1 }); // Monday
    const last = endOfMonth(month);
    const cells: Date[] = [];
    let d = gridStart;
    while (d <= last || cells.length % 7 !== 0) {
      cells.push(d);
      d = new Date(d.getTime() + 86400000);
    }
    return cells;
  }, [month]);

  const onDay = (d: Date) => {
    if (!from || (from && to)) {
      setFrom(d);
      setTo(null);
    } else {
      if (isBefore(d, from)) {
        setTo(from);
        setFrom(d);
      } else {
        setTo(d);
      }
    }
  };

  const inRange = (d: Date) =>
    from && to && (isAfter(d, from) || isSameDay(d, from)) && (isBefore(d, to) || isSameDay(d, to));

  return (
    <div className="w-[280px] rounded-xl border border-[var(--border)] bg-[var(--surface)] p-3 shadow-lg">
      <div className="mb-2 flex items-center justify-between">
        <button type="button" onClick={() => setMonth(addMonths(month, -1))}
          className="grid h-7 w-7 place-items-center rounded-md hover:bg-[var(--muted)]">
          <ChevronLeft className="h-4 w-4" />
        </button>
        <span className="text-sm font-semibold">{format(month, "MMMM yyyy")}</span>
        <button type="button" onClick={() => setMonth(addMonths(month, 1))}
          className="grid h-7 w-7 place-items-center rounded-md hover:bg-[var(--muted)]">
          <ChevronRight className="h-4 w-4" />
        </button>
      </div>

      <div className="grid grid-cols-7 gap-0.5 text-center text-[10px] text-[var(--muted-foreground)]">
        {["Ma", "Di", "Wo", "Do", "Vr", "Za", "Zo"].map((w) => (
          <div key={w} className="py-1">{w}</div>
        ))}
      </div>
      <div className="grid grid-cols-7 gap-0.5">
        {days.map((d) => {
          const otherMonth = d.getMonth() !== month.getMonth();
          const isFrom = from && isSameDay(d, from);
          const isTo = to && isSameDay(d, to);
          const sel = isFrom || isTo;
          return (
            <button
              key={d.toISOString()}
              type="button"
              onClick={() => onDay(d)}
              className={cn(
                "h-8 rounded-md text-xs transition-colors",
                otherMonth && "text-[var(--muted-foreground)] opacity-40",
                sel && "bg-[var(--color-brand-600)] text-white font-semibold",
                !sel && inRange(d) && "bg-[var(--color-brand-50)] text-[var(--color-brand-700)]",
                !sel && !inRange(d) && "hover:bg-[var(--muted)]",
              )}
            >
              {format(d, "d")}
            </button>
          );
        })}
      </div>

      <div className="mt-3 flex items-center justify-between gap-2">
        <span className="text-[11px] text-[var(--muted-foreground)]">
          {from ? format(from, "dd MMM") : "—"} → {to ? format(to, "dd MMM") : "—"}
        </span>
        <div className="flex gap-1.5">
          <button type="button" onClick={onClose}
            className="rounded-md border border-[var(--border)] px-2 py-1 text-xs hover:bg-[var(--muted)]">
            <X className="h-3.5 w-3.5" />
          </button>
          <button
            type="button"
            disabled={!from}
            onClick={() => from && onApply({ from: iso(from), to: iso(to ?? from) })}
            className="rounded-md bg-[var(--color-brand-600)] px-3 py-1 text-xs font-semibold text-white disabled:opacity-50"
          >
            Apply
          </button>
        </div>
      </div>
    </div>
  );
}
