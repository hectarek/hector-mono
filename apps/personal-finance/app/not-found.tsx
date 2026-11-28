import { Button } from "@repo/ui/components/button";
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyTitle,
} from "@repo/ui/components/empty";
import Link from "next/link";

export default function NotFound() {
  return (
    <div className="mx-auto max-w-md px-4 py-10">
      <Empty>
        <EmptyHeader>
          <EmptyTitle>That page isn&apos;t here</EmptyTitle>
          <EmptyDescription>
            The link may be mistyped, or the page may have moved.
          </EmptyDescription>
        </EmptyHeader>
        <EmptyContent>
          <Button size="lg" nativeButton={false} render={<Link href="/" />}>
            Go to the home page
          </Button>
        </EmptyContent>
      </Empty>
    </div>
  );
}
