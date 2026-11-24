import type { JSX } from "@solidjs/web";
import { useContext } from "solid-js";
import { formatFeet } from "../model/geometry";
import { exportAge } from "../model/saved-file";
import { PlanContext } from "../state/plan-store";
import {
  Button,
  IconButton,
  MinusIcon,
  PlusIcon,
  RedoIcon,
  UndoIcon,
} from "./controls";

type Props = {
  zoomPercent: number;
  onZoomIn: () => void;
  onZoomOut: () => void;
  onFit: () => void;
};

export function TopBar(props: Props): JSX.Element {
  const store = useContext(PlanContext);
  let fileInput: HTMLInputElement | undefined;
  const plan = () => store.plan();
  const seats = () =>
    plan().tables.reduce((sum, table) => sum + table.seatCount, 0);
  const exported = () => {
    const age = exportAge(store.committedFile(), new Date());
    return age ? `Exported ${age}` : "Not exported yet";
  };

  async function onFileChosen(e: Event & { currentTarget: HTMLInputElement }) {
    const input = e.currentTarget;
    const file = input.files?.[0];
    if (!file) return;
    const text = await file.text();
    input.value = "";
    store.importText(text);
  }

  return (
    <header class="flex flex-wrap items-center gap-x-5 gap-y-2 border-primary border-b-2 bg-card px-4 py-2.5">
      <span class="font-extrabold font-heading text-xl tracking-tight">
        Seating Chart
      </span>
      <div class="flex min-w-0 flex-col">
        <span class="truncate font-semibold text-sm">{plan().name}</span>
        <span class="font-mono text-muted-foreground text-xs">
          {formatFeet(plan().room.widthInches)} ×{" "}
          {formatFeet(plan().room.lengthInches)} · {plan().tables.length} tables
          · {seats()} seats
        </span>
      </div>
      <div class="flex-1" />
      <div class="flex gap-1.5">
        <IconButton
          label="Undo"
          disabled={!store.canUndo()}
          onClick={() => store.undo()}
        >
          <UndoIcon />
        </IconButton>
        <IconButton
          label="Redo"
          disabled={!store.canRedo()}
          onClick={() => store.redo()}
        >
          <RedoIcon />
        </IconButton>
      </div>
      <div class="flex items-center gap-1.5">
        <IconButton label="Zoom out" onClick={() => props.onZoomOut()}>
          <MinusIcon />
        </IconButton>
        <span class="w-12 text-center font-mono text-sm">
          {props.zoomPercent}%
        </span>
        <IconButton label="Zoom in" onClick={() => props.onZoomIn()}>
          <PlusIcon />
        </IconButton>
        <Button onClick={() => props.onFit()}>Fit to room</Button>
      </div>
      <div class="flex items-center gap-2">
        <span class="font-mono text-muted-foreground text-xs">
          {exported()}
        </span>
        <Button onClick={() => store.exportPlan()}>Export plan</Button>
        <Button onClick={() => fileInput?.click()}>Import</Button>
        <input
          ref={(el) => {
            fileInput = el;
          }}
          type="file"
          accept=".json,application/json"
          aria-label="Import a plan file"
          class="hidden"
          onChange={onFileChosen}
        />
      </div>
    </header>
  );
}
