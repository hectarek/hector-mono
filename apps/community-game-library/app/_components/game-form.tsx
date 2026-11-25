"use client";

import { Button } from "@repo/ui/components/button";
import {
  Field,
  FieldDescription,
  FieldError,
  FieldLabel,
} from "@repo/ui/components/field";
import { Input } from "@repo/ui/components/input";
import { RadioGroup, RadioGroupItem } from "@repo/ui/components/radio-group";
import { Textarea } from "@repo/ui/components/textarea";
import { useRouter } from "next/navigation";
import { useActionState, useEffect, useRef, useState } from "react";
import { BaseGameField } from "@/app/_components/base-game-field";
import { CountFace } from "@/app/_components/dice";
import { GameCategories } from "@/app/_components/game-categories";
import { Group } from "@/app/_components/group";
import { PhotoField } from "@/app/_components/photo-field";
import { useLeaveGuard } from "@/app/_lib/leave-guard";
import { notify, notifyNotSent } from "@/app/_lib/notify";
import type { ActionState } from "@/app/actions/shared";
import type { Game } from "@/src/entities/models/game.model";

type GameAction = (
  state: ActionState,
  formData: FormData,
) => Promise<ActionState>;

const optional = (
  <span data-ink="smudge" className="font-normal">
    {" · optional"}
  </span>
);
// The small caps over a pair of number fields: Fewest and Most, Shortest and Longest.
const SMALL_CAPS = "font-mono text-2xs font-medium tracking-wider uppercase";
const COMPLEXITIES = [
  ["light", "Light"],
  ["medium", "Medium"],
  ["heavy", "Heavy"],
] as const;
// B2's dice run to six, then a token; a range wider than this isn't a party game's.
const MOST_DICE = 12;

const count = (value: string) => {
  const number = Number(value);
  return value.trim() !== "" && Number.isInteger(number) ? number : null;
};

// A link Preview can open: the whole address, as the record keeps its links (form-fields.ts).
// URL.canParse is newer than some phones' Safari, so a parse that throws says no.
function isLink(value: string): boolean {
  const link = value.trim();
  if (!/^https?:\/\//.test(link)) {
    return false;
  }
  try {
    return new URL(link).host !== "";
  } catch {
    return false;
  }
}

// G3, Add a game by hand, and G4, a game's record (R5, R7): every field of a game, only the title
// needed (rule 14), in G3's panels, G4 keeping the whole form (Hector, 2026-11-25). The numbers
// are typed in Plex Mono, and the best counts are dice for the players typed; the picture is an
// upload into the catalog's bucket or an address, and an upload wins (KTD11); Preview opens the
// video's link in a new tab. Its categories are chips (GameCategories), and Is it an expansion?
// finds its base game in the catalog (BaseGameField), which sets its type. The page's heading is
// drawn here, since G3's line about a suggestion follows Expansion of: an expansion is added but
// never lands in the suggester's library. Saved, G3 goes back to Admin with "Pocket Regatta is
// in the catalog", and G4 stays with "Saved.". Leaving with something typed asks first.
export function GameForm({
  action,
  title,
  subtitle,
  game,
  baseGame = null,
  categories,
  suggestion,
  submitLabel,
  done,
}: {
  action: GameAction;
  // The page's title, and G4's line under it: what the game expands, as saved.
  title: string;
  subtitle?: string;
  // What the form starts with: a game's record (G4), or a suggestion's title, year and
  // publisher (G2's Add it by hand).
  game: Partial<Game>;
  // The game it's an expansion of, when it's one (G4).
  baseGame?: Game | null;
  // Every category the catalog's games use, the most used first.
  categories: string[];
  // G2's Add it by hand: the suggestion, sent with the form, and who sent it, for G3's line.
  suggestion?: { id: string; by: string };
  submitLabel: string;
  // Where the form goes once saved; none stays on the page.
  done?: string;
}) {
  const router = useRouter();
  const form = useRef<HTMLFormElement>(null);
  const [typed, setTyped] = useState(false);
  const [fewest, setFewest] = useState(`${game.minPlayers ?? ""}`);
  const [most, setMost] = useState(`${game.maxPlayers ?? ""}`);
  const [best, setBest] = useState<number[]>(game.bestPlayers ?? []);
  const [complexity, setComplexity] = useState<string>(game.complexity ?? "");
  const [video, setVideo] = useState(game.videoUrl ?? "");
  const [base, setBase] = useState<Game | null>(baseGame);
  const [state, submit, pending] = useActionState(
    async (previous: ActionState, formData: FormData) => {
      try {
        return await action(previous, formData);
      } catch {
        notifyNotSent(() => form.current?.requestSubmit());
        return previous;
      }
    },
    null,
  );
  useLeaveGuard(typed && state?.message === undefined);

  useEffect(() => {
    if (state?.message) {
      notify(state.message);
      setTyped(false);
      if (done) {
        router.push(done);
      }
    }
  }, [state, done, router]);

  const low = count(fewest);
  const high = count(most) ?? low;
  const dice =
    low !== null &&
    high !== null &&
    low >= 1 &&
    high >= low &&
    high - low < MOST_DICE
      ? Array.from({ length: high - low + 1 }, (_, step) => low + step)
      : [];
  const field = (name: string) => state?.fields?.[name];
  const text = (
    name: string,
    label: string,
    props: {
      optional?: boolean;
      help?: string;
      value?: string | null;
      // A number, typed on the number pad and in Plex Mono.
      number?: boolean;
    } = {},
  ) => (
    <Field data-invalid={field(name) ? "true" : undefined}>
      <FieldLabel htmlFor={`game-${name}`}>
        <span>
          {label}
          {props.optional !== false && optional}
        </span>
      </FieldLabel>
      <Input
        id={`game-${name}`}
        name={name}
        defaultValue={props.value ?? ""}
        inputMode={props.number ? "numeric" : undefined}
        data-font={props.number ? "mono" : undefined}
      />
      {props.help && <FieldDescription>{props.help}</FieldDescription>}
      {field(name) && <FieldError>{field(name)}</FieldError>}
    </Field>
  );

  return (
    <>
      <div className="flex flex-col gap-1">
        <h1 className="text-2xl leading-7 font-bold">{title}</h1>
        {subtitle && (
          <p className="text-13 text-muted-foreground">{subtitle}</p>
        )}
        {suggestion && (
          <p className="text-13 text-muted-foreground">
            From {suggestion.by}’s suggestion. When you add it, {suggestion.by}{" "}
            is told{base ? "." : " and it lands in their library."}
          </p>
        )}
      </div>
      <form
        ref={form}
        action={submit}
        onChange={() => setTyped(true)}
        className="flex flex-col gap-3"
        noValidate
      >
        {suggestion && (
          <input type="hidden" name="suggestionId" value={suggestion.id} />
        )}
        {game.id && <input type="hidden" name="gameId" value={game.id} />}
        <input
          type="hidden"
          name="type"
          value={base ? "expansion" : "base-game"}
        />
        <input type="hidden" name="baseGameId" value={base?.id ?? ""} />
        <input
          type="hidden"
          name="bestPlayers"
          value={best.filter((one) => dice.includes(one)).join(",")}
        />
        <input type="hidden" name="complexity" value={complexity} />

        <Group label="The game" roomy>
          {text("title", "Title", { optional: false, value: game.title })}
          {text("year", "Year", { value: `${game.year ?? ""}`, number: true })}
          <PhotoField
            name="image"
            label="Image"
            optional
            shape="box"
            chooseLabel="Choose an image"
            photoUrl={game.imageUrl}
            error={field("photo")}
          />
          {text("imageUrl", "Image address", {
            value: game.imageUrl,
            help: "Or a link to a picture, used when no image is chosen.",
          })}
          {text("imageCredit", "Image credit", {
            value: game.imageCredit,
            help: "Who made the image and its licence, when its source asks for credit, like “Ines Varga, CC BY-SA 4.0”. A new image leaves the old credit behind.",
          })}
          {text("imageSourceUrl", "Credit link", {
            value: game.imageSourceUrl,
            help: "The page that gives the credit, such as the image’s page on Wikimedia Commons.",
          })}
          <Field data-invalid={field("description") ? "true" : undefined}>
            <FieldLabel htmlFor="game-description">
              <span>Description{optional}</span>
            </FieldLabel>
            <Textarea
              id="game-description"
              name="description"
              rows={3}
              defaultValue={game.description ?? ""}
            />
            {field("description") && (
              <FieldError>{field("description")}</FieldError>
            )}
          </Field>
          <Field data-invalid={field("videoUrl") ? "true" : undefined}>
            <FieldLabel htmlFor="game-videoUrl">
              <span>How-to-play video{optional}</span>
            </FieldLabel>
            {/* Preview beside the field while it holds a link (G4). */}
            <div className="flex gap-2">
              <Input
                id="game-videoUrl"
                name="videoUrl"
                value={video}
                onChange={(event) => setVideo(event.target.value)}
              />
              {isLink(video) && (
                <Button
                  variant="secondary"
                  nativeButton={false}
                  render={
                    <a href={video.trim()} target="_blank" rel="noreferrer" />
                  }
                >
                  Preview
                </Button>
              )}
            </div>
            <FieldDescription>
              A link to a video, such as one on YouTube.
            </FieldDescription>
            {field("videoUrl") && <FieldError>{field("videoUrl")}</FieldError>}
          </Field>
        </Group>

        <Group label="At the table" roomy>
          <fieldset className="flex flex-col gap-1.5">
            <legend className="mb-1.5 text-13 font-semibold">
              Players{optional}
            </legend>
            <div className="flex gap-3">
              {(
                [
                  ["minPlayers", "Fewest", fewest, setFewest],
                  ["maxPlayers", "Most", most, setMost],
                ] as const
              ).map(([name, label, value, set]) => (
                <label
                  key={name}
                  htmlFor={`game-${name}`}
                  className="flex flex-1 flex-col gap-1"
                >
                  <span data-ink="smudge" className={SMALL_CAPS}>
                    {label}
                  </span>
                  <Input
                    id={`game-${name}`}
                    name={name}
                    inputMode="numeric"
                    data-font="mono"
                    value={value}
                    onChange={(event) => set(event.target.value)}
                  />
                </label>
              ))}
            </div>
            {(field("minPlayers") ?? field("maxPlayers")) && (
              <FieldError>
                {field("minPlayers") ?? field("maxPlayers")}
              </FieldError>
            )}
          </fieldset>
          {dice.length > 0 && (
            <fieldset className="flex flex-col gap-1.5">
              <legend className="mb-1.5 text-13 font-semibold">
                Plays best at{optional}
              </legend>
              <div className="-mx-1.5 flex flex-wrap">
                {dice.map((players) => {
                  const pressed = best.includes(players);
                  return (
                    <button
                      key={players}
                      type="button"
                      aria-pressed={pressed}
                      aria-label={`${players} ${players === 1 ? "player" : "players"}`}
                      onClick={() => {
                        setTyped(true);
                        setBest((now) =>
                          now.includes(players)
                            ? now.filter((one) => one !== players)
                            : [...now, players].sort((a, b) => a - b),
                        );
                      }}
                      className="flex size-11 items-center justify-center rounded-lg focus-visible:outline-2 focus-visible:outline-foreground focus-visible:outline-dashed"
                    >
                      <CountFace count={players} inked={pressed} />
                    </button>
                  );
                })}
              </div>
              <span className="text-xs text-muted-foreground">
                Tap every count it plays best at.
              </span>
            </fieldset>
          )}
          <fieldset className="flex flex-col gap-1.5">
            <legend className="mb-1.5 text-13 font-semibold">
              Play time in minutes{optional}
            </legend>
            <div className="flex gap-3">
              {(
                [
                  ["minMinutes", "Shortest", game.minMinutes],
                  ["maxMinutes", "Longest", game.maxMinutes],
                ] as const
              ).map(([name, label, value]) => (
                <label
                  key={name}
                  htmlFor={`game-${name}`}
                  className="flex flex-1 flex-col gap-1"
                >
                  <span data-ink="smudge" className={SMALL_CAPS}>
                    {label}
                  </span>
                  <Input
                    id={`game-${name}`}
                    name={name}
                    inputMode="numeric"
                    data-font="mono"
                    defaultValue={`${value ?? ""}`}
                  />
                </label>
              ))}
            </div>
            {(field("minMinutes") ?? field("maxMinutes")) && (
              <FieldError>
                {field("minMinutes") ?? field("maxMinutes")}
              </FieldError>
            )}
          </fieldset>
          {text("minAge", "Minimum age", {
            value: `${game.minAge ?? ""}`,
            number: true,
          })}
          <fieldset className="flex flex-col">
            <legend className="mb-1.5 text-13 font-semibold">
              Complexity{optional}
            </legend>
            <RadioGroup
              aria-label="Complexity"
              value={complexity}
              onValueChange={(next) => {
                setTyped(true);
                setComplexity(typeof next === "string" ? next : "");
              }}
            >
              {COMPLEXITIES.map(([value, words]) => (
                <div key={value} className="flex items-center gap-2.5">
                  <RadioGroupItem id={`complexity-${value}`} value={value} />
                  <label
                    htmlFor={`complexity-${value}`}
                    className="flex min-h-11 flex-1 items-center text-15"
                  >
                    {words}
                  </label>
                </div>
              ))}
            </RadioGroup>
          </fieldset>
        </Group>

        <Group label="What kind of game" roomy>
          <GameCategories
            label={<>Categories{optional}</>}
            catalog={categories}
            initial={game.categories ?? []}
            error={field("categories")}
            onEdit={() => setTyped(true)}
          />
        </Group>

        <Group label="Who made it" roomy>
          {text("designers", "Designers", {
            value: game.designers?.join(", "),
            help: "Separate names with commas.",
          })}
          {text("publishers", "Publishers", {
            value: game.publishers?.join(", "),
            help: "Separate names with commas.",
          })}
        </Group>

        <Group label="Is it an expansion?" roomy>
          <BaseGameField
            label={<>Expansion of{optional}</>}
            value={base}
            onChange={(next) => {
              setTyped(true);
              setBase(next);
            }}
            exceptId={game.id}
          />
        </Group>

        {state?.error && !state.fields && (
          <p role="alert" className="text-xs text-destructive">
            {state.error}
          </p>
        )}
        <Button type="submit" size="lg" disabled={pending}>
          {submitLabel}
        </Button>
      </form>
    </>
  );
}
