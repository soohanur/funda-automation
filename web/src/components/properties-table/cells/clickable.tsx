/**
 * Generic single-line cell. When the content is truncated, clicking it
 * expands the full value inline (Excel-like) — no popup. Non-overflowing
 * cells are inert.
 */
import { ExpandableText } from "./expandable-text";

export function ClickableCell({
  value,
  rawValue,
}: {
  label?: string;
  value: React.ReactNode;
  rawValue: string;
  // onOverflow kept for caller compatibility; no longer used (no popup).
  onOverflow?: (label: string, value: string) => void;
}) {
  return (
    <div className="flex w-full max-w-full items-center overflow-hidden">
      <ExpandableText text={(rawValue ?? "").toString()} display={value} />
    </div>
  );
}
