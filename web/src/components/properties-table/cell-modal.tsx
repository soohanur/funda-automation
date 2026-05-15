/**
 * Click-to-expand modal for any single-line cell whose content
 * exceeds the visible width. Shown when a `ClickableCell` is clicked.
 * ESC dismisses; click outside dismisses.
 */
import { useEffect } from "react";
import { X } from "lucide-react";

export function CellModal({
  label,
  value,
  onClose,
}: {
  label: string;
  value: string;
  onClose: () => void;
}) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  return (
    <div
      className="fixed inset-0 z-50 grid place-items-center bg-black/60 p-4"
      onClick={onClose}
    >
      <div
        className="card relative w-full max-w-2xl overflow-hidden p-0"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-[var(--border)] px-5 py-3">
          <div className="text-xs font-semibold uppercase tracking-wider text-[var(--muted-foreground)]">
            {label}
          </div>
          <button
            type="button"
            onClick={onClose}
            className="grid h-8 w-8 place-items-center rounded-full text-[var(--muted-foreground)] hover:bg-[var(--muted)]"
            aria-label="Close"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
        <div className="max-h-[70vh] overflow-auto whitespace-pre-wrap break-words p-5 text-sm leading-relaxed">
          {value}
        </div>
      </div>
    </div>
  );
}
