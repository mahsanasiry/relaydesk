export function ListSkeleton() {
  return (
    <div role="status" className="space-y-3">
      <span className="sr-only">Loading requests</span>
      <div className="h-8 w-40 animate-pulse rounded-md bg-muted" />
      <div className="h-24 animate-pulse rounded-md bg-muted" />
      {Array.from({ length: 5 }, (_, index) => (
        <div key={index} className="h-12 animate-pulse rounded-md bg-muted" />
      ))}
    </div>
  );
}
