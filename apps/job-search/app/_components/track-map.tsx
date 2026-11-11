import { formatMonthDay } from "@/app/_lib/format-day";
import type { Season } from "@/src/entities/models/settings.model";
import {
  type Leg,
  legsOf,
  placeOf,
  type SeasonPlace,
} from "@/src/entities/season";

// The road, as the design system's TrackMap draws it: fixed art, not a scale drawing. Things on
// it sit at their share of the season's days along its length.
const ROAD = [
  [14, 62],
  [92, 62],
  [132, 24],
  [232, 24],
  [262, 54],
  [306, 54],
] as const;
const ROAD_PATH = "M14 62 H92 L132 24 H232 L262 54 H306";
// Half a checkpoint gate's length, across the road.
const GATE = 8;
// The road's height between its high and low stretches: a label goes above a point higher than
// this and below one lower.
const MIDDLE = 43;
// The finish's checker, two squares wide and three high, at the road's end.
const CHECKER = [
  { x: 302, y: 49.5, dark: true },
  { x: 306.5, y: 49.5, dark: false },
  { x: 302, y: 54, dark: false },
  { x: 306.5, y: 54, dark: true },
  { x: 302, y: 58.5, dark: true },
  { x: 306.5, y: 58.5, dark: false },
];

type Point = { x: number; y: number; dx: number; dy: number };

// The point a share of the way along the road, with the road's direction there.
function pointAt(share: number): Point {
  const segments = ROAD.slice(1).map(([x, y], index) => {
    const [fromX, fromY] = ROAD[index] ?? ROAD[0];
    const length = Math.hypot(x - fromX, y - fromY);
    return { fromX, fromY, x, y, length };
  });
  const total = segments.reduce((sum, { length }) => sum + length, 0);
  let left = Math.min(Math.max(share, 0), 1) * total;
  for (const { fromX, fromY, x, y, length } of segments) {
    if (left <= length) {
      const dx = (x - fromX) / length;
      const dy = (y - fromY) / length;
      return { x: fromX + dx * left, y: fromY + dy * left, dx, dy };
    }
    left -= length;
  }
  return { x: 306, y: 54, dx: 1, dy: 0 };
}

// Where a label goes beside a point: above the road's high stretch and below its low one, reading
// on from the left third, centred in the middle, and back from the right.
function labelAt({ x, y }: Point) {
  return {
    x,
    y: y < MIDDLE ? y - 12 : y + 18,
    anchor: x < 107 ? "start" : x > 213 ? "end" : "middle",
  } as const;
}

// The season as a race track (R9 as revised 2026-11-10, the design system's TrackMap): the road
// from the start to the finish, the stretch already run in signal, a gate at each checkpoint, each
// leg's end labelled with its day and length, and the car on today. Its text alternative says
// where today falls.
export function TrackMap({ season, today }: { season: Season; today: string }) {
  const legs = legsOf(season);
  const place = placeOf(season, today);
  const car = pointAt(place.share);
  const last = legs[legs.length - 1];
  return (
    <div
      role="img"
      aria-label={inWords(season, legs, place)}
      className="bg-card rounded-md border px-3 pt-2"
    >
      <svg
        viewBox="0 0 320 96"
        aria-hidden="true"
        className="block h-auto w-full"
      >
        <path
          d={ROAD_PATH}
          strokeWidth={9}
          strokeLinecap="round"
          strokeLinejoin="round"
          className="stroke-border fill-none"
        />
        <path
          d={ROAD_PATH}
          pathLength={100}
          strokeDasharray={`${place.share * 100} 100`}
          strokeWidth={9}
          strokeLinecap="round"
          strokeLinejoin="round"
          className="stroke-signal fill-none"
        />
        {legs.slice(0, -1).map((leg) => {
          const gate = pointAt(leg.share);
          const label = labelAt(gate);
          return (
            <g key={leg.endsOn}>
              <line
                x1={gate.x - gate.dy * GATE}
                y1={gate.y + gate.dx * GATE}
                x2={gate.x + gate.dy * GATE}
                y2={gate.y - gate.dx * GATE}
                strokeWidth={2}
                className="stroke-foreground"
              />
              <text
                x={label.x}
                y={label.y}
                textAnchor={label.anchor}
                fontSize={8.5}
                className="fill-muted-foreground font-mono tracking-wide"
              >
                {legLabel(`S${leg.sector}`, leg)}
              </text>
            </g>
          );
        })}
        {CHECKER.map(({ x, y, dark }) => (
          <rect
            key={`${x} ${y}`}
            x={x}
            y={y}
            width={4.5}
            height={4.5}
            className={dark ? "fill-foreground" : "fill-card"}
          />
        ))}
        <circle cx={car.x} cy={car.y} r={10} className="fill-signal/20" />
        <circle
          cx={car.x}
          cy={car.y}
          r={5.5}
          strokeWidth={2}
          className="fill-signal stroke-card"
        />
        <text
          x={car.x}
          y={car.y - 14}
          textAnchor="middle"
          fontSize={8.5}
          className="fill-foreground font-mono font-bold tracking-wide"
        >
          YOU
        </text>
        <text
          x={14}
          y={90}
          fontSize={8.5}
          className="fill-muted-foreground font-mono tracking-wide"
        >
          {formatMonthDay(season.start).toUpperCase()}
        </text>
        {last ? (
          <text
            x={306}
            y={90}
            textAnchor="end"
            fontSize={8.5}
            className="fill-muted-foreground font-mono tracking-wide"
          >
            {legLabel("Finish", last)}
          </text>
        ) : null}
      </svg>
    </div>
  );
}

// A leg's end as the track labels it: "S1 · NOV 13 · 11D".
function legLabel(name: string, { endsOn, days }: Leg): string {
  return `${name} · ${formatMonthDay(endsOn)} · ${days}d`.toUpperCase();
}

// Where today falls, in words, for the track's text alternative.
function inWords(season: Season, legs: Leg[], place: SeasonPlace): string {
  const span = `The season as a track, from ${formatMonthDay(season.start)} to ${formatMonthDay(season.finish)}.`;
  if (place.when === "before") {
    return `${span} It starts on ${formatMonthDay(season.start)}.`;
  }
  if (place.when === "after") {
    return `${span} It finished on ${formatMonthDay(season.finish)}.`;
  }
  const { leg, day } = place;
  const end = leg.name
    ? `the ${formatMonthDay(leg.endsOn)} checkpoint, ${leg.name}`
    : `the finish on ${formatMonthDay(leg.endsOn)}`;
  return `${span} Today is day ${day} of sector ${leg.sector} of ${legs.length}, which ends at ${end}.`;
}
