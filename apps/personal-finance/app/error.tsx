"use client";

import { Button } from "@repo/ui/components/button";
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyTitle,
} from "@repo/ui/components/empty";
import Link from "next/link";

// Last-resort screen for an unexpected failure in the browser.
export default function ErrorPage({
  reset,
}: {
  error: Error;
  reset: () => void;
}) {
  return (
    <div className="mx-auto max-w-md px-4 py-10">
      <Empty>
        <EmptyHeader>
          <EmptyTitle>Something went wrong</EmptyTitle>
          <EmptyDescription>
            Try again, or go back to the home page.
          </EmptyDescription>
        </EmptyHeader>
        <EmptyContent className="flex-row justify-center">
          <Button size="lg" onClick={reset}>
            Try again
          </Button>
          <Button
            variant="secondary"
            size="lg"
            nativeButton={false}
            render={<Link href="/" />}
          >
            Home
          </Button>
        </EmptyContent>
      </Empty>
    </div>
  );
}
