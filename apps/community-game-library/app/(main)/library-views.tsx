"use client";

import { ToggleGroup, ToggleGroupItem } from "@repo/ui/components/toggle-group";
import { useRouter } from "next/navigation";

// The Library's two views under its field (B1, B6, A7), the design system's segmented control:
// All friends, which has your own games too, and My library.
const VIEWS = [
  { view: "all-friends", label: "All friends", href: "/" },
  { view: "my-library", label: "My library", href: "/my-library" },
] as const;

export function LibraryViews({
  current,
}: {
  current: (typeof VIEWS)[number]["view"];
}) {
  const router = useRouter();
  return (
    <ToggleGroup
      spacing={0}
      aria-label="Library"
      value={[current]}
      onValueChange={([next]) => {
        const to = VIEWS.find(({ view }) => view === next);
        if (to && to.view !== current) {
          router.push(to.href);
        }
      }}
      className="w-full"
    >
      {VIEWS.map(({ view, label }) => (
        <ToggleGroupItem key={view} value={view}>
          {label}
        </ToggleGroupItem>
      ))}
    </ToggleGroup>
  );
}
