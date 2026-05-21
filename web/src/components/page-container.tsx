/**
 * Page container.
 *
 * AppShell pins the viewport at 100dvh (no document scroll). The
 * MobileTopBar (h-12 / 3rem) sits sticky at the top of the main
 * column. The MobileNav (h-14 / 3.5rem + safe-area) is FIXED at the
 * bottom — it overlays whatever scrolls underneath it.
 *
 * Behaviour by mode:
 *
 *   fill=false (default — Dashboard, Scraper, Emails, Profile)
 *     Container scrolls internally. Mobile gets extra bottom padding
 *     (pb-24) so the last block clears the fixed bottom tab bar.
 *
 *   fill=true (Global Data — single full-height pane)
 *     Container is overflow-hidden. Mobile height is clamped to
 *     calc(100dvh - top bar - tab bar - safe-area-bottom) so the
 *     embedded child (e.g. virtualised table) doesn't render under
 *     the bottom nav. Desktop uses h-full (no nav, no clamp needed).
 *
 * The two `safe-area-inset-bottom` references in the height calcs
 * keep the layout honest on devices with a home indicator (iPhone X+)
 * and Android gesture nav.
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
        "mx-auto flex w-full max-w-[1600px] flex-1 flex-col px-3 pt-3 sm:px-6 md:p-8",
        fill
          ? // Mobile: clamp height to viewport minus top bar (3rem) and
            // bottom tab bar (3.5rem + safe area). Desktop: fill parent.
            [
              "overflow-hidden",
              "h-[calc(100dvh-3rem-3.5rem-env(safe-area-inset-bottom))]",
              "md:h-full",
            ].join(" ")
          : // Mobile: page scroll inside this container; pad bottom so
            // the fixed tab bar can never clip the last block. Desktop:
            // small bottom pad, no tab bar to clear.
            [
              "h-full overflow-y-auto overscroll-contain",
              "pb-[calc(5rem+env(safe-area-inset-bottom))]",
              "md:pb-8",
            ].join(" "),
        className,
      )}
    >
      {children}
    </div>
  );
}
