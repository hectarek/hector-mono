import { Skeleton } from "@repo/ui/components/skeleton";
import { AppHeader } from "@/app/_components/app-header";
import { PageColumn } from "@/app/_components/page-column";

// New game night while it loads: its title, then the form's groups in bone.
export default function Loading() {
  return (
    <PageColumn
      width="read"
      header={<AppHeader back={{ href: "/nights", label: "Nights" }} />}
    >
      <div role="status" aria-busy="true" className="flex flex-col gap-3">
        <span className="sr-only">Loading</span>
        <Skeleton className="h-7 w-2/3" />
        <Skeleton className="h-96 w-full" />
        <Skeleton className="h-28 w-full" />
      </div>
    </PageColumn>
  );
}
