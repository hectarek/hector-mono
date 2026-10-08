"use client";

import { Button } from "@repo/ui/components/button";
import {
  Drawer,
  DrawerContent,
  DrawerTitle,
  DrawerTrigger,
} from "@repo/ui/components/drawer";
import { Progress } from "@repo/ui/components/progress";
import { cn } from "@repo/ui/lib/utils";
import {
  BellRing,
  ChevronDown,
  List,
  Minus,
  Plus,
  Sun,
  SunDim,
  Timer,
  X,
} from "lucide-react";
import Link from "next/link";
import { type ReactNode, useEffect, useRef, useState } from "react";
import { CheckRow } from "@/app/_components/check-row";
import { LineText } from "@/app/_components/line-text";
import { InlineMarkdown } from "@/app/_components/markdown";
import {
  RecipeServings,
  useRecipeServings,
} from "@/app/_components/recipe-servings";
import {
  isAlarmPrimed,
  primeAlarm,
  quietAlarm,
  ringAlarm,
} from "@/app/_lib/alarm";
import {
  type CookProgress,
  type CookScreen,
  cookProgressKey,
  moveScreen,
  NO_PROGRESS,
  parseCookProgress,
  shouldRing,
  timeLeft,
} from "@/app/_lib/cook-progress";
import { useClosesOnLeave } from "@/app/_lib/use-closes-on-leave";
import { useSwipe } from "@/app/_lib/use-swipe";
import { useWakeLock, type WakeLockStatus } from "@/app/_lib/use-wake-lock";
import { stripMarkdown } from "@/src/entities/ingredient-line";
import type { RecipeIngredient } from "@/src/entities/models/recipe-ingredient.model";
import type { RecipeStep } from "@/src/entities/models/recipe-step.model";
import { showLine } from "@/src/entities/scaling";
import { stepIngredients } from "@/src/entities/step-ingredients";
import { stepGroups } from "@/src/entities/step-text";

type Line = Pick<
  RecipeIngredient,
  | "position"
  | "raw"
  | "section"
  | "quantity"
  | "unit"
  | "name"
  | "note"
  | "optional"
>;
type Step = Pick<RecipeStep, "position" | "text" | "timerMinutes" | "section">;

const WAKE_LOCK_TEXT: Record<WakeLockStatus, string> = {
  pending: "Keeping screen on…",
  on: "Screen stays on",
  unsupported:
    "This browser can't keep the screen on. Turn off auto-lock while cooking.",
  denied:
    "This browser didn't allow keeping the screen on. Turn off auto-lock while cooking.",
};

// Whether the screen stays on (D63, D69): a sun in the top bar while it does, and a warning
// above the screen when the browser can't keep it on. A dismissed warning stays away on this
// device, and a dimmed sun in the top bar brings it back.
function WakeLockIcon({
  status,
  onShowWarning,
}: {
  status: WakeLockStatus;
  onShowWarning: () => void;
}) {
  if (status === "on" || status === "pending") {
    return (
      <p role="status" className="text-muted-foreground">
        <Sun className="size-5" aria-hidden />
        <span className="sr-only">{WAKE_LOCK_TEXT[status]}</span>
      </p>
    );
  }
  // In the warning's own colours, so it can't be taken for the sun of a screen staying on.
  return (
    <button
      type="button"
      aria-label="The screen may lock. Show why"
      onClick={onShowWarning}
      className="bg-warning text-warning-foreground flex size-9 shrink-0 items-center justify-center rounded-full"
    >
      <SunDim className="size-5" aria-hidden />
    </button>
  );
}

function WakeLockWarning({
  status,
  onDismiss,
}: {
  status: WakeLockStatus;
  onDismiss: () => void;
}) {
  return (
    <div
      role="status"
      className="bg-warning text-warning-foreground flex items-center gap-1.5 rounded-lg py-1 ps-3 pe-1 text-xs"
    >
      <SunDim className="size-3.5 shrink-0" aria-hidden />
      <p className="flex-1">{WAKE_LOCK_TEXT[status]}</p>
      {/* Ghost keeps the warning's own colour; quiet would mute it on the yellow. */}
      <Button
        variant="ghost"
        size="icon-lg"
        aria-label="Dismiss"
        onClick={onDismiss}
      >
        <X />
      </Button>
    </div>
  );
}

const WARNING_DISMISSED_KEY = "cook-screen-warning-dismissed";

// Whether the screen-lock warning was dismissed on this device (D69). Read after mount, as the
// install hint's is, so the server's render and the first one agree.
function useWarningDismissed() {
  const [dismissed, setDismissed] = useState(false);
  useEffect(() => {
    try {
      setDismissed(localStorage.getItem(WARNING_DISMISSED_KEY) === "1");
    } catch {
      // Storage blocked (private mode): the warning shows.
    }
  }, []);
  const change = (value: boolean) => {
    setDismissed(value);
    try {
      if (value) localStorage.setItem(WARNING_DISMISSED_KEY, "1");
      else localStorage.removeItem(WARNING_DISMISSED_KEY);
    } catch {
      // Nothing to keep it in: it stays as chosen until the page reloads.
    }
  };
  return [dismissed, change] as const;
}

// Opens at the servings chosen on the recipe page (?servings=), kept in the URL as they
// change; Add to groceries (passed in as addToList) reads the same number.
export function CookMode({
  yieldServings,
  initialServings,
  ...content
}: {
  recipeId: string;
  title: string;
  // Where Done goes: the recipe.
  recipeHref: string;
  lines: Line[];
  steps: Step[];
  yieldServings: number | null;
  initialServings: number | undefined;
  addToList: ReactNode;
}) {
  return (
    <RecipeServings
      yieldServings={yieldServings}
      initial={initialServings}
      inUrl
    >
      <CookModeContent {...content} />
    </RecipeServings>
  );
}

// Where you are (crossed-off ingredients, the current step, running timers), kept for the
// browser session: phones often reload a page you've switched away from, mid-recipe.
// Restored after mount, since the server can't see this browser's storage.
function useCookProgress(recipeId: string) {
  const [progress, setProgress] = useState<CookProgress>(NO_PROGRESS);
  const [loaded, setLoaded] = useState(false);
  const [resumed, setResumed] = useState(false);

  useEffect(() => {
    let saved: CookProgress = NO_PROGRESS;
    try {
      saved = parseCookProgress(
        sessionStorage.getItem(cookProgressKey(recipeId)),
      );
    } catch {
      // Storage blocked (private mode): start fresh.
    }
    if (hasProgress(saved)) {
      setProgress(saved);
      setResumed(true);
    }
    setLoaded(true);
  }, [recipeId]);

  useEffect(() => {
    // Not before the saved progress is read, or the empty start would overwrite it.
    if (!loaded) return;
    try {
      const key = cookProgressKey(recipeId);
      if (hasProgress(progress)) {
        sessionStorage.setItem(key, JSON.stringify(progress));
      } else {
        sessionStorage.removeItem(key);
      }
    } catch {
      // Nothing to keep it in; it lasts as long as the page.
    }
  }, [recipeId, loaded, progress]);

  const { used, at, timers } = progress;
  return {
    used: new Set(used),
    at,
    timers,
    // Shown only when the page opened on saved progress, so crossed-off lines make sense.
    resumed: resumed && hasProgress(progress),
    toggleUsed: (position: number) =>
      setProgress((current) => ({
        ...current,
        used: current.used.includes(position)
          ? current.used.filter((value) => value !== position)
          : [...current.used, position],
      })),
    goTo: (screen: CookScreen) =>
      setProgress((current) => ({ ...current, at: screen })),
    startTimer: (position: number, minutes: number) =>
      setProgress((current) => ({
        ...current,
        timers: {
          ...current.timers,
          [position]: Date.now() + minutes * 60_000,
        },
      })),
    stopTimer: (position: number) =>
      setProgress((current) => ({
        ...current,
        timers: Object.fromEntries(
          Object.entries(current.timers).filter(
            ([key]) => key !== String(position),
          ),
        ),
      })),
    startOver: () => {
      setProgress(NO_PROGRESS);
      setResumed(false);
    },
  };
}

function hasProgress({ used, at, timers }: CookProgress): boolean {
  return used.length > 0 || at !== "gather" || Object.keys(timers).length > 0;
}

// The time now, ticking each second while a timer runs, and ringing each timer that ends.
function useTimerClock(timers: Record<string, number>): number {
  const [now, setNow] = useState(() => Date.now());
  const running = Object.keys(timers).length > 0;
  const rung = useRef(new Set<string>());

  useEffect(() => {
    if (!running) return;
    setNow(Date.now());
    const tick = setInterval(() => setNow(Date.now()), 1000);
    return () => {
      clearInterval(tick);
      quietAlarm();
    };
  }, [running]);

  useEffect(() => {
    for (const [position, endsAt] of Object.entries(timers)) {
      const key = `${position}:${endsAt}`;
      if (shouldRing(endsAt, now) && !rung.current.has(key)) {
        rung.current.add(key);
        ringAlarm();
      }
    }
  }, [timers, now]);

  return now;
}

// After a reload, restored timers count down with no sound (iOS starts a page's audio only
// from a tap), so the next tap anywhere turns it on. Whether that tap is still needed.
function useSoundNeedsTap(running: boolean): boolean {
  const [needsTap, setNeedsTap] = useState(false);

  useEffect(() => {
    if (!running || isAlarmPrimed()) {
      setNeedsTap(false);
      return;
    }
    setNeedsTap(true);
    // The events that count as a tap for audio: a finger lifting (pointerup, and touchend
    // and click for older WebKit), or a key other than Escape or a shortcut.
    const events = ["pointerup", "touchend", "click", "keydown"] as const;
    const stopListening = () => {
      for (const event of events) document.removeEventListener(event, prime);
    };
    function prime(event: Event) {
      if (
        event instanceof KeyboardEvent &&
        (event.key === "Escape" ||
          event.metaKey ||
          event.ctrlKey ||
          event.altKey)
      ) {
        return;
      }
      primeAlarm();
      setNeedsTap(false);
      stopListening();
    }
    for (const event of events) document.addEventListener(event, prime);
    return stopListening;
  }, [running]);

  return running && needsTap;
}

function CookModeContent({
  recipeId,
  title,
  recipeHref,
  lines,
  steps,
  addToList,
}: {
  recipeId: string;
  title: string;
  recipeHref: string;
  lines: Line[];
  steps: Step[];
  addToList: ReactNode;
}) {
  const { yieldServings, servings } = useRecipeServings();
  const progress = useCookProgress(recipeId);
  const now = useTimerClock(progress.timers);
  const soundNeedsTap = useSoundNeedsTap(
    Object.keys(progress.timers).length > 0,
  );
  const factor = yieldServings ? servings / yieldServings : 1;
  // Back on the recipe at the servings chosen here, as its Cook link sends them (?servings=).
  const backHref =
    yieldServings !== null && servings !== yieldServings
      ? `${recipeHref}?servings=${servings}`
      : recipeHref;
  // A saved step that's gone (the recipe was edited since) shows Gather.
  const index = steps.findIndex((step) => step.position === progress.at);
  const step = steps[index];
  const screen: CookScreen = step
    ? step.position
    : progress.at === "done"
      ? "done"
      : "gather";

  function show(to: CookScreen) {
    progress.goTo(to);
    window.scrollTo?.({ top: 0 });
  }
  const go = (by: 1 | -1) => show(moveScreen(screen, by, steps));
  const swipe = useSwipe(go);
  const wakeLock = useWakeLock();
  const screenOk = wakeLock === "on" || wakeLock === "pending";
  const [warningDismissed, setWarningDismissed] = useWarningDismissed();
  // A new screen slides in from the side it came from, as the week does (D54).
  const order =
    screen === "gather" ? -1 : screen === "done" ? steps.length : index;
  const shownOrder = useRef(order);
  const slideFrom =
    shownOrder.current === order
      ? null
      : order > shownOrder.current
        ? "right"
        : "left";
  useEffect(() => {
    shownOrder.current = order;
  }, [order]);
  // Timers running for other steps follow you (D66); a step shows its own.
  const otherTimers = steps.flatMap((other, number) => {
    const endsAt = progress.timers[other.position];
    return endsAt !== undefined && other !== step
      ? [{ position: other.position, number: number + 1, endsAt }]
      : [];
  });

  const ingredient = (line: Line) => (
    <IngredientRow
      line={line}
      factor={factor}
      used={progress.used.has(line.position)}
      onToggle={() => progress.toggleUsed(line.position)}
    />
  );

  return (
    <div className="flex flex-1 flex-col">
      <div className="bg-background/95 supports-backdrop-filter:bg-background/80 sticky top-0 z-10 -mx-5 flex flex-col gap-2 px-5 py-2 backdrop-blur">
        <div className="flex items-center justify-between gap-3">
          <h1
            className={cn("font-heading truncate text-2xl", step && "sr-only")}
          >
            {title}
          </h1>
          {step && (
            <StepsSheet
              steps={steps}
              current={step.position}
              label={`Step ${index + 1} of ${steps.length}`}
              onShow={show}
              onStartOver={progress.startOver}
            />
          )}
          <div className="flex items-center gap-3">
            {(screenOk || warningDismissed) && (
              <WakeLockIcon
                status={wakeLock}
                onShowWarning={() => setWarningDismissed(false)}
              />
            )}
            <Button
              variant="secondary"
              size="lg"
              nativeButton={false}
              render={
                <Link href={backHref} transitionTypes={["close-cook-mode"]} />
              }
            >
              <X data-icon="inline-start" />
              Done
            </Button>
          </div>
        </div>
        {step && (
          <Progress
            value={((index + 1) / steps.length) * 100}
            aria-label="Steps done"
          />
        )}
        {otherTimers.length > 0 && (
          <ul aria-label="Timers" className="flex flex-wrap gap-2">
            {otherTimers.map((timer) => (
              <li key={timer.position}>
                <FollowingTimer
                  {...timer}
                  now={now}
                  onShow={() => show(timer.position)}
                  onDismiss={() => progress.stopTimer(timer.position)}
                />
              </li>
            ))}
          </ul>
        )}
        {soundNeedsTap && (
          <p className="text-muted-foreground text-sm">
            Tap anywhere to turn the timer&apos;s sound back on.
          </p>
        )}
      </div>

      <div
        key={String(screen)}
        {...swipe}
        className={cn(
          "flex flex-1 touch-pan-y touch-pinch-zoom flex-col gap-6 py-4",
          slideFrom &&
            "animate-in fade-in duration-200 motion-reduce:animate-none",
          slideFrom === "right" && "slide-in-from-right-6",
          slideFrom === "left" && "slide-in-from-left-6",
        )}
      >
        <div className="flex flex-col gap-2">
          {!screenOk && !warningDismissed && (
            <WakeLockWarning
              status={wakeLock}
              onDismiss={() => setWarningDismissed(true)}
            />
          )}
          {progress.resumed && (
            <div className="text-muted-foreground flex items-center justify-between gap-3 text-sm">
              <span>Picked up where you left off.</span>
              <Button
                variant="secondary"
                size="lg"
                onClick={progress.startOver}
              >
                Start over
              </Button>
            </div>
          )}
        </div>

        {step ? (
          <StepScreen
            step={step}
            uses={stepIngredients(step.text, lines).map((line) => (
              <li key={line.position}>{ingredient(line)}</li>
            ))}
            timer={
              step.timerMinutes !== null && (
                <StepTimer
                  minutes={step.timerMinutes}
                  endsAt={progress.timers[step.position]}
                  now={now}
                  onStart={() => {
                    primeAlarm();
                    progress.startTimer(step.position, step.timerMinutes ?? 0);
                  }}
                  onStop={() => progress.stopTimer(step.position)}
                />
              )
            }
          />
        ) : screen === "done" ? (
          <section className="flex flex-col items-start gap-2">
            <h2 className="font-heading text-xl">That&apos;s the last step</h2>
            <p className="text-muted-foreground text-lg">Enjoy it.</p>
            <Button
              variant="secondary"
              size="lg"
              className="mt-4"
              onClick={progress.startOver}
            >
              Start over
            </Button>
          </section>
        ) : (
          <GatherScreen
            lines={lines}
            ingredient={ingredient}
            addToList={addToList}
          />
        )}
      </div>

      <div className="bg-background sticky bottom-0 -mx-5 flex gap-2 border-t px-5 pt-3 pb-safe-3">
        {screen === "gather" ? (
          steps.length > 0 && (
            <Button size="lg" className="flex-1" onClick={() => go(1)}>
              Start cooking
            </Button>
          )
        ) : (
          <>
            {step && <IngredientsSheet lines={lines} ingredient={ingredient} />}
            <Button
              variant="secondary"
              size="lg"
              className="flex-1"
              onClick={() => go(-1)}
            >
              Back
            </Button>
            {screen === "done" ? (
              <Button
                size="lg"
                className="flex-1"
                nativeButton={false}
                render={
                  <Link href={backHref} transitionTypes={["close-cook-mode"]} />
                }
              >
                Back to the recipe
              </Button>
            ) : (
              <Button size="lg" className="flex-1" onClick={() => go(1)}>
                {index === steps.length - 1 ? "Finish" : "Next"}
              </Button>
            )}
          </>
        )}
      </div>
    </div>
  );
}

// An ingredient at the servings chosen, checked off as Groceries' items are (P27.3): the same
// ticks wherever it shows, on Gather, under a step or in the sheet (D65).
function IngredientRow({
  line,
  factor,
  used,
  onToggle,
}: {
  line: Line;
  factor: number;
  used: boolean;
  onToggle: () => void;
}) {
  return (
    <CheckRow checked={used} onChange={onToggle} className="border-b py-3">
      {/* Always struck through; the line fades in and out with its colour, as on Groceries. */}
      <span
        className={cn(
          "min-w-0 flex-1 text-lg leading-snug line-through transition-colors duration-300",
          used
            ? "text-muted-foreground decoration-muted-foreground"
            : "decoration-transparent",
        )}
      >
        <LineText line={showLine(line, factor)} />
      </span>
    </CheckRow>
  );
}

// Every ingredient under its section, at the servings set by the stepper beside the heading:
// on Gather, and in the sheet from a step (D64).
function IngredientList({
  heading,
  hint,
  lines,
  ingredient,
}: {
  heading: ReactNode;
  // Under the heading, before the list (Gather's "Check off…").
  hint?: ReactNode;
  lines: Line[];
  ingredient: (line: Line) => ReactNode;
}) {
  const { servings, setServings, yieldServings } = useRecipeServings();
  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center justify-between gap-3">
        {heading}
        {yieldServings !== null && (
          <fieldset className="flex items-center gap-1" aria-label="Servings">
            <Button
              variant="secondary"
              size="icon-lg"
              aria-label="Fewer servings"
              disabled={servings <= 1}
              onClick={() => setServings((value) => value - 1)}
            >
              <Minus />
            </Button>
            <span
              className="min-w-12 text-center text-lg tabular-nums"
              aria-live="polite"
            >
              {servings}
            </span>
            <Button
              variant="secondary"
              size="icon-lg"
              aria-label="More servings"
              onClick={() => setServings((value) => value + 1)}
            >
              <Plus />
            </Button>
          </fieldset>
        )}
      </div>
      {hint}
      <ul className="flex flex-col">
        {lines.map((line, index) => (
          <li key={line.position} className="flex flex-col">
            {line.section && line.section !== lines[index - 1]?.section && (
              <span className="text-muted-foreground mt-4 mb-1 text-sm font-semibold tracking-wide uppercase">
                {line.section}
              </span>
            )}
            {ingredient(line)}
          </li>
        ))}
      </ul>
    </div>
  );
}

// Gather (D64): the ingredients to get out, and Add to groceries.
function GatherScreen({
  lines,
  ingredient,
  addToList,
}: {
  lines: Line[];
  ingredient: (line: Line) => ReactNode;
  addToList: ReactNode;
}) {
  return (
    <section className="flex flex-col gap-3">
      <IngredientList
        heading={<h2 className="font-heading text-xl">Ingredients</h2>}
        hint={
          <p className="text-muted-foreground text-sm">
            Check off each ingredient as you get it out.
          </p>
        }
        lines={lines}
        ingredient={ingredient}
      />
      {addToList && <div>{addToList}</div>}
    </section>
  );
}

// "Step 3 of 8", which opens every step to jump to one (D63), and Start over.
function StepsSheet({
  steps,
  current,
  label,
  onShow,
  onStartOver,
}: {
  steps: Step[];
  current: number;
  label: string;
  onShow: (position: number) => void;
  onStartOver: () => void;
}) {
  const [open, setOpen] = useState(false);
  const sheetKey = useClosesOnLeave(() => setOpen(false));
  return (
    <Drawer key={sheetKey} open={open} onOpenChange={setOpen} showSwipeHandle>
      <DrawerTrigger render={<Button variant="quiet" size="lg" />}>
        <span aria-live="polite">{label}</span>
        <ChevronDown data-icon="inline-end" />
      </DrawerTrigger>
      <DrawerContent>
        <div className="pb-safe-4 flex min-h-0 flex-1 flex-col gap-3 overflow-y-auto px-4 pt-4">
          <DrawerTitle>Steps</DrawerTitle>
          {stepGroups(steps).map((group) => (
            <div key={group.first} className="flex flex-col">
              {group.section && (
                <h3 className="text-muted-foreground mt-2 mb-1 text-sm font-semibold tracking-wide uppercase">
                  {group.section}
                </h3>
              )}
              <ol className="flex flex-col">
                {group.steps.map((step, offset) => (
                  <li key={step.position}>
                    <button
                      type="button"
                      aria-current={
                        step.position === current ? "step" : undefined
                      }
                      onClick={() => {
                        onShow(step.position);
                        setOpen(false);
                      }}
                      className={cn(
                        "flex w-full gap-3 border-b py-3 text-left",
                        step.position === current && "font-semibold",
                      )}
                    >
                      <span className="text-primary font-heading w-6 shrink-0">
                        {group.first + offset}
                      </span>
                      <span className="line-clamp-2">
                        {stripMarkdown(step.text)}
                      </span>
                    </button>
                  </li>
                ))}
              </ol>
            </div>
          ))}
          <Button
            variant="secondary"
            size="lg"
            className="self-start"
            onClick={() => {
              onStartOver();
              setOpen(false);
            }}
          >
            Start over
          </Button>
        </div>
      </DrawerContent>
    </Drawer>
  );
}

// From a step, the whole list in a sheet (D64), with the same ticks and servings.
function IngredientsSheet({
  lines,
  ingredient,
}: {
  lines: Line[];
  ingredient: (line: Line) => ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const sheetKey = useClosesOnLeave(() => setOpen(false));

  return (
    <Drawer key={sheetKey} open={open} onOpenChange={setOpen} showSwipeHandle>
      <DrawerTrigger
        render={
          <Button
            variant="secondary"
            size="icon-lg"
            aria-label="All ingredients"
          />
        }
      >
        <List />
      </DrawerTrigger>
      <DrawerContent>
        <div className="pb-safe-4 min-h-0 flex-1 overflow-y-auto px-4 pt-4">
          <IngredientList
            heading={<DrawerTitle>Ingredients</DrawerTitle>}
            lines={lines}
            ingredient={ingredient}
          />
        </div>
      </DrawerContent>
    </Drawer>
  );
}

// One step, filling the screen (D63): its section, its words in large type, the ingredients
// it uses (D65), and its timer.
function StepScreen({
  step,
  uses,
  timer,
}: {
  step: Step;
  uses: ReactNode[];
  timer: ReactNode;
}) {
  return (
    <section className="flex flex-col gap-5">
      {step.section && (
        <p className="text-muted-foreground text-sm font-semibold tracking-wide uppercase">
          {step.section}
        </p>
      )}
      <p className="text-2xl leading-relaxed">
        <InlineMarkdown>{step.text}</InlineMarkdown>
      </p>
      {uses.length > 0 && (
        <div className="flex flex-col gap-1">
          <h2 className="text-muted-foreground text-sm">This step uses</h2>
          <ul className="flex flex-col">{uses}</ul>
        </div>
      )}
      {timer}
    </section>
  );
}

// Another step's timer, pinned above the step you're on (D66): tap it to go back to its step,
// or, once it's up, to dismiss it.
function FollowingTimer({
  number,
  endsAt,
  now,
  onShow,
  onDismiss,
}: {
  number: number;
  endsAt: number;
  now: number;
  onShow: () => void;
  onDismiss: () => void;
}) {
  if (endsAt <= now) {
    return (
      <Button variant="secondary" size="lg" onClick={onDismiss} role="alert">
        <BellRing data-icon="inline-start" />
        Step {number}: time&apos;s up · Dismiss
      </Button>
    );
  }
  return (
    <Button
      variant="secondary"
      size="lg"
      onClick={onShow}
      aria-label={`Step ${number} timer, ${timeLeft(endsAt, now)} left. Go to step ${number}`}
    >
      <Timer data-icon="inline-start" />
      Step {number} ·{" "}
      <span className="tabular-nums">{timeLeft(endsAt, now)}</span>
    </Button>
  );
}

function StepTimer({
  minutes,
  endsAt,
  now,
  onStart,
  onStop,
}: {
  minutes: number;
  endsAt: number | undefined;
  now: number;
  onStart: () => void;
  onStop: () => void;
}) {
  if (endsAt === undefined) {
    return (
      <Button variant="secondary" size="lg" onClick={onStart}>
        <Timer data-icon="inline-start" />
        Start {minutes}-minute timer
      </Button>
    );
  }
  // Up: still secondary, as Next is the screen's one filled button (D32); the ringing bell,
  // the alert and its sound mark it.
  if (endsAt <= now) {
    return (
      <Button variant="secondary" size="lg" onClick={onStop} role="alert">
        <BellRing data-icon="inline-start" />
        Time&apos;s up · Dismiss
      </Button>
    );
  }
  return (
    <Button variant="secondary" size="lg" onClick={onStop}>
      <Timer data-icon="inline-start" />
      <span role="timer" className="tabular-nums">
        {timeLeft(endsAt, now)}
      </span>
      · Stop
    </Button>
  );
}
