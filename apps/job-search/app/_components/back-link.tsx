import { ChevronLeft } from "lucide-react";
import Link from "next/link";
import type { Back } from "@/app/_lib/back-link";

// A record page's way back, named for where it goes (the UX plan's UX8).
export function BackLink({ back }: { back: Back }) {
  return (
    <Link
      href={back.href}
      className="text-muted-foreground flex min-h-11 w-fit items-center gap-1 text-sm"
    >
      <ChevronLeft className="size-4" />
      {back.label}
    </Link>
  );
}
