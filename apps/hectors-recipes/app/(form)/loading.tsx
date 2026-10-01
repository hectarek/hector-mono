import { Skeleton } from "@repo/ui/components/skeleton";
import { placeholders } from "@/app/_lib/placeholders";

// The form's shape while it loads: its top bar, then a few labelled fields.
export default function Loading() {
  return (
    <div
      role="status"
      aria-busy="true"
      className="pt-safe-2 flex flex-col gap-6"
    >
      <span className="sr-only">Loading</span>
      <div className="flex items-center justify-between py-2">
        <Skeleton className="h-9 w-20" />
        <Skeleton className="h-6 w-32" />
        <Skeleton className="h-9 w-20" />
      </div>
      {placeholders(4).map((key, index) => (
        <div key={key} className="flex flex-col gap-2">
          <Skeleton className="h-4 w-24" />
          <Skeleton className={index === 2 ? "h-32 w-full" : "h-9 w-full"} />
        </div>
      ))}
    </div>
  );
}
