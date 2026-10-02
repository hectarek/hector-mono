"use client";

import { Button } from "@repo/ui/components/button";
import { cn } from "@repo/ui/lib/utils";
import { Minus, Plus, Sun, SunDim, Timer } from "lucide-react";
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
  cookProgressKey,
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

  const { used, step, timers } = progress;
  return {
    used: new Set(used),
    step,
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
    toggleStep: (position: number) =>
      setProgress((current) => ({
        ...current,
        step: current.step === position ? null : position,
      })),
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

function hasProgress({ used, step, timers }: CookProgress): boolean {
  return used.length > 0 || step !== null || Object.keys(timers).length > 0;
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
  lines,
  steps,
  addToList,
}: {
  recipeId: string;
  lines: Line[];
  steps: Step[];
  addToList: ReactNode;
}) {
  const { servings, setServings, yieldServings } = useRecipeServings();
  const progress = useCookProgress(recipeId);
  const now = useTimerClock(progress.timers);
  const soundNeedsTap = useSoundNeedsTap(
    Object.keys(progress.timers).length > 0,
  );
  const factor = yieldServings ? servings / yieldServings : 1;

  return (
    <div className="flex flex-col gap-8">
      <div className="flex flex-col gap-2">
        <WakeLockNotice />
        {progress.resumed && (
          <div className="text-muted-foreground flex items-center justify-between gap-3 text-sm">
            <span>Picked up where you left off.</span>
            <Button variant="secondary" size="lg" onClick={progress.startOver}>
              Start over
            </Button>
          </div>
        )}
      </div>

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
          {lines.map((line, index) => {
            const startsSection =
              line.section && line.section !== lines[index - 1]?.section;
            const isUsed = progress.used.has(line.position);
            return (
              <li key={line.position} className="flex flex-col">
                {startsSection && (
                  <span className="text-muted-foreground mt-4 mb-1 text-sm font-semibold tracking-wide uppercase">
                    {line.section}
                  </span>
                )}
                <button
                  type="button"
                  onClick={() => progress.toggleUsed(line.position)}
                  aria-pressed={isUsed}
                  className={cn(
                    "border-b py-3 text-left text-lg leading-snug",
                    isUsed && "text-muted-foreground line-through",
                  )}
                >
                  <LineText line={showLine(line, factor)} />
                </button>
              </li>
            );
          })}
        </ul>
        <p className="text-muted-foreground text-xs">
          Tap an ingredient to cross it off as you use it.
        </p>
      </section>

      {steps.length > 0 && (
        <section className="flex flex-col gap-3">
          <h2 className="font-heading text-xl">Method</h2>
          {stepGroups(steps).map((group) => (
            <div key={group.first} className="flex flex-col gap-2">
              {group.section && (
                <h3 className="text-muted-foreground mt-4 mb-1 text-sm font-semibold tracking-wide uppercase">
                  {group.section}
                </h3>
              )}
              <ol className="flex flex-col gap-2">
                {group.steps.map((step, index) => (
                  <StepItem
                    key={step.position}
                    number={group.first + index}
                    step={step}
                    current={progress.step === step.position}
                    onToggle={() => progress.toggleStep(step.position)}
                    uses={stepIngredients(step.text, lines).map(
                      (line) => showLine(line, factor).text,
                    )}
                    timerEndsAt={progress.timers[step.position]}
                    now={now}
                    soundNeedsTap={soundNeedsTap}
                    onStartTimer={(minutes) => {
                      primeAlarm();
                      progress.startTimer(step.position, minutes);
                    }}
                    onStopTimer={() => progress.stopTimer(step.position)}
                  />
                ))}
              </ol>
            </div>
          ))}
        </section>
      )}

      <div>{addToList}</div>
    </div>
  );
}

// A step is a large tap target that marks where you are. That button sits behind the
// step's content rather than around it, so the content can hold links and the timer button
// (neither is valid inside a button).
function StepItem({
  number,
  step,
  current,
  onToggle,
  uses,
  timerEndsAt,
  now,
  soundNeedsTap,
  onStartTimer,
  onStopTimer,
}: {
  number: number;
  step: Step;
  current: boolean;
  onToggle: () => void;
  uses: string[];
  timerEndsAt: number | undefined;
  now: number;
  soundNeedsTap: boolean;
  onStartTimer: (minutes: number) => void;
  onStopTimer: () => void;
}) {
  return (
    <li className="relative">
      <button
        type="button"
        onClick={onToggle}
        aria-pressed={current}
        aria-label={
          current ? `Step ${number}, current` : `Mark step ${number} as current`
        }
        className={cn(
          "absolute inset-0 rounded-xl border transition-colors",
          current ? "border-foreground bg-muted" : "border-transparent",
        )}
      />
      <div className="pointer-events-none relative flex gap-3 px-3 py-2.5">
        <span
          aria-hidden
          className="font-heading text-primary w-6 shrink-0 text-2xl leading-snug"
        >
          {number}
        </span>
        <div className="flex min-w-0 flex-col gap-2">
          <p className="text-xl leading-relaxed [&_a]:pointer-events-auto">
            <InlineMarkdown>{step.text}</InlineMarkdown>
          </p>
          {uses.length > 0 && (
            <p className="text-muted-foreground text-base">
              {uses.join(" · ")}
            </p>
          )}
          {step.timerMinutes !== null && (
            <div className="pointer-events-auto">
              <StepTimer
                minutes={step.timerMinutes}
                endsAt={timerEndsAt}
                now={now}
                soundNeedsTap={soundNeedsTap}
                onStart={() => onStartTimer(step.timerMinutes ?? 0)}
                onStop={onStopTimer}
              />
            </div>
          )}
        </div>
      </div>
    </li>
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
