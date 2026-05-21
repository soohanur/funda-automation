/**
 * Page container — full viewport height column.
 *
 * Responsive: tight padding on phones (so cards reach close to the
 * edges, iOS-style), generous padding on desktop.
 *
 * - Default: vertically scrolls if content overflows.
 * - `fill`: overflow-hidden + flex column for full-height single-pane
 *   pages (dashboard, global data) where one child is flex-1.
 *
 * Spec mandate: pages must NOT have a heading/paragraph at top.
 */
import { cn } from "@/lib/utils";

export function PageContainer({
  children,
  className,
  fill = false,
}: {
  children: React.ReactNode;
  className?: string;
  fill?: boolean;
}) {
  return (
    <div
      className={cn(
        "mx-auto flex h-full w-full max-w-[1600px] flex-1 flex-col px-3 py-3 sm:px-6 md:p-8",
        fill ? "overflow-hidden" : "overflow-y-auto",
        className,
      )}
    >
      {children}
    </div>
  );
}
