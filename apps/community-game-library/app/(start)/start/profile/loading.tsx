import { Skeleton } from "@repo/ui/components/skeleton";
import { ProfileStepHeading } from "./heading";

// A4's shape while it loads: its heading, then the two groups' worth of bone.
export default function Loading() {
  return (
    <>
      <ProfileStepHeading />
      <div role="status" aria-busy="true" className="flex flex-col gap-3">
        <span className="sr-only">Loading</span>
        <Skeleton className="h-72 w-full" />
        <Skeleton className="h-96 w-full" />
      </div>
    </>
  );
}
