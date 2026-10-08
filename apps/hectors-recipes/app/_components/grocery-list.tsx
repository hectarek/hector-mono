"use client";

import { Button } from "@repo/ui/components/button";
import { Input } from "@repo/ui/components/input";
import {
  NativeSelect,
  NativeSelectOption,
} from "@repo/ui/components/native-select";
import { cn } from "@repo/ui/lib/utils";
import { Check, CloudOff, Ellipsis } from "lucide-react";
import { useSearchParams } from "next/navigation";
import {
  type FormEvent,
  useActionState,
  useEffect,
  useOptimistic,
  useRef,
  useState,
  useTransition,
} from "react";
import { GroceryItemSheet } from "@/app/_components/grocery-item-sheet";
import { callAction } from "@/app/_lib/call-action";
import type { PendingWrite } from "@/app/_lib/pending-writes";
import { usePendingWrites } from "@/app/_lib/use-pending-writes";
import { addGroceryItem, clearCheckedItems } from "@/app/actions/grocery";
import type { ActionState } from "@/app/actions/shared";
import { groupByAisle, stackLikeItems } from "@/src/entities/aisles";
import { groupByRecipe } from "@/src/entities/grocery-by-recipe";
import { recipeTitles } from "@/src/entities/grocery-merge";
import type { GroceryItem } from "@/src/entities/models/grocery-item.model";

// How long a checked row stays readable before folding away, and the fold itself.
const SETTLE_MS = 650;
const FOLD_MS = 260;

function prefersReducedMotion(): boolean {
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

// Folds the row to nothing, then calls done. The fold stays applied until the row
// unmounts, so it never flashes back before moving to the other section.
function fold(row: HTMLElement | null, done: () => void) {
  if (!row || prefersReducedMotion()) {
    done();
    return;
  }
  const { height, paddingTop, paddingBottom } = getComputedStyle(row);
  row.animate(
    [
      { height, paddingTop, paddingBottom, opacity: 1 },
      { height: "0px", paddingTop: "0px", paddingBottom: "0px", opacity: 0 },
    ],
    {
      duration: FOLD_MS,
      easing: "cubic-bezier(0.4, 0, 0.2, 1)",
      fill: "forwards",
    },
  ).onfinish = done;
}

function ItemRow({
  item,
  text = item.text,
  canEdit,
  queuedChecked,
  unsaved,
  run,
  hold,
  release,
}: {
  item: GroceryItem;
  // What the row says: one recipe's share of the item, when the list is by recipe.
  text?: string;
  canEdit: boolean;
  // A check or uncheck made with no signal, waiting to be sent: shown as done meanwhile.
  queuedChecked: boolean | undefined;
  unsaved: boolean;
  // Sends a tap, or queues it with no signal; resolves to the server's error, if any.
  run: (write: PendingWrite) => Promise<string | undefined>;
  // Pin the item in the section it's shown in while it animates, then let it move.
  hold: (id: string) => void;
  release: (id: string) => void;
}) {
  const [checked, setOptimisticChecked] = useOptimistic(
    queuedChecked ?? item.checked,
  );
  const [removed, setRemoved] = useState(false);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [error, setError] = useState<string>();
  const [, startTransition] = useTransition();
  const forRecipes = recipeTitles(item);
  const rowRef = useRef<HTMLLIElement>(null);
  const settleTimer = useRef<number>(undefined);
  // The state the row was shown in when first tapped; tapping back to it cancels the move.
  const shownAs = useRef(queuedChecked ?? item.checked);

  useEffect(() => () => window.clearTimeout(settleTimer.current), []);

  if (removed) {
    return null;
  }

  function remove() {
    setRemoved(true);
    startTransition(async () => {
      const failed = await run({ kind: "remove", itemId: item.id });
      if (failed) {
        setRemoved(false);
        setError(failed);
      }
    });
  }

  function toggle() {
    const next = !checked;
    hold(item.id);
    window.clearTimeout(settleTimer.current);
    startTransition(async () => {
      setOptimisticChecked(next);
      const failed = await run({
        kind: "check",
        itemId: item.id,
        checked: next,
      });
      if (failed) {
        window.clearTimeout(settleTimer.current);
        setError(failed);
        release(item.id);
      }
    });
    settleTimer.current = window.setTimeout(
      () => {
        if (next === shownAs.current) {
          release(item.id);
          return;
        }
        fold(rowRef.current, () => release(item.id));
      },
      prefersReducedMotion() ? 0 : SETTLE_MS,
    );
  }

  return (
    <li ref={rowRef} className="flex flex-col overflow-hidden">
      <div className="flex items-center gap-2">
        {/* The whole row checks the item off (the design system's pattern for lists you
            check off): a label around a visually hidden checkbox, so it reads and works
            as a checkbox, and the ⋯ beside it stays a separate target. */}
        <label
          className={cn(
            "flex min-w-0 flex-1 items-center gap-3 py-2 select-none",
            canEdit && "cursor-pointer",
          )}
        >
          <input
            type="checkbox"
            checked={checked}
            onChange={toggle}
            disabled={!canEdit}
            className="peer sr-only"
          />
          <span
            aria-hidden
            className={cn(
              "peer-focus-visible:ring-ring/50 flex size-7 shrink-0 items-center justify-center rounded-md border transition-colors duration-200 peer-focus-visible:ring-3",
              checked
                ? "bg-primary text-primary-foreground border-primary"
                : "border-input",
            )}
          >
            <Check
              className={cn(
                "size-4 transition-transform duration-200 motion-reduce:transition-none",
                checked ? "scale-100" : "scale-0",
              )}
            />
          </span>
          <span className="flex min-w-0 flex-1 flex-col">
            {/* Always struck through; the line fades in and out with its colour, so the
                text never reflows. */}
            <span
              className={cn(
                "leading-snug line-through transition-colors duration-300",
                checked
                  ? "text-muted-foreground decoration-muted-foreground"
                  : "decoration-transparent",
              )}
            >
              {text}
            </span>
            {forRecipes && (
              <span className="text-muted-foreground truncate text-xs">
                for {forRecipes}
              </span>
            )}
            {unsaved && (
              <span className="text-muted-foreground flex items-center gap-1 text-xs">
                <CloudOff aria-hidden className="size-3" />
                Not saved yet
              </span>
            )}
          </span>
        </label>
        {canEdit && (
          <>
            <Button
              variant="quiet"
              size="icon-lg"
              aria-label={`Edit or remove ${item.text}`}
              onClick={() => setSheetOpen(true)}
            >
              <Ellipsis />
            </Button>
            <GroceryItemSheet
              item={item}
              open={sheetOpen}
              onOpenChange={setSheetOpen}
              onRemove={remove}
            />
          </>
        )}
      </div>
      {error && (
        <p role="alert" className="text-destructive pl-10 text-xs">
          {error}
        </p>
      )}
    </li>
  );
}

// Adding needs the server (a new item has no id to queue under), so with no signal it says
// so and keeps what was typed, instead of throwing to the error page.
async function addOrExplain(
  previous: ActionState,
  formData: FormData,
): Promise<ActionState> {
  try {
    return await addGroceryItem(previous, formData);
  } catch {
    return {
      error:
        "Couldn't reach the server, so it wasn't added. Try again when you have signal.",
    };
  }
}

function AddItemForm({ spaceId }: { spaceId: string }) {
  const [state, formAction, isPending] = useActionState(addOrExplain, null);
  const [, startTransition] = useTransition();
  const inputRef = useRef<HTMLInputElement>(null);

  // Through a transition, not <form action>, so a failed add keeps the typed text (a form
  // action resets the box); the effect below clears it once an add works.
  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    startTransition(() => formAction(formData));
  }

  // Keep the keyboard up and clear the box after each add, for typing a few in a row.
  useEffect(() => {
    if (state?.message && inputRef.current) {
      inputRef.current.value = "";
      inputRef.current.focus();
    }
  }, [state]);

  return (
    <form onSubmit={submit} className="flex flex-col gap-1">
      <input type="hidden" name="spaceId" value={spaceId} />
      <div className="flex gap-2">
        <Input
          ref={inputRef}
          name="text"
          placeholder="Add an item"
          aria-label="Add an item"
          maxLength={200}
          required
        />
        <Button type="submit" size="lg" disabled={isPending}>
          Add
        </Button>
      </div>
      {state?.error && (
        <p className="text-destructive text-sm">{state.error}</p>
      )}
    </form>
  );
}

export function GroceryList({
  spaceId,
  items,
  canEdit,
}: {
  spaceId: string;
  items: GroceryItem[];
  canEdit: boolean;
}) {
  const [isClearing, startClearing] = useTransition();
  const [clearError, setClearError] = useState<string>();
  // By aisle or by recipe (D60), kept in the address in place, as the library's Sort and group is.
  const searchParams = useSearchParams();
  const [byRecipe, setByRecipe] = useState(
    searchParams.get("group") === "recipe",
  );
  function changeGroup(value: string) {
    setByRecipe(value === "recipe");
    const params = new URLSearchParams(window.location.search);
    if (value === "recipe") params.set("group", "recipe");
    else params.delete("group");
    const query = params.toString();
    window.history.replaceState(
      null,
      "",
      query ? `/groceries?${query}` : "/groceries",
    );
  }
  const { queue, run } = usePendingWrites(spaceId);
  const queued = new Map(queue.map((write) => [write.itemId, write]));
  const queuedChecked = (item: GroceryItem) => {
    const write = queued.get(item.id);
    return write?.kind === "check" ? write.checked : undefined;
  };
  // Removed with no signal: gone from the list here even before the server hears of it.
  const visible = items.filter(
    (item) => queued.get(item.id)?.kind !== "remove",
  );
  // Items mid-animation stay in the section they were tapped in, whatever the server
  // now says, until their row has folded away.
  const [held, setHeld] = useState<Map<string, boolean>>(new Map());
  const hold = (id: string) =>
    setHeld((current) => {
      if (current.has(id)) return current;
      const item = items.find((candidate) => candidate.id === id);
      return new Map(current).set(
        id,
        item ? (queuedChecked(item) ?? item.checked) : false,
      );
    });
  const release = (id: string) =>
    setHeld((current) => {
      const next = new Map(current);
      next.delete(id);
      return next;
    });
  const shownChecked = (item: GroceryItem) =>
    held.get(item.id) ?? queuedChecked(item) ?? item.checked;
  const toBuy = visible.filter((item) => !shownChecked(item));
  const got = visible.filter((item) => shownChecked(item));
  // Like items together (D61), then grouped by aisle once anything on the list has one
  // (ux-plan D25); a list typed by hand stays one list.
  const stacked = stackLikeItems(toBuy);
  const aisles = groupByAisle(stacked);
  const byAisle = aisles.some((group) => group.aisle !== null);
  const row = (item: GroceryItem, text?: string) => (
    <ItemRow
      key={item.id}
      item={item}
      text={text}
      canEdit={canEdit}
      queuedChecked={queuedChecked(item)}
      unsaved={queued.has(item.id)}
      run={run}
      hold={hold}
      release={release}
    />
  );

  return (
    <div className="flex flex-col gap-4">
      {canEdit && <AddItemForm spaceId={spaceId} />}

      {toBuy.some((item) => item.recipes.length) && (
        <NativeSelect
          aria-label="Group by"
          value={byRecipe ? "recipe" : "aisle"}
          onChange={(event) => changeGroup(event.target.value)}
          className="self-end"
        >
          <NativeSelectOption value="aisle">By aisle</NativeSelectOption>
          <NativeSelectOption value="recipe">By recipe</NativeSelectOption>
        </NativeSelect>
      )}

      {toBuy.length > 0 && byRecipe ? (
        <div className="flex flex-col gap-4">
          {groupByRecipe(toBuy).map((group) => (
            <section
              key={group.recipeId ?? "by-hand"}
              aria-label={group.label}
              className="flex flex-col"
            >
              <h3
                className={
                  group.recipeId
                    ? "font-heading text-base"
                    : "text-muted-foreground text-xs font-semibold tracking-wide uppercase"
                }
              >
                {group.label}
              </h3>
              <ul className="flex flex-col divide-y">
                {group.rows.map(({ item, text }) => row(item, text))}
              </ul>
            </section>
          ))}
        </div>
      ) : toBuy.length > 0 && byAisle ? (
        <div className="flex flex-col gap-4">
          {aisles.map((group) => (
            <section
              key={group.label}
              aria-label={group.label}
              className="flex flex-col"
            >
              <h3 className="text-muted-foreground text-xs font-semibold tracking-wide uppercase">
                {group.label}
              </h3>
              <ul className="flex flex-col divide-y">
                {group.items.map((item) => row(item))}
              </ul>
            </section>
          ))}
        </div>
      ) : toBuy.length > 0 ? (
        <ul className="flex flex-col divide-y">
          {stacked.map((item) => row(item))}
        </ul>
      ) : (
        <p className="text-muted-foreground py-6 text-center text-sm">
          {got.length
            ? "Everything's in the cart."
            : canEdit
              ? "Nothing in groceries yet. Add items above, or add a recipe or your planned meals."
              : "Nothing in groceries yet."}
        </p>
      )}

      {got.length > 0 && (
        <details className="rounded-xl border px-3 py-2">
          <summary className="text-muted-foreground flex cursor-pointer items-center justify-between text-sm select-none">
            <span>Got it ({got.length})</span>
          </summary>
          <ul className="flex flex-col divide-y">
            {got.map((item) => row(item))}
          </ul>
          {canEdit && (
            <Button
              variant="secondary"
              size="lg"
              className="mt-2 mb-1"
              disabled={isClearing}
              onClick={() =>
                startClearing(async () =>
                  setClearError(
                    await callAction(() => clearCheckedItems(spaceId)),
                  ),
                )
              }
            >
              {isClearing ? "Clearing…" : "Clear checked"}
            </Button>
          )}
          {clearError && (
            <p role="alert" className="text-destructive mb-1 text-xs">
              {clearError}
            </p>
          )}
        </details>
      )}
    </div>
  );
}
