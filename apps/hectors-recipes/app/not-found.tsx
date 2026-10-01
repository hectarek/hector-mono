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
    <main className="mx-auto flex min-h-dvh max-w-md items-center px-4">
      <Empty>
        <EmptyHeader>
          <EmptyTitle>Not found</EmptyTitle>
          <EmptyDescription>
            This page doesn&apos;t exist, or it&apos;s in a book or plan
            you&apos;re not part of.
          </EmptyDescription>
        </EmptyHeader>
        <EmptyContent>
          <Button size="lg" nativeButton={false} render={<Link href="/" />}>
            Go to recipes
          </Button>
        </EmptyContent>
      </Empty>
    </main>
  );
}
