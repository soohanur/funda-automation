/**
 * Custom inline SVG icons used by the PropertiesTable. Kept here so
 * the row component file stays focused on layout + behaviour.
 */

/** Funda house glyph — used for the "View profile" action button. */
export function FundaIcon({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="currentColor"
      className={className}
      aria-hidden="true"
    >
      <path d="M4 21V5a2 2 0 0 1 2-2h6.5a2 2 0 0 1 1.41.59L19.4 9.1a2 2 0 0 1 .6 1.41V21a0 0 0 0 1 0 0H4Zm3-9h6v-2H7v2Zm0 4h10v-2H7v2Z" />
    </svg>
  );
}
