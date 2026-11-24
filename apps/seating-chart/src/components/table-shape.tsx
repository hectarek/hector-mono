import type { JSX } from "@solidjs/web";
import { createMemo, For, Show } from "solid-js";
import {
  CHAIR_DIAMETER_INCHES,
  chairReach,
  seatOffsets,
} from "../model/geometry";
import type { Table } from "../model/saved-file";
import { SelectionFrame } from "./selection-frame";

type Props = {
  table: Table;
  seated: number;
  selected: boolean;
  unitsPerPixel: number;
};

/**
 * One table on the plan: a white card with an ink edge, its seats around it as rings (filled
 * once someone sits there), and its number. The canvas reads data-item-id to find it.
 */
export function TableShape(props: Props): JSX.Element {
  const seats = createMemo(() => seatOffsets(props.table));
  const number = () => /^Table (\d+)$/.exec(props.table.label)?.[1];
  const short = () =>
    Math.min(props.table.widthInches, props.table.depthInches);
  // Round and square tables keep their text upright; a rectangle's runs along it, never upside down.
  const textTurn = () => {
    const turn = props.table.rotationDegrees;
    if (props.table.shape !== "rectangle") return -turn;
    return turn > 90 && turn <= 270 ? 180 : 0;
  };
  const labelSize = () =>
    number()
      ? short() * 0.4
      : Math.min(
          short() * 0.38,
          props.table.widthInches / (props.table.label.length * 0.62),
        );

  return (
    <g
      data-item-id={props.table.id}
      transform={`translate(${props.table.xInches} ${props.table.yInches}) rotate(${props.table.rotationDegrees})`}
      class="cursor-grab outline-none"
    >
      <For each={seats()}>
        {(seat, i) => (
          <circle
            cx={seat.x}
            cy={seat.y}
            r={CHAIR_DIAMETER_INCHES / 2}
            class={[
              "stroke-foreground",
              {
                "fill-muted-foreground": i() < props.seated,
                "fill-card": i() >= props.seated,
              },
            ]}
            stroke-width="1.5"
            stroke-dasharray={i() < props.seated ? undefined : "3 2"}
            vector-effect="non-scaling-stroke"
          />
        )}
      </For>
      <Show
        when={props.table.shape === "round"}
        fallback={
          <rect
            x={-props.table.widthInches / 2}
            y={-props.table.depthInches / 2}
            width={props.table.widthInches}
            height={props.table.depthInches}
            rx="2"
            class="fill-card stroke-foreground"
            stroke-width="2"
            vector-effect="non-scaling-stroke"
          />
        }
      >
        <circle
          r={props.table.widthInches / 2}
          class="fill-card stroke-foreground"
          stroke-width="2"
          vector-effect="non-scaling-stroke"
        />
      </Show>
      <g transform={`rotate(${textTurn()})`} class="pointer-events-none">
        <text
          y={-short() * 0.08}
          font-size={String(labelSize())}
          text-anchor="middle"
          dominant-baseline="central"
          class="fill-foreground font-extrabold font-heading"
        >
          {number() ?? props.table.label}
        </text>
        <text
          y={short() * 0.27}
          font-size={String(short() * 0.15)}
          text-anchor="middle"
          dominant-baseline="central"
          class="fill-muted-foreground font-mono"
        >
          {props.seated}/{props.table.seatCount}
        </text>
      </g>
      <Show when={props.selected}>
        <SelectionFrame
          halfW={props.table.widthInches / 2 + chairReach(props.table)}
          halfD={props.table.depthInches / 2 + chairReach(props.table)}
          unitsPerPixel={props.unitsPerPixel}
        />
      </Show>
    </g>
  );
}
