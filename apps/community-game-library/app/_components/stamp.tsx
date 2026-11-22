import { cn } from "@repo/ui/lib/utils";
import type { ReactNode } from "react";

// A status, and whose move it is (D13, screens.md rule 7): a short stencil word in a tilted 2px
// box. Navy is all good; red waits on you now (on chipboard or bone only); brown is on hold or
// waiting on someone else, and names them; solid red is late. The word never wraps.
export type StampTone = "navy" | "red" | "brown" | "late";

const TONES: Record<StampTone, string> = {
  navy: "border-foreground text-foreground",
  red: "border-destructive text-destructive",
  // Its ink is the theme's smudge (data-ink below); the edge follows it.
  brown: "border-current",
  late: "border-destructive bg-destructive text-white",
};

// A row in a list (12px), or a card's or a cover's (13px).
const SIZES = {
  row: "px-1.75 py-0.5 text-xs",
  card: "px-2 py-0.75 text-13",
} as const;

// Between -4 and 4 degrees, and 6 on a game's cover, as the boards tilt it.
const TILTS = {
  [-4]: "-rotate-4",
  [-3]: "-rotate-3",
  [-2]: "-rotate-2",
  2: "rotate-2",
  3: "rotate-3",
  4: "rotate-4",
  6: "rotate-6",
} as const;

export type StampTilt = keyof typeof TILTS;

// In a list the tilt varies from row to row by itself, in the kit's 2, -3, 3, -2 cycle;
// elsewhere it's -3. A tilt given to the stamp wins.
const BY_ROW =
  "-rotate-3 in-[li:nth-child(4n+1)]:rotate-2 in-[li:nth-child(4n+2)]:-rotate-3 in-[li:nth-child(4n+3)]:rotate-3 in-[li:nth-child(4n+4)]:-rotate-2";

export function Stamp({
  tone = "navy",
  size = "row",
  tilt,
  children,
}: {
  tone?: StampTone;
  size?: keyof typeof SIZES;
  tilt?: StampTilt;
  children: ReactNode;
}) {
  return (
    <span
      data-tone={tone}
      data-ink={tone === "brown" ? "smudge" : undefined}
      className={cn(
        "inline-block shrink-0 rounded-md border-2 font-heading font-bold whitespace-nowrap uppercase",
        TONES[tone],
        SIZES[size],
        tilt === undefined ? BY_ROW : TILTS[tilt],
      )}
    >
      {children}
    </span>
  );
}
