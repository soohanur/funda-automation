/**
 * Inline cell text that, when truncated, expands to show the full value
 * IN PLACE on click (Excel-like) — an overlay anchored to the cell, no
 * center-screen popup. Non-overflowing text is inert. Click outside or
 * click again to collapse.
 */
import { useEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";

export function ExpandableText({
  text,
  display,
  className,
}: {
  text: string;
  display?: React.ReactNode; // styled node to show when collapsed (default = text)
  className?: string;
}) {
  const spanRef = useRef<HTMLSpanElement>(null);
  const wrapRef = useRef<HTMLDivElement>(null);
  const [overflow, setOverflow] = useState(false);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const el = spanRef.current;
    if (!el) return;
    const check = () => setOverflow(el.scrollWidth > el.clientWidth + 1);
    check();
    const ro = new ResizeObserver(check);
    ro.observe(el);
    return () => ro.disconnect();
  }, [text]);

  useEffect(() => {
    if (!open) return;
    const onDoc = (e: MouseEvent) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, [open]);

  return (
    <div ref={wrapRef} className="relative min-w-0 flex-1">
      <span
        ref={spanRef}
        onClick={() => overflow && setOpen((o) => !o)}
        className={cn("block w-full truncate", overflow && "cursor-pointer", className)}
        title={overflow ? text : undefined}
      >
        {display ?? text}
      </span>
      {open && (
        <div
          className="absolute left-0 top-full z-30 mt-1 max-h-60 max-w-[420px] overflow-auto whitespace-pre-wrap break-words rounded-md border border-[var(--border)] bg-[var(--surface)] p-2 text-sm shadow-lg"
        >
          {text}
        </div>
      )}
    </div>
  );
}
