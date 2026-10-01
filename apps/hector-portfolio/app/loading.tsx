export default function Loading() {
  return (
    <div className="flex min-h-[60vh] items-center justify-center px-4">
      <div className="flex w-full max-w-md flex-col gap-4">
        <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-muted-foreground/70">
          Loading…
        </p>
        <div className="space-y-3">
          <div className="h-8 w-3/4 animate-pulse rounded-md bg-muted" />
          <div className="h-4 w-full animate-pulse rounded-md bg-muted" />
          <div className="h-4 w-5/6 animate-pulse rounded-md bg-muted" />
        </div>
      </div>
    </div>
  );
}
