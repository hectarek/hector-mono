"use client";

import { Button } from "@repo/ui/components/button";
import { Checkbox } from "@repo/ui/components/checkbox";
import { Switch } from "@repo/ui/components/switch";
import { ToggleGroup, ToggleGroupItem } from "@repo/ui/components/toggle-group";
import { cn } from "@repo/ui/lib/utils";
import { type ReactNode, useId, useState } from "react";
import { CountFace } from "@/app/_components/dice";
import { Group } from "@/app/_components/group";
import { ForwardIcon } from "@/app/_components/icons";
import { Piece } from "@/app/_components/piece";
import { Sheet } from "@/app/_components/sheet";
import {
  countMatches,
  EMPTY_VIEW,
  type FilterableItem,
  type LibraryView,
  type OfferedFilters,
  PLAY_TIMES,
  type PlayerFit,
  playersWords,
  withoutFilters,
} from "@/src/entities/library-filters";
import { GAME_COMPLEXITIES } from "@/src/entities/models/game.model";
import type { NameAndPiece } from "@/src/entities/models/user-profile.model";

// How many owners show before the rest fold away (screens.md, Limits to build for).
const OWNERS_SHOWN = 6;
const ANY = "any";

const capitalized = (word: string) =>
  `${word.charAt(0).toUpperCase()}${word.slice(1)}`;

// B2, Filter: the choices are the sheet's own until Show N games applies them, and its count
// follows them as they change; closing leaves the list as it was. Available now, owner, players
// and play time come first, complexity, category and minimum age fold away (R11). Each filter
// shows only when some game in view has its value, or when it's on (R11's revision). Each label
// sits beside its control: a Base UI control inside its own label flips twice on one click in
// happy-dom.
export function FilterSheet({
  draft,
  onDraft,
  onClose,
  onShow,
  offered,
  owners,
  inView,
}: {
  // The choices while the sheet is open; null when it's shut.
  draft: LibraryView | null;
  // A change to the draft, applied to the latest one: a Base UI control's change can land after
  // the next tap's, so no handler spreads a draft it read earlier.
  onDraft: (change: (view: LibraryView) => LibraryView) => void;
  onClose: () => void;
  onShow: (view: LibraryView) => void;
  offered: OfferedFilters;
  // The owners to pick from, the member first and named "You".
  owners: NameAndPiece[];
  inView: FilterableItem[];
}) {
  const view = draft ?? EMPTY_VIEW;
  const shown = countMatches(inView, view);
  return (
    <Sheet
      open={draft !== null}
      onOpenChange={(open) => {
        if (!open) onClose();
      }}
      title="Filter"
      closeLabel="Close without changing the filters"
      footer={
        <div className="flex items-center gap-3">
          <Button
            type="button"
            variant="link"
            onClick={() => onDraft(withoutFilters)}
          >
            Clear filters
          </Button>
          <Button
            type="button"
            size="lg"
            className="flex-1"
            onClick={() => onShow(view)}
          >
            Show {shown} {shown === 1 ? "game" : "games"}
          </Button>
        </div>
      }
    >
      {(offered.available || view.available) && (
        <AvailableNow
          on={view.available}
          onChange={(available) => onDraft((now) => ({ ...now, available }))}
        />
      )}
      {(owners.length > 1 || view.owners.length > 0) && (
        <Owners
          owners={owners}
          chosen={view.owners}
          onChange={(userId, on) =>
            onDraft((now) => ({
              ...now,
              owners: [
                ...now.owners.filter((id) => id !== userId),
                ...(on ? [userId] : []),
              ],
            }))
          }
        />
      )}
      {(offered.players.length > 0 || view.players !== null) && (
        <Players
          offered={offered}
          players={view.players}
          onChange={(change) =>
            onDraft((now) => ({ ...now, players: change(now.players) }))
          }
        />
      )}
      {(offered.times.length > 0 || view.time !== null) && (
        <Group label="Play time">
          <ToggleGroup
            aria-label="Play time"
            value={[view.time ?? ANY]}
            onValueChange={([next]) => {
              if (next !== undefined) {
                onDraft((now) => ({
                  ...now,
                  time:
                    PLAY_TIMES.find(({ value }) => value === next)?.value ??
                    null,
                }));
              }
            }}
            className="flex-wrap"
          >
            {PLAY_TIMES.filter(
              ({ value }) =>
                offered.times.includes(value) || view.time === value,
            ).map(({ value, words }) => (
              <ToggleGroupItem key={value} value={value}>
                {words}
              </ToggleGroupItem>
            ))}
            <ToggleGroupItem value={ANY}>Any</ToggleGroupItem>
          </ToggleGroup>
        </Group>
      )}
      <MoreFilters view={view} offered={offered} onDraft={onDraft} />
    </Sheet>
  );
}

function AvailableNow({
  on,
  onChange,
}: {
  on: boolean;
  onChange: (on: boolean) => void;
}) {
  const id = useId();
  // B2's panel holds one 44px row, 12px in; a tap anywhere on its words flips the switch.
  return (
    <div className="flex items-center justify-between gap-2.5 rounded-lg border-2 border-foreground bg-card px-3.5 py-3">
      <label htmlFor={id} className="flex min-h-11 flex-1 items-center text-15">
        Available now
      </label>
      <Switch id={id} checked={on} onCheckedChange={onChange} />
    </div>
  );
}

function Owners({
  owners,
  chosen,
  onChange,
}: {
  owners: NameAndPiece[];
  chosen: string[];
  onChange: (userId: string, on: boolean) => void;
}) {
  const [all, setAll] = useState(false);
  const shown =
    all || owners.length <= OWNERS_SHOWN
      ? owners
      : owners.slice(0, OWNERS_SHOWN);
  return (
    <Group
      label="Owner"
      aside={
        chosen.length === 0 && (
          <span className="font-mono text-xs font-medium">Any</span>
        )
      }
    >
      <div className="flex flex-col">
        {shown.map((owner) => (
          <div key={owner.userId} className="flex items-center gap-2.5">
            <Checkbox
              id={`owner-${owner.userId}`}
              checked={chosen.includes(owner.userId)}
              onCheckedChange={(on) => onChange(owner.userId, on)}
            />
            <label
              htmlFor={`owner-${owner.userId}`}
              className="flex min-h-11 flex-1 items-center gap-2 text-15"
            >
              <Piece
                shape={owner.pieceShape}
                color={owner.pieceColor}
                size={16}
              />
              {owner.name}
            </label>
          </div>
        ))}
      </div>
      {shown.length < owners.length && (
        <Button
          type="button"
          variant="link"
          className="self-start"
          onClick={() => setAll(true)}
        >
          Show all {owners.length}
        </Button>
      )}
    </Group>
  );
}

function Players({
  offered,
  players,
  onChange,
}: {
  offered: OfferedFilters;
  players: LibraryView["players"];
  onChange: (
    change: (players: LibraryView["players"]) => LibraryView["players"],
  ) => void;
}) {
  const [fit, setFit] = useState<PlayerFit>(players?.fit ?? "plays-with");
  const counts =
    fit === "plays-best-with" ? offered.bestPlayers : offered.players;
  const shown = [
    ...new Set([
      ...counts,
      ...(players && players.fit === fit ? [players.count] : []),
    ]),
  ].sort((a, b) => a - b);
  return (
    <Group label="Players">
      <ToggleGroup
        spacing={0}
        aria-label="How it plays"
        value={[fit]}
        onValueChange={([next]) => {
          if (next === "plays-with" || next === "plays-best-with") {
            setFit(next);
            onChange((now) => now && { fit: next, count: now.count });
          }
        }}
        className="w-full"
      >
        <ToggleGroupItem value="plays-with">Plays with</ToggleGroupItem>
        <ToggleGroupItem value="plays-best-with">Best at</ToggleGroupItem>
      </ToggleGroup>
      {/* Seven 44px dice fit the sheet's width, their faces 28px, spread across it as B2 draws
          them. */}
      <div className="-mx-1.5 flex flex-wrap justify-between">
        {shown.map((count) => {
          const pressed = players?.fit === fit && players.count === count;
          return (
            <button
              key={count}
              type="button"
              aria-pressed={pressed}
              aria-label={playersWords(count, true)}
              onClick={() =>
                onChange((now) =>
                  now?.fit === fit && now.count === count
                    ? null
                    : { fit, count },
                )
              }
              className="flex size-11 items-center justify-center rounded-lg focus-visible:outline-2 focus-visible:outline-foreground focus-visible:outline-dashed"
            >
              <CountFace count={count} inked={pressed} />
            </button>
          );
        })}
      </div>
    </Group>
  );
}

// B2's More filters: complexity, category and minimum age, each folded until it's opened, with
// what it's set to beside its name.
function MoreFilters({
  view,
  offered,
  onDraft,
}: {
  view: LibraryView;
  offered: OfferedFilters;
  onDraft: (change: (view: LibraryView) => LibraryView) => void;
}) {
  const complexities = GAME_COMPLEXITIES.filter(
    (level) =>
      offered.complexities.includes(level) || view.complexities.includes(level),
  );
  const rows: ReactNode[] = [];
  if (complexities.length > 0) {
    rows.push(
      <Folded
        key="complexity"
        label="Complexity"
        value={
          view.complexities.length
            ? capitalized(view.complexities.join(", "))
            : "Any"
        }
      >
        <ToggleGroup
          multiple
          aria-label="Complexity"
          value={view.complexities}
          onValueChange={(next) =>
            onDraft((now) => ({
              ...now,
              complexities: complexities.filter((level) =>
                next.includes(level),
              ),
            }))
          }
          className="flex-wrap"
        >
          {complexities.map((level) => (
            <ToggleGroupItem key={level} value={level}>
              {capitalized(level)}
            </ToggleGroupItem>
          ))}
        </ToggleGroup>
      </Folded>,
    );
  }
  const categories = [...new Set([...offered.categories, ...view.categories])];
  if (categories.length > 0) {
    rows.push(
      <Folded
        key="category"
        label="Category"
        value={view.categories.length ? view.categories.join(", ") : "Any"}
      >
        <ToggleGroup
          multiple
          aria-label="Category"
          value={view.categories}
          onValueChange={(next) =>
            onDraft((now) => ({
              ...now,
              categories: categories.filter((category) =>
                next.includes(category),
              ),
            }))
          }
          className="flex-wrap"
        >
          {categories.map((category) => (
            <ToggleGroupItem key={category} value={category}>
              {category}
            </ToggleGroupItem>
          ))}
        </ToggleGroup>
      </Folded>,
    );
  }
  const ages = [
    ...new Set([...offered.ages, ...(view.age === null ? [] : [view.age])]),
  ].sort((a, b) => a - b);
  if (ages.length > 0) {
    rows.push(
      <Folded
        key="age"
        label="Minimum age"
        value={view.age === null ? "Any" : `${view.age} or under`}
      >
        <ToggleGroup
          aria-label="Minimum age"
          value={[view.age === null ? ANY : `${view.age}`]}
          onValueChange={([next]) => {
            if (next !== undefined) {
              onDraft((now) => ({
                ...now,
                age: next === ANY ? null : Number(next),
              }));
            }
          }}
          className="flex-wrap"
        >
          {ages.map((age) => (
            <ToggleGroupItem key={age} value={`${age}`}>
              {age} or under
            </ToggleGroupItem>
          ))}
          <ToggleGroupItem value={ANY}>Any</ToggleGroupItem>
        </ToggleGroup>
      </Folded>,
    );
  }
  if (rows.length === 0) {
    return null;
  }
  return (
    <section className="flex flex-col gap-3">
      <h2 className="mt-1 font-heading text-15 font-bold tracking-wider uppercase">
        More filters
      </h2>
      <ul className="flex flex-col rounded-lg border-2 border-foreground bg-card *:border-dashed *:border-foreground *:not-first:border-t-2">
        {rows}
      </ul>
    </section>
  );
}

function Folded({
  label,
  value,
  children,
}: {
  label: string;
  value: string;
  children: ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const panel = useId();
  return (
    <li>
      <button
        type="button"
        aria-expanded={open}
        aria-controls={panel}
        onClick={() => setOpen(!open)}
        className="flex min-h-12 w-full items-center gap-3 px-3 py-2.5 text-left text-foreground hover:text-destructive focus-visible:-outline-offset-3"
      >
        <span className="flex-1 text-15 font-bold">{label}</span>
        <span className="font-mono text-xs font-medium">{value}</span>
        <ForwardIcon className={cn(open ? "-rotate-90" : "rotate-90")} />
      </button>
      {open && (
        <div id={panel} className="px-3 pb-3">
          {children}
        </div>
      )}
    </li>
  );
}
