import { Skeleton } from "@repo/ui/components/skeleton";
import { AppHeader } from "@/app/_components/app-header";
import { PageColumn } from "@/app/_components/page-column";

// Edit profile's shape while it loads: the way back, its title, and the two groups' worth of bone.
export default function Loading() {
  return (
    <PageColumn
      width="read"
      header={<AppHeader back={{ href: "/you", label: "You" }} />}
    >
      <h1 className="text-2xl leading-tight font-bold">Edit profile</h1>
      <div role="status" aria-busy="true" className="flex flex-col gap-3">
        <span className="sr-only">Loading</span>
        <Skeleton className="h-72 w-full" />
        <Skeleton className="h-96 w-full" />
      </div>
    </PageColumn>
  );
}
