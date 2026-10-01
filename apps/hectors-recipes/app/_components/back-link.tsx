import { Button } from "@repo/ui/components/button";
import { ChevronLeft } from "lucide-react";
import Link from "next/link";

// The way back from a page that isn't a tab: top left, named for where it goes (D32).
export function BackLink({ href, label }: { href: string; label: string }) {
  return (
    <Button
      variant="ghost"
      size="lg"
      nativeButton={false}
      render={<Link href={href} />}
      className="-ml-2 self-start"
    >
      <ChevronLeft data-icon="inline-start" />
      {label}
    </Button>
  );
}
