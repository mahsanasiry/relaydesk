import type { RequestRow } from "../api";

export function SelectBox({
  request,
  selected,
  onToggle,
}: {
  request: RequestRow;
  selected: ReadonlySet<string>;
  onToggle: (id: string) => void;
}) {
  return (
    <input
      type="checkbox"
      aria-label={`Select ${request.title}`}
      checked={selected.has(request.id)}
      onChange={() => onToggle(request.id)}
      className="size-5 shrink-0 accent-primary"
    />
  );
}
