import { Button } from "@repo/ui/components/button";
import { ChevronLeft } from "lucide-react";
import Link from "next/link";
import { SwipeBack } from "@/app/_components/swipe-back";

// The way back from a page that isn't a tab: top left, named for where it goes (D32). The
// page it's on also goes back on a swipe right (D105).
export function BackLink({ href, label }: { href: string; label: string }) {
  return (
    <>
      <Button
        variant="ghost"
        size="lg"
        nativeButton={false}
        render={<Link href={href} transitionTypes={["go-back"]} />}
        className="-ml-2 self-start"
      >
        <ChevronLeft data-icon="inline-start" />
        {label}
      </Button>
      <SwipeBack href={href} />
    </>
  );
}
