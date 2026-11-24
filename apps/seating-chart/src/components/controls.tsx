import type { JSX } from "@solidjs/web";
import { createSignal, createUniqueId, For } from "solid-js";

// The few controls the app draws itself: @repo/ui's components are React (the spec's KTD3).

type ButtonProps = {
  variant?: "primary" | "secondary" | "danger";
  disabled?: boolean;
  onClick: () => void;
  children: JSX.Element;
};

export function Button(props: ButtonProps): JSX.Element {
  const variant = () => props.variant ?? "secondary";
  return (
    <button
      type="button"
      disabled={props.disabled}
      onClick={() => props.onClick()}
      class={[
        "inline-flex h-11 shrink-0 items-center justify-center gap-2 whitespace-nowrap rounded-lg border-2 px-4 font-semibold text-sm transition-colors disabled:cursor-not-allowed disabled:opacity-40",
        {
          "border-primary bg-primary text-primary-foreground hover:bg-primary/90":
            variant() === "primary",
          "border-primary bg-card text-foreground hover:bg-accent":
            variant() === "secondary",
          "border-destructive bg-card text-destructive hover:bg-destructive/10":
            variant() === "danger",
        },
      ]}
    >
      {props.children}
    </button>
  );
}

type IconButtonProps = {
  label: string;
  disabled?: boolean;
  onClick: () => void;
  children: JSX.Element;
};

export function IconButton(props: IconButtonProps): JSX.Element {
  return (
    <button
      type="button"
      aria-label={props.label}
      title={props.label}
      disabled={props.disabled}
      onClick={() => props.onClick()}
      class="inline-flex size-11 shrink-0 items-center justify-center rounded-lg border-2 border-border bg-card text-foreground transition-colors hover:bg-accent disabled:cursor-not-allowed disabled:opacity-40"
    >
      {props.children}
    </button>
  );
}

const LABEL =
  "font-semibold text-muted-foreground text-xs uppercase tracking-wider";
const INPUT =
  "h-11 w-full rounded-lg border-2 border-input bg-card px-3 text-base text-foreground outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/25";

type TextFieldProps = {
  label: string;
  value: string;
  onCommit: (value: string) => void;
};

/** Commits when the field loses focus or Enter is pressed; an empty entry puts the old value back. */
export function TextField(props: TextFieldProps): JSX.Element {
  const id = createUniqueId();
  const [draft, setDraft] = createSignal(() => props.value);
  const commit = () => {
    const next = draft().trim();
    if (next && next !== props.value) props.onCommit(next);
    else setDraft(props.value);
  };
  return (
    <div class="flex flex-col gap-1.5">
      <label for={id} class={LABEL}>
        {props.label}
      </label>
      <input
        id={id}
        type="text"
        value={draft()}
        onInput={(e) => setDraft(e.currentTarget.value)}
        onChange={commit}
        class={INPUT}
      />
    </div>
  );
}

type NumberFieldProps = {
  label: string;
  value: number;
  unit: string;
  min: number;
  max: number;
  step: number;
  onCommit: (value: number) => void;
};

/** Takes a number within min and max; anything else puts the old value back. */
export function NumberField(props: NumberFieldProps): JSX.Element {
  const id = createUniqueId();
  const [draft, setDraft] = createSignal(() => String(props.value));
  const commit = () => {
    const next = Number(draft());
    if (Number.isFinite(next) && next >= props.min && next <= props.max) {
      if (next !== props.value) props.onCommit(next);
    } else {
      setDraft(String(props.value));
    }
  };
  return (
    <div class="flex min-w-0 flex-col gap-1.5">
      <label for={id} class={LABEL}>
        {props.label}
      </label>
      <div class="flex items-center gap-2">
        <input
          id={id}
          type="number"
          inputmode="decimal"
          min={props.min}
          max={props.max}
          step={props.step}
          value={draft()}
          onInput={(e) => setDraft(e.currentTarget.value)}
          onChange={commit}
          class={INPUT}
        />
        <span class="font-mono text-muted-foreground text-sm">
          {props.unit}
        </span>
      </div>
    </div>
  );
}

type Option<T extends string> = { value: T; label: string };

type ChoiceProps<T extends string> = {
  label: string;
  options: Option<T>[];
  value: T;
  onChange: (value: T) => void;
};

/** One of a few options, as a row of pressed and unpressed buttons. */
export function Choice<T extends string>(props: ChoiceProps<T>): JSX.Element {
  return (
    <fieldset>
      <legend class={["mb-1.5", LABEL]}>{props.label}</legend>
      <div class="flex overflow-hidden rounded-lg border-2 border-primary">
        <For each={props.options}>
          {(option) => (
            <button
              type="button"
              aria-pressed={props.value === option.value ? "true" : "false"}
              onClick={() => props.onChange(option.value)}
              class={[
                "h-10 flex-1 border-primary px-2 font-semibold text-sm not-first:border-l-2",
                {
                  "bg-primary text-primary-foreground":
                    props.value === option.value,
                  "bg-card text-foreground hover:bg-accent":
                    props.value !== option.value,
                },
              ]}
            >
              {option.label}
            </button>
          )}
        </For>
      </div>
    </fieldset>
  );
}

type StepperProps = {
  label: string;
  value: number;
  min: number;
  max: number;
  onChange: (value: number) => void;
};

export function Stepper(props: StepperProps): JSX.Element {
  return (
    <div class="flex flex-col gap-1.5">
      <span class={LABEL}>{props.label}</span>
      <div class="flex items-center gap-1">
        <IconButton
          label={`One fewer: ${props.label.toLowerCase()}`}
          disabled={props.value <= props.min}
          onClick={() => props.onChange(props.value - 1)}
        >
          <MinusIcon />
        </IconButton>
        <span
          class="min-w-10 text-center font-mono text-base"
          aria-live="polite"
        >
          {props.value}
        </span>
        <IconButton
          label={`One more: ${props.label.toLowerCase()}`}
          disabled={props.value >= props.max}
          onClick={() => props.onChange(props.value + 1)}
        >
          <PlusIcon />
        </IconButton>
      </div>
    </div>
  );
}

function Icon(props: { children: JSX.Element }): JSX.Element {
  return (
    <svg
      aria-hidden="true"
      width="20"
      height="20"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      stroke-width="2"
      stroke-linecap="round"
      stroke-linejoin="round"
    >
      {props.children}
    </svg>
  );
}

export function UndoIcon(): JSX.Element {
  return (
    <Icon>
      <path d="M9 14 4 9l5-5" />
      <path d="M4 9h11a5 5 0 0 1 0 10h-4" />
    </Icon>
  );
}

export function RedoIcon(): JSX.Element {
  return (
    <Icon>
      <path d="m15 14 5-5-5-5" />
      <path d="M20 9H9a5 5 0 0 0 0 10h4" />
    </Icon>
  );
}

export function MinusIcon(): JSX.Element {
  return (
    <Icon>
      <path d="M5 12h14" />
    </Icon>
  );
}

export function PlusIcon(): JSX.Element {
  return (
    <Icon>
      <path d="M5 12h14" />
      <path d="M12 5v14" />
    </Icon>
  );
}
