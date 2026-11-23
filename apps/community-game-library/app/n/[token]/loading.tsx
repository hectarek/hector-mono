import { Skeleton } from "@repo/ui/components/skeleton";

// A night's link while it loads: the app's name, then a card's and two buttons' worth of
// bone.
export default function Loading() {
  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-md flex-col gap-4 px-4 pt-4 pb-6">
      <p className="font-heading text-xl leading-none font-bold uppercase">
        Community Game Library
      </p>
      <div role="status" aria-busy="true" className="flex flex-col gap-3">
        <span className="sr-only">Loading</span>
        <Skeleton className="h-40 w-full" />
        <Skeleton className="h-12 w-full" />
        <Skeleton className="h-12 w-full" />
      </div>
    </main>
  );
}
