import { cn } from "@repo/ui/lib/utils";

// Pips on a 30 by 30 face, from the design system's Dice guidelines.
const PIPS: Record<number, [number, number][]> = {
  1: [[15, 15]],
  2: [
    [9, 9],
    [21, 21],
  ],
  3: [
    [9, 9],
    [15, 15],
    [21, 21],
  ],
  4: [
    [9, 9],
    [21, 9],
    [9, 21],
    [21, 21],
  ],
  5: [
    [9, 9],
    [21, 9],
    [15, 15],
    [9, 21],
    [21, 21],
  ],
  6: [
    [9, 9],
    [9, 15],
    [9, 21],
    [21, 9],
    [21, 15],
    [21, 21],
  ],
};

// One 28px die face. The best count is inked: a navy face with bone pips. On a bone suggestion
// box the faces are chipboard.
function Die({
  count,
  best = false,
  onBone = false,
}: {
  count: number;
  best?: boolean;
  onBone?: boolean;
}) {
  return (
    <svg viewBox="0 0 30 30" aria-hidden="true" className="size-7 shrink-0">
      <rect
        x="1.5"
        y="1.5"
        width="27"
        height="27"
        rx="6"
        strokeWidth={2}
        className={cn(
          "stroke-foreground",
          best ? "fill-foreground" : onBone ? "fill-card" : "fill-secondary",
        )}
      />
      {PIPS[count]?.map(([cx, cy]) => (
        <circle
          key={`${cx}-${cy}`}
          cx={cx}
          cy={cy}
          r="2.7"
          className={best ? "fill-secondary" : "fill-foreground"}
        />
      ))}
    </svg>
  );
}

// Past six, a numbered round token.
function CountToken({
  count,
  best,
}: {
  count: number | string;
  best: boolean;
}) {
  return (
    <span
      className={cn(
        "flex size-7 shrink-0 items-center justify-center rounded-full border-2 border-foreground font-mono text-13 font-medium",
        best ? "bg-foreground text-secondary" : "bg-secondary",
      )}
    >
      {count}
    </span>
  );
}

// How many can play a game (D13): a die for each count it plays at, from `min` to `max`, with
// the count it plays best at inked in (one face, never more), and a numbered token past six.
// Only what the game has: with no player counts there are no dice. The caller says the same in
// text beside them ("2–5 players · best at 4"), so they're hidden from screen readers.
export function Dice({
  min,
  max,
  best,
}: {
  min?: number | null;
  max?: number | null;
  best?: number | null;
}) {
  const low = min ?? max;
  const high = max ?? min;
  if (!low || !high || low > high) return null;
  const counts = Array.from(
    { length: high - low + 1 },
    (_, step) => low + step,
  );
  return (
    <span aria-hidden="true" className="flex flex-wrap gap-1.25">
      {counts.map((count) =>
        count <= 6 ? (
          <Die key={count} count={count} best={count === best} />
        ) : (
          <CountToken key={count} count={count} best={count === best} />
        ),
      )}
    </span>
  );
}

// One count of the library's player filter (B2): a die up to six, then a "7+" token, inked
// while it's chosen.
export function CountFace({ count, inked }: { count: number; inked: boolean }) {
  return count <= 6 ? (
    <Die count={count} best={inked} />
  ) : (
    <CountToken count={`${count}+`} best={inked} />
  );
}

// The pair's two faces, each after the two it turns through as it tumbles.
const PAIR = [
  { faces: [2, 6, 5], tilt: "-rotate-10" },
  { faces: [4, 1, 3], tilt: "rotate-8" },
] as const;

// A tilted pair marks a suggestion ("What should we play?"). While new suggestions are asked for
// (`tumbling`, played with useMoment and keyed on it), each die turns through two faces and stops
// on its own (U26's dice tumble): it holds all three, stacked, and only the last shows at rest.
export function DicePair({
  onBone = false,
  tumbling = false,
}: {
  onBone?: boolean;
  tumbling?: boolean;
}) {
  return (
    <span
      aria-hidden="true"
      data-moment={tumbling ? "tumble" : undefined}
      className="flex gap-0.75"
    >
      {PAIR.map(({ faces, tilt }) =>
        tumbling ? (
          <span
            key={tilt}
            className={cn(
              "grid *:col-start-1 *:row-start-1 *:not-last:opacity-0",
              tilt,
            )}
          >
            {faces.map((count) => (
              <Die key={count} count={count} onBone={onBone} />
            ))}
          </span>
        ) : (
          <span key={tilt} className={tilt}>
            <Die count={faces[2]} onBone={onBone} />
          </span>
        ),
      )}
    </span>
  );
}
