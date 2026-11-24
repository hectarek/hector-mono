import type { JSX } from "@solidjs/web";
import { For } from "solid-js";

type Props = {
  /** Half the frame's width and depth, in plan inches, around the item's center. */
  halfW: number;
  halfD: number;
  /** Plan inches per screen pixel, so the handles stay the same size on screen. */
  unitsPerPixel: number;
};

const CORNERS = [
  { sx: -1, sy: -1 },
  { sx: 1, sy: -1 },
  { sx: 1, sy: 1 },
  { sx: -1, sy: 1 },
];

/**
 * Blue dashes around the selected item, a corner handle at each corner to resize it and a
 * knob above it to turn it. Drawn inside the item's own group, so it turns with the item.
 * The canvas reads data-handle, data-sx and data-sy to tell which handle a drag began on.
 */
export function SelectionFrame(props: Props): JSX.Element {
  const handle = () => 10 * props.unitsPerPixel;
  const knobGap = () => 26 * props.unitsPerPixel;
  return (
    <g>
      <rect
        x={-props.halfW}
        y={-props.halfD}
        width={2 * props.halfW}
        height={2 * props.halfD}
        class="pointer-events-none fill-none stroke-ring"
        stroke-width="1.5"
        stroke-dasharray="6 4"
        vector-effect="non-scaling-stroke"
      />
      <line
        x1="0"
        y1={-props.halfD}
        x2="0"
        y2={-props.halfD - knobGap()}
        class="pointer-events-none stroke-ring"
        stroke-width="1.5"
        vector-effect="non-scaling-stroke"
      />
      <circle
        data-handle="rotate"
        cx="0"
        cy={-props.halfD - knobGap()}
        r={handle() * 0.7}
        class="cursor-grab fill-card stroke-ring"
        stroke-width="2"
        vector-effect="non-scaling-stroke"
      />
      <For each={CORNERS}>
        {(corner) => (
          <rect
            data-handle="resize"
            data-sx={corner.sx}
            data-sy={corner.sy}
            x={corner.sx * props.halfW - handle() / 2}
            y={corner.sy * props.halfD - handle() / 2}
            width={handle()}
            height={handle()}
            class={[
              "fill-card stroke-ring",
              {
                "cursor-nwse-resize": corner.sx * corner.sy > 0,
                "cursor-nesw-resize": corner.sx * corner.sy < 0,
              },
            ]}
            stroke-width="2"
            vector-effect="non-scaling-stroke"
          />
        )}
      </For>
    </g>
  );
}
