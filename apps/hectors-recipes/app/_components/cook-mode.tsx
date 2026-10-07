"use client";

import { Button } from "@repo/ui/components/button";
import { Progress } from "@repo/ui/components/progress";
import { cn } from "@repo/ui/lib/utils";
import { Minus, Plus, Sun, SunDim, Timer, X } from "lucide-react";
import Link from "next/link";
import { type ReactNode, useEffect, useRef, useState } from "react";
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
import { useWakeLock, type WakeLockStatus } from "@/app/_lib/use-wake-lock";
import type { RecipeIngredient } from "@/src/entities/models/recipe-ingredient.model";
import type { RecipeStep } from "@/src/entities/models/recipe-step.model";
import { showLine } from "@/src/entities/scaling";
import { stepIngredients } from "@/src/entities/step-ingredients";

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

function WakeLockNotice() {
  const status = useWakeLock();
  const ok = status === "on" || status === "pending";
  const Icon = ok ? Sun : SunDim;
  return (
    <p
      role="status"
      className={cn(
        "flex items-center gap-1.5 text-xs",
        ok
          ? "text-muted-foreground"
          : "bg-warning text-warning-foreground rounded-lg px-3 py-2",
      )}
    >
      <Icon className="size-3.5 shrink-0" aria-hidden />
      {WAKE_LOCK_TEXT[status]}
    </p>
  );
}

// Opens at the servings chosen on the recipe page (?servings=), kept in the URL as they
// change; Add to list (passed in as addToList) reads the same number.
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
  // A saved step that's gone (the recipe was edited since) shows Gather.
  const index = steps.findIndex((step) => step.position === progress.at);
  const step = steps[index];
  const screen: CookScreen = step
    ? step.position
    : progress.at === "done"
      ? "done"
      : "gather";

  function go(by: 1 | -1) {
    progress.goTo(moveScreen(screen, by, steps));
    window.scrollTo?.({ top: 0 });
  }

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
            <p aria-live="polite" className="text-lg font-medium">
              Step {index + 1} of {steps.length}
            </p>
          )}
          <Button
            variant="secondary"
            size="lg"
            nativeButton={false}
            render={<Link href={recipeHref} />}
          >
            <X data-icon="inline-start" />
            Done
          </Button>
        </div>
        {step && (
          <Progress
            value={((index + 1) / steps.length) * 100}
            aria-label="Steps done"
          />
        )}
      </div>

      <div className="flex flex-1 flex-col gap-6 py-4">
        <div className="flex flex-col gap-2">
          <WakeLockNotice />
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
                  soundNeedsTap={soundNeedsTap}
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
          <section className="flex flex-col gap-2">
            <h2 className="font-heading text-xl">That&apos;s the last step</h2>
            <p className="text-muted-foreground text-lg">Enjoy it.</p>
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
                render={<Link href={recipeHref} />}
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

// An ingredient at the servings chosen, tapped to cross it off: the same ticks wherever it
// shows, on Gather or under a step (D65).
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
    <button
      type="button"
      onClick={onToggle}
      aria-pressed={used}
      className={cn(
        "w-full border-b py-3 text-left text-lg leading-snug",
        used && "text-muted-foreground line-through",
      )}
    >
      <LineText line={showLine(line, factor)} />
    </button>
  );
}

// Gather (D64): every ingredient to get out, under its section, at the servings set here.
function GatherScreen({
  lines,
  ingredient,
  addToList,
}: {
  lines: Line[];
  ingredient: (line: Line) => ReactNode;
  addToList: ReactNode;
}) {
  const { servings, setServings, yieldServings } = useRecipeServings();
  return (
    <section className="flex flex-col gap-3">
      <div className="flex items-center justify-between gap-3">
        <h2 className="font-heading text-xl">Ingredients</h2>
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
      <p className="text-muted-foreground text-xs">
        Tap an ingredient to cross it off as you get it out.
      </p>
      {addToList && <div>{addToList}</div>}
    </section>
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

function StepTimer({
  minutes,
  endsAt,
  now,
  soundNeedsTap,
  onStart,
  onStop,
}: {
  minutes: number;
  endsAt: number | undefined;
  now: number;
  soundNeedsTap: boolean;
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
  if (endsAt <= now) {
    return (
      <Button size="lg" onClick={onStop} role="alert">
        <Timer data-icon="inline-start" />
        Time&apos;s up · Dismiss
      </Button>
    );
  }
  return (
    <div className="flex flex-col items-start gap-1">
      <Button variant="secondary" size="lg" onClick={onStop}>
        <Timer data-icon="inline-start" />
        <span role="timer" className="tabular-nums">
          {timeLeft(endsAt, now)}
        </span>
        · Stop
      </Button>
      {soundNeedsTap && (
        <p className="text-muted-foreground text-sm">
          Tap anywhere to turn its sound back on.
        </p>
      )}
    </div>
  );
}
