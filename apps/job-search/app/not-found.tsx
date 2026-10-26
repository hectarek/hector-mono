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
          <EmptyDescription>This page doesn&apos;t exist.</EmptyDescription>
        </EmptyHeader>
        <EmptyContent>
          <Button
            size="lg"
            className="min-h-11"
            nativeButton={false}
            render={<Link href="/" />}
          >
            This week
          </Button>
        </EmptyContent>
      </Empty>
    </main>
  );
}
