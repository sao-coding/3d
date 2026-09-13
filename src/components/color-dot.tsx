export function ColorDot({ color }: { color?: string | null }) {
  return (
    <span
      className="inline-block size-3 shrink-0 rounded-full border border-border"
      style={{ backgroundColor: color || "transparent" }}
    />
  );
}
