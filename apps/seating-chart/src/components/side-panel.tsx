import type { JSX } from "@solidjs/web";
import { createMemo, Match, Show, Switch, useContext } from "solid-js";
import { formatFeet } from "../model/geometry";
import { changeTableShape } from "../model/presets";
import type { Fixture, Table } from "../model/saved-file";
import { findItem, PlanContext } from "../state/plan-store";
import { Button, Choice, NumberField, Stepper, TextField } from "./controls";
import { focusListItem } from "./item-list";

const TITLE = "font-bold font-heading text-2xl leading-tight";

function ItemActions(props: { id: string }): JSX.Element {
  const store = useContext(PlanContext);
  return (
    <div class="flex flex-wrap gap-2">
      <Button onClick={() => focusListItem(store.duplicate(props.id))}>
        Duplicate
      </Button>
      <Button onClick={() => store.rotateBy(props.id, 45)}>Turn 45°</Button>
      <Button variant="danger" onClick={() => store.remove(props.id)}>
        Delete
      </Button>
    </div>
  );
}

function TablePanel(props: { table: Table }): JSX.Element {
  const store = useContext(PlanContext);
  const update = (patch: Partial<Omit<Table, "id">>) =>
    store.updateTable(props.table.id, patch);
  return (
    <>
      <div class="flex flex-col gap-1">
        <h2 class={TITLE}>{props.table.label}</h2>
        <p class="font-mono text-muted-foreground text-sm">
          {store.seatedAt(props.table.id)} of {props.table.seatCount} seats
          filled
        </p>
      </div>
      <TextField
        label="Label"
        value={props.table.label}
        onCommit={(label) => update({ label })}
      />
      <Choice
        label="Shape"
        options={[
          { value: "round", label: "Round" },
          { value: "rectangle", label: "Rectangle" },
          { value: "square", label: "Square" },
        ]}
        value={props.table.shape}
        onChange={(shape) => update(changeTableShape(props.table, shape))}
      />
      <Show
        when={props.table.shape === "rectangle"}
        fallback={
          <NumberField
            label={props.table.shape === "round" ? "Across" : "Side"}
            value={props.table.widthInches}
            unit="in"
            min={18}
            max={144}
            step={1}
            onCommit={(size) =>
              update({ widthInches: size, depthInches: size })
            }
          />
        }
      >
        <div class="grid grid-cols-2 gap-3">
          <NumberField
            label="Length"
            value={props.table.widthInches}
            unit="in"
            min={18}
            max={480}
            step={1}
            onCommit={(widthInches) => update({ widthInches })}
          />
          <NumberField
            label="Width"
            value={props.table.depthInches}
            unit="in"
            min={12}
            max={144}
            step={1}
            onCommit={(depthInches) => update({ depthInches })}
          />
        </div>
      </Show>
      <Stepper
        label="Seats"
        value={props.table.seatCount}
        min={1}
        max={40}
        onChange={(seatCount) => update({ seatCount })}
      />
      <Show when={props.table.shape !== "round"}>
        <Choice
          label="Seats along"
          options={[
            { value: "long-sides", label: "Two sides" },
            { value: "all-sides", label: "All sides" },
            { value: "one-side", label: "One side" },
          ]}
          value={
            props.table.seatSides ??
            (props.table.shape === "square" ? "all-sides" : "long-sides")
          }
          onChange={(seatSides) => update({ seatSides })}
        />
      </Show>
      <NumberField
        label="Turned"
        value={props.table.rotationDegrees}
        unit="°"
        min={0}
        max={359}
        step={1}
        onCommit={(rotationDegrees) => update({ rotationDegrees })}
      />
      <ItemActions id={props.table.id} />
    </>
  );
}

function FixturePanel(props: { fixture: Fixture }): JSX.Element {
  const store = useContext(PlanContext);
  const update = (patch: Partial<Omit<Fixture, "id">>) =>
    store.updateFixture(props.fixture.id, patch);
  const toInches = (feet: number) => Math.max(1, Math.round(feet * 12));
  return (
    <>
      <div class="flex flex-col gap-1">
        <h2 class={TITLE}>{props.fixture.label}</h2>
        <p class="font-mono text-muted-foreground text-sm">
          {formatFeet(props.fixture.widthInches)} ×{" "}
          {formatFeet(props.fixture.depthInches)}
        </p>
      </div>
      <TextField
        label="Label"
        value={props.fixture.label}
        onCommit={(label) => update({ label })}
      />
      <Choice
        label="Shape"
        options={[
          { value: "rectangle", label: "Rectangle" },
          { value: "circle", label: "Circle" },
        ]}
        value={props.fixture.shape}
        onChange={(shape) =>
          update(
            shape === "circle"
              ? { shape, depthInches: props.fixture.widthInches }
              : { shape },
          )
        }
      />
      <Show
        when={props.fixture.shape === "rectangle"}
        fallback={
          <NumberField
            label="Across"
            value={props.fixture.widthInches / 12}
            unit="ft"
            min={0.5}
            max={100}
            step={0.5}
            onCommit={(feet) =>
              update({
                widthInches: toInches(feet),
                depthInches: toInches(feet),
              })
            }
          />
        }
      >
        <div class="grid grid-cols-2 gap-3">
          <NumberField
            label="Length"
            value={props.fixture.widthInches / 12}
            unit="ft"
            min={0.5}
            max={200}
            step={0.5}
            onCommit={(feet) => update({ widthInches: toInches(feet) })}
          />
          <NumberField
            label="Width"
            value={props.fixture.depthInches / 12}
            unit="ft"
            min={0.5}
            max={200}
            step={0.5}
            onCommit={(feet) => update({ depthInches: toInches(feet) })}
          />
        </div>
      </Show>
      <NumberField
        label="Turned"
        value={props.fixture.rotationDegrees}
        unit="°"
        min={0}
        max={359}
        step={1}
        onCommit={(rotationDegrees) => update({ rotationDegrees })}
      />
      <ItemActions id={props.fixture.id} />
    </>
  );
}

function RoomPanel(): JSX.Element {
  const store = useContext(PlanContext);
  const room = () => store.plan().room;
  const seats = () =>
    store.plan().tables.reduce((sum, table) => sum + table.seatCount, 0);
  return (
    <>
      <div class="flex flex-col gap-1">
        <h2 class={TITLE}>The room</h2>
        <p class="font-mono text-muted-foreground text-sm">
          {store.plan().tables.length} tables · {seats()} seats ·{" "}
          {store.plan().fixtures.length} shapes
        </p>
      </div>
      <TextField
        label="Plan name"
        value={store.plan().name}
        onCommit={(name) => store.updatePlan({ name })}
      />
      <div class="grid grid-cols-2 gap-3">
        <NumberField
          label="Room width"
          value={room().widthInches / 12}
          unit="ft"
          min={10}
          max={400}
          step={1}
          onCommit={(feet) =>
            store.updatePlan({ widthInches: Math.round(feet * 12) })
          }
        />
        <NumberField
          label="Room length"
          value={room().lengthInches / 12}
          unit="ft"
          min={10}
          max={400}
          step={1}
          onCommit={(feet) =>
            store.updatePlan({ lengthInches: Math.round(feet * 12) })
          }
        />
      </div>
      <p class="text-muted-foreground text-sm leading-relaxed">
        Add tables and shapes from the left, then drag them into place; they
        snap to the 1-foot grid, and holding Alt places them freely. Drag the
        floor to look around, and zoom with the wheel, a pinch or the buttons
        above. Select a table to change it.
      </p>
    </>
  );
}

/** The selected table's or shape's details, or the room's when nothing is selected. */
export function SidePanel(): JSX.Element {
  const store = useContext(PlanContext);
  const selected = createMemo(() => {
    const id = store.selectedId();
    return id ? findItem(store.plan(), id) : undefined;
  });
  const table = () => {
    const item = selected();
    return item && "seatCount" in item ? item : undefined;
  };
  const fixture = () => {
    const item = selected();
    return item && !("seatCount" in item) ? item : undefined;
  };
  return (
    <aside
      aria-label="Details"
      class="hidden w-80 shrink-0 flex-col gap-5 overflow-y-auto border-border border-l-2 bg-card p-4 lg:flex"
    >
      <Switch fallback={<RoomPanel />}>
        <Match when={table()} keyed>
          {(item) => <TablePanel table={item} />}
        </Match>
        <Match when={fixture()} keyed>
          {(item) => <FixturePanel fixture={item} />}
        </Match>
      </Switch>
    </aside>
  );
}
