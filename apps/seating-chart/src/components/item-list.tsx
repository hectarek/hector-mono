import type { JSX } from "@solidjs/web";
import { createMemo, For, Show, useContext } from "solid-js";
import { describeItem, listOrder } from "../model/describe";
import { PlanContext } from "../state/plan-store";

const ARROWS: Record<string, [number, number]> = {
  ArrowLeft: [-1, 0],
  ArrowRight: [1, 0],
  ArrowUp: [0, -1],
  ArrowDown: [0, 1],
};

/** Moves keyboard focus to an item's button in the list, once the list has drawn it. */
export function focusListItem(id: string | null): void {
  if (!id) return;
  const find = () =>
    document.querySelector<HTMLButtonElement>(
      `[data-list-item="${CSS.escape(id)}"]`,
    );
  const button = find();
  if (button) button.focus();
  else requestAnimationFrame(() => find()?.focus());
}

/**
 * Every table and shape as a button (the spec's R9). Focusing one selects it on the plan, and
 * the keys below act on it: this is how the plan is used from a keyboard or a screen reader.
 */
export function ItemList(): JSX.Element {
  const store = useContext(PlanContext);
  const items = createMemo(() => listOrder(store.plan()));

  function onKeyDown(e: KeyboardEvent, id: string) {
    const grid = store.plan().room.gridInches;
    const step = e.altKey ? 1 : grid * (e.shiftKey ? 5 : 1);
    const arrow = ARROWS[e.key];
    if (arrow) {
      e.preventDefault();
      store.moveBy(id, arrow[0] * step, arrow[1] * step);
    } else if (e.key === "r" || e.key === "R") {
      e.preventDefault();
      store.rotateBy(id, e.shiftKey ? -15 : 15);
    } else if (e.key === "Delete" || e.key === "Backspace") {
      e.preventDefault();
      const list = items();
      const at = list.findIndex((item) => item.id === id);
      const next = list[at + 1] ?? list[at - 1];
      store.remove(id);
      focusListItem(next?.id ?? null);
    } else if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "d") {
      e.preventDefault();
      focusListItem(store.duplicate(id));
    } else if (e.key === "Escape") {
      store.select(null);
    }
  }

  return (
    <section class="flex flex-col gap-2" aria-labelledby="on-the-plan">
      <h2
        id="on-the-plan"
        class="font-semibold text-muted-foreground text-xs uppercase tracking-wider"
      >
        On the plan
      </h2>
      <p class="text-muted-foreground text-xs leading-relaxed">
        Arrow keys move the selected one (Shift for 5 feet, Alt for an inch), R
        turns it, Delete removes it.
      </p>
      <Show
        when={items().length > 0}
        fallback={
          <p class="text-muted-foreground text-sm">
            Nothing yet: add a table above.
          </p>
        }
      >
        <ul class="flex flex-col gap-1">
          <For each={items()}>
            {(item) => (
              <li>
                <button
                  type="button"
                  data-list-item={item.id}
                  aria-label={describeItem(
                    item,
                    "seatCount" in item ? store.seatedAt(item.id) : 0,
                  )}
                  aria-pressed={
                    store.selectedId() === item.id ? "true" : "false"
                  }
                  onFocus={() => store.select(item.id)}
                  onClick={() => store.select(item.id)}
                  onKeyDown={(e) => onKeyDown(e, item.id)}
                  class="flex w-full items-center justify-between gap-2 rounded-lg border-2 border-transparent px-2.5 py-1.5 text-left text-sm hover:bg-accent aria-pressed:border-ring aria-pressed:bg-accent"
                >
                  <span class="truncate font-medium">{item.label}</span>
                  <Show when={"seatCount" in item ? item : undefined} keyed>
                    {(table) => (
                      <span class="font-mono text-muted-foreground text-xs">
                        {store.seatedAt(table.id)}/{table.seatCount}
                      </span>
                    )}
                  </Show>
                </button>
              </li>
            )}
          </For>
        </ul>
      </Show>
    </section>
  );
}
