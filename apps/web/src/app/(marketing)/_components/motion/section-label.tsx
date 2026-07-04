/**
 * Small uppercase mono act/section marker — "01 — TWO STRANGERS".
 * Server-renderable; purely typographic.
 */
export function SectionLabel({
  index,
  children,
  className = '',
}: {
  index: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <p
      className={`font-mono text-[11px] font-medium uppercase tracking-[0.4em] text-white/40 ${className}`}
    >
      <span className="text-[#ff3f7f]/80">{index}</span>
      <span aria-hidden="true"> — </span>
      {children}
    </p>
  );
}
