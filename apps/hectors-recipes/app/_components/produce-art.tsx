import type { ReactNode } from "react";
import type { Produce } from "@/app/_components/produce-tile";

// The design system's produce drawings (its Produce assets), with theme colours in place of
// the files' hex values, so the leaves stay visible in dark mode: each fruit in its produce
// colour, dark leaves in `primary`, light leaves in `chart-4`, and leaf veins cut with the
// page background.
const LEAF_COLOURS = {
  dark: { fill: "fill-primary", stroke: "stroke-primary" },
  light: { fill: "fill-chart-4", stroke: "stroke-chart-4" },
} as const;

// A leaf drawn at unit length and scaled: two arcs meeting at its tips. `round` is the arcs'
// radius as a multiple of half the leaf's length (smaller is fatter).
function Leaf({
  x,
  y,
  angle,
  size,
  colour,
  round = 1.42,
  vein = false,
  stem = false,
}: {
  x: number;
  y: number;
  angle: number;
  // Half the leaf's length.
  size: number;
  colour: keyof typeof LEAF_COLOURS;
  round?: number;
  vein?: boolean;
  stem?: boolean;
}) {
  const { fill, stroke } = LEAF_COLOURS[colour];
  return (
    <g transform={`translate(${x} ${y}) rotate(${angle}) scale(${size})`}>
      <path
        d={`M-1 0A${round} ${round} 0 0 1 1 0A${round} ${round} 0 0 1 -1 0Z`}
        className={fill}
      />
      {stem && (
        <line
          x1="-0.96"
          y1="0"
          x2="-1.3"
          y2="0"
          strokeWidth={0.13}
          strokeLinecap="round"
          className={stroke}
        />
      )}
      {vein && (
        <line
          x1="-0.8"
          y1="0"
          x2="0.52"
          y2="0"
          strokeWidth={0.08}
          strokeLinecap="round"
          className="stroke-background"
        />
      )}
    </g>
  );
}

const DRAWINGS: Record<Produce, ReactNode> = {
  tomato: (
    <>
      <ellipse cx="48" cy="56" rx="35" ry="30" className="fill-chart-1" />
      {[
        [48, 25, -90],
        [56.56, 28.45, -18],
        [53.29, 34.05, 54],
        [42.71, 34.05, 126],
        [39.44, 28.45, 198],
      ].map(([x = 0, y = 0, angle = 0]) => (
        <Leaf key={angle} x={x} y={y} angle={angle} size={8.5} colour="dark" />
      ))}
      <line
        x1="48"
        y1="30"
        x2="51"
        y2="19"
        strokeWidth={3.2}
        strokeLinecap="round"
        className="stroke-primary"
      />
    </>
  ),
  // The greens turn with the carrot, from the middle of its top (P27.4: drawn upright, they
  // sprouted off its corner), and the whole is nudged back to the middle of the box.
  carrot: (
    <g transform="translate(-4 2)">
      <g transform="rotate(28 48 52)">
        <path
          d="M33 34 Q48 28 63 34 L50 88 Q48 92 46 88 Z"
          strokeWidth={4}
          strokeLinejoin="round"
          className="fill-chart-2 stroke-chart-2"
        />
        {[
          [39, 48],
          [47, 60],
          [40, 70],
        ].map(([x = 0, y = 0]) => (
          <line
            key={y}
            x1={x}
            y1={y}
            x2={x + 8}
            y2={y}
            strokeWidth={2.6}
            strokeLinecap="round"
            className="stroke-chart-foreground/20"
          />
        ))}
        {[
          [35.29, 20.81, -130],
          [45.92, 18.18, -100],
          [57.1, 18.72, -70],
        ].map(([x = 0, y = 0, angle = 0]) => (
          <Leaf
            key={angle}
            x={x}
            y={y}
            angle={angle}
            size={11}
            colour="light"
            stem
          />
        ))}
      </g>
    </g>
  ),
  lemon: (
    <>
      <g transform="rotate(-18 46 56)" className="fill-chart-3">
        <ellipse cx="46" cy="56" rx="33" ry="24" />
        <circle cx="12" cy="56" r="5.5" />
        <circle cx="80" cy="56" r="5.5" />
      </g>
      <Leaf
        x={62}
        y={24}
        angle={-35}
        size={14}
        colour="dark"
        round={1.38}
        vein
        stem
      />
    </>
  ),
  // The stem ends inside the top leaf (P27.4: it ran on past it to a bare tip).
  basil: (
    <>
      <path
        d="M30 84 Q42 59 55 41"
        fill="none"
        strokeWidth={3.2}
        strokeLinecap="round"
        className="stroke-primary"
      />
      <Leaf
        x={64}
        y={30}
        angle={-50}
        size={17}
        colour="light"
        round={1.25}
        vein
      />
      <Leaf
        x={34}
        y={50}
        angle={-150}
        size={18}
        colour="dark"
        round={1.25}
        vein
      />
      <Leaf
        x={58}
        y={62}
        angle={-20}
        size={15}
        colour="light"
        round={1.25}
        vein
      />
    </>
  ),
  plum: (
    <>
      <circle cx="47" cy="56" r="31" className="fill-chart-5" />
      <path
        d="M47 28 Q58 50 49 84"
        fill="none"
        strokeWidth={3}
        strokeLinecap="round"
        className="stroke-chart-foreground/20"
      />
      <line
        x1="47"
        y1="28"
        x2="44"
        y2="16"
        strokeWidth={3.2}
        strokeLinecap="round"
        className="stroke-primary"
      />
      <Leaf x={58} y={18} angle={-20} size={12} colour="light" round={1.41} />
    </>
  ),
};

export function ProduceArt({
  produce,
  className,
}: {
  produce: Produce;
  className?: string;
}) {
  return (
    <svg viewBox="0 0 96 96" aria-hidden className={className}>
      {DRAWINGS[produce]}
    </svg>
  );
}
