import { cn } from "@repo/ui/lib/utils";
import Link from "next/link";
import { DisplayLabel } from "@/app/_components/display";

// The most words the instruction sets in the display face; a longer next step reads in Atkinson.
const DISPLAY_WORDS = 5;

// The board's orange plate, on the link or the button that holds it (the design system's
// PitBoard): it's the only signal fill on a screen, and the whole board is one tap target.
export const PIT_BOARD =
  "bg-signal text-signal-foreground focus-visible:outline-foreground relative grid min-h-11 w-full gap-1 rounded-md px-4 pt-5 pb-4 text-left focus-visible:outline-2 focus-visible:outline-offset-2";

// What the board says: why it's first, the instruction and its record. The two holes at the top
// are the board's.
export function PitBoardFace({
  reason,
  instruction,
  meta,
}: {
  reason: string;
  instruction: string;
  meta: string;
}) {
  const short = instruction.trim().split(/\s+/).length <= DISPLAY_WORDS;
  return (
    <>
      <span
        aria-hidden="true"
        className="bg-background absolute top-2 left-2 size-1.5 rounded-full"
      />
      <span
        aria-hidden="true"
        className="bg-background absolute top-2 right-2 size-1.5 rounded-full"
      />
      <DisplayLabel>{reason}</DisplayLabel>
      <span
        className={cn(
          "break-words",
          short
            ? "font-heading font-stretch-118% text-xl font-extrabold uppercase"
            : "text-lg font-bold",
        )}
      >
        {instruction}
      </span>
      {meta ? <span className="text-sm">{meta}</span> : null}
    </>
  );
}

// The board as a link to its task's record, for a task with no sheet of its own to open.
export function PitBoard({
  href,
  ...face
}: {
  href: string;
  reason: string;
  instruction: string;
  meta: string;
}) {
  return (
    <Link href={href} className={PIT_BOARD}>
      <PitBoardFace {...face} />
    </Link>
  );
}

// The board when nothing is due: a dashed outline that says so, and what to look at instead.
export function ClearBoard({ instead }: { instead: string }) {
  return (
    <div className="border-input grid gap-1 rounded-md border border-dashed px-4 py-4">
      <DisplayLabel className="text-muted-foreground">All clear</DisplayLabel>
      <span className="font-heading font-stretch-118% text-xl font-extrabold uppercase">
        Nothing due today
      </span>
      <span className="text-muted-foreground text-sm">{instead}</span>
    </div>
  );
}
