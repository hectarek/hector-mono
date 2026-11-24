import type { JSX } from "@solidjs/web";
import { For, Show, useContext } from "solid-js";
import { formatFeet, snapToGrid } from "../model/geometry";
import { FIXTURE_PRESETS, TABLE_PRESETS } from "../model/presets";
import { PlanContext } from "../state/plan-store";
import { focusListItem } from "./item-list";

type Props = {
  /** The middle of what the canvas shows, in plan inches: new items land there. */
  center: { x: number; y: number };
};

const HEADING =
  "font-semibold text-muted-foreground text-xs uppercase tracking-wider";

function TableIcon(props: { round: boolean }): JSX.Element {
  return (
    <svg
      aria-hidden="true"
      width="28"
      height="28"
      viewBox="0 0 28 28"
      fill="none"
      class="stroke-foreground"
      stroke-width="1.5"
    >
      <Show
        when={props.round}
        fallback={
          <>
            <rect x="3" y="10" width="22" height="8" class="fill-card" />
            <circle cx="8" cy="5" r="2" />
            <circle cx="20" cy="5" r="2" />
            <circle cx="8" cy="23" r="2" />
            <circle cx="20" cy="23" r="2" />
          </>
        }
      >
        <circle cx="14" cy="14" r="7" class="fill-card" />
        <circle cx="14" cy="3.5" r="2" />
        <circle cx="24.5" cy="14" r="2" />
        <circle cx="14" cy="24.5" r="2" />
        <circle cx="3.5" cy="14" r="2" />
      </Show>
    </svg>
  );
}

/** Buttons that add a table or a shape where the canvas is looking (the spec's R3 and R5). */
export function Palette(props: Props): JSX.Element {
  const store = useContext(PlanContext);
  const at = () => {
    const grid = store.plan().room.gridInches;
    return {
      xInches: snapToGrid(props.center.x, grid),
      yInches: snapToGrid(props.center.y, grid),
    };
  };

  return (
    <div class="flex flex-col gap-4">
      <section class="flex flex-col gap-2" aria-labelledby="add-tables">
        <h2 id="add-tables" class={HEADING}>
          Add a table
        </h2>
        <div class="grid grid-cols-2 gap-2">
          <For each={TABLE_PRESETS}>
            {(preset) => (
              <button
                type="button"
                onClick={() => focusListItem(store.addTable(preset.id, at()))}
                class="flex flex-col items-start gap-1 rounded-lg border-2 border-border bg-card p-2.5 text-left hover:bg-accent"
              >
                <TableIcon round={preset.shape === "round"} />
                <span class="font-semibold text-sm">{preset.name}</span>
                <span class="font-mono text-muted-foreground text-xs">
                  {preset.seatCount} seats
                </span>
              </button>
            )}
          </For>
        </div>
      </section>
      <section class="flex flex-col gap-2" aria-labelledby="add-shapes">
        <h2 id="add-shapes" class={HEADING}>
          Add a shape
        </h2>
        <div class="grid grid-cols-2 gap-2">
          <For each={FIXTURE_PRESETS}>
            {(preset) => (
              <button
                type="button"
                onClick={() =>
                  focusListItem(store.addFixture(preset.kind, at()))
                }
                class="flex min-h-11 flex-col items-start justify-center gap-0.5 rounded-lg border-2 border-muted-foreground border-dashed bg-background p-2.5 text-left hover:bg-accent"
              >
                <span class="font-semibold text-sm">{preset.label}</span>
                <span class="font-mono text-muted-foreground text-xs">
                  {preset.shape === "circle"
                    ? formatFeet(preset.widthInches)
                    : `${formatFeet(preset.widthInches)} × ${formatFeet(preset.depthInches)}`}
                </span>
              </button>
            )}
          </For>
        </div>
      </section>
    </div>
  );
}
