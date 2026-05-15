/**
 * Generic single-line cell with click-to-expand modal. Wraps any
 * rendered cell content so the user can read overflow text without
 * breaking the fixed-height row layout.
 */

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
  const handler = () => {
    if (text.trim().length === 0) return;
    onOverflow(label, text);
  };
  return (
    <button
      type="button"
      onClick={handler}
      className="flex w-full max-w-full items-center overflow-hidden text-left"
      title={text || undefined}
    >
      <span className="block w-full truncate">{value}</span>
    </button>
  );
}
