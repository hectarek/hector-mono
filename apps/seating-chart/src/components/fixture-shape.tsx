import type { JSX } from "@solidjs/web";
import { Show } from "solid-js";
import { formatFeet } from "../model/geometry";
import type { Fixture } from "../model/saved-file";
import { SelectionFrame } from "./selection-frame";

type Props = {
  fixture: Fixture;
  selected: boolean;
  unitsPerPixel: number;
};

/**
 * Something that takes floor space but seats nobody: a dashed ink edge on a muted fill, or
 * a hatched floor for the dance floor. The canvas reads data-item-id to find it.
 */
export function FixtureShape(props: Props): JSX.Element {
  const w = () => props.fixture.widthInches;
  const d = () => props.fixture.depthInches;
  const size = () =>
    props.fixture.shape === "circle"
      ? formatFeet(w())
      : `${formatFeet(w())} × ${formatFeet(d())}`;
  const labelSize = () =>
    Math.min(
      Math.min(w(), d()) * 0.4,
      w() / (props.fixture.label.length * 0.62),
      24,
    );
  const textTurn = () => {
    const turn = props.fixture.rotationDegrees;
    return turn > 90 && turn <= 270 ? 180 : 0;
  };
  const isLabel = () => props.fixture.kind === "label";

  return (
    <g
      data-item-id={props.fixture.id}
      transform={`translate(${props.fixture.xInches} ${props.fixture.yInches}) rotate(${props.fixture.rotationDegrees})`}
      class="cursor-grab outline-none"
    >
      <Show
        when={props.fixture.shape === "circle"}
        fallback={
          <rect
            x={-w() / 2}
            y={-d() / 2}
            width={w()}
            height={d()}
            rx="2"
            fill={
              props.fixture.kind === "dance-floor"
                ? "url(#seating-hatch)"
                : undefined
            }
            class={[
              "stroke-foreground",
              {
                "fill-muted":
                  props.fixture.kind !== "dance-floor" && !isLabel(),
                "fill-none": isLabel(),
                "stroke-transparent": isLabel() && !props.selected,
              },
            ]}
            stroke-width="1.5"
            stroke-dasharray="6 4"
            vector-effect="non-scaling-stroke"
          />
        }
      >
        <ellipse
          rx={w() / 2}
          ry={d() / 2}
          class="fill-muted stroke-foreground"
          stroke-width="1.5"
          stroke-dasharray="6 4"
          vector-effect="non-scaling-stroke"
        />
      </Show>
      <g transform={`rotate(${textTurn()})`} class="pointer-events-none">
        <text
          y={isLabel() ? 0 : -labelSize() * 0.2}
          font-size={String(labelSize())}
          text-anchor="middle"
          dominant-baseline="central"
          class="fill-foreground font-bold font-heading"
        >
          {props.fixture.label}
        </text>
        <Show when={!isLabel() && Math.min(w(), d()) >= 36}>
          <text
            y={labelSize() * 0.75}
            font-size={String(labelSize() * 0.5)}
            text-anchor="middle"
            dominant-baseline="central"
            class="fill-muted-foreground font-mono"
          >
            {size()}
          </text>
        </Show>
      </g>
      <Show when={props.selected}>
        <SelectionFrame
          halfW={w() / 2}
          halfD={d() / 2}
          unitsPerPixel={props.unitsPerPixel}
        />
      </Show>
    </g>
  );
}
