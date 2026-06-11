/**
 * Generic single-line cell. Click-to-expand ONLY when the content is
 * actually truncated (overflowing) — like Excel. Non-overflowing cells
 * are inert (no pointer, no popup).
 */
import { useEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";

export function ClickableCell({
  label,
  value,
  rawValue,
  onOverflow,
}: {
  label: string;
  value: React.ReactNode;
  rawValue: string;
  onOverflow: (label: string, value: string) => void;
}) {
  const text = (rawValue ?? "").toString();
  const spanRef = useRef<HTMLSpanElement>(null);
  const [overflow, setOverflow] = useState(false);

  useEffect(() => {
    const el = spanRef.current;
    if (!el) return;
    const check = () => setOverflow(el.scrollWidth > el.clientWidth + 1);
    check();
    const ro = new ResizeObserver(check);
    ro.observe(el);
    return () => ro.disconnect();
  }, [text]);

  const handler = () => {
    if (overflow && text.trim().length > 0) onOverflow(label, text);
  };

  return (
    <div
      onClick={handler}
      className={cn(
        "flex w-full max-w-full items-center overflow-hidden",
        overflow ? "cursor-pointer" : "cursor-default",
      )}
      title={overflow ? text : undefined}
    >
      <span ref={spanRef} className="block w-full truncate">
        {value}
      </span>
    </div>
  );
}
