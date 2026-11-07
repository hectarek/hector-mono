import {
  Field,
  FieldDescription,
  FieldError,
  FieldLabel,
  FieldTitle,
} from "@repo/ui/components/field";
import { Input } from "@repo/ui/components/input";
import { Textarea } from "@repo/ui/components/textarea";
import { ToggleGroup, ToggleGroupItem } from "@repo/ui/components/toggle-group";
import { Check } from "lucide-react";

// How a field is typed: text, a link, a whole number, a date, a date and time, long text, or one
// of a few choices, shown as toggles ("" is none), since a native select can't reach a 44 px touch
// target. Stacked choices take a row each, full width, their text wrapping: a job's "Role at
// Company" is too long to share a row on a phone.
export type FieldKind =
  | "text"
  | "url"
  | "number"
  | "date"
  | "datetime"
  | "long"
  | {
      choices: readonly { value: string; label: string }[];
      stacked?: boolean;
    };

const INPUT_TYPES = {
  url: "url",
  date: "date",
  datetime: "datetime-local",
} as const;

// One field of a record's form, its text held by the form: the label, the control, what it's for,
// and what the answer said of it.
export function FormField({
  id,
  label,
  kind,
  value,
  onChange,
  error,
  description,
  required,
  maxLength,
  list,
  disabled,
}: {
  id: string;
  label: string;
  kind: FieldKind;
  value: string;
  onChange: (value: string) => void;
  error?: string;
  description?: string;
  required?: boolean;
  maxLength?: number;
  // The id of a datalist the field suggests from.
  list?: string;
  disabled?: boolean;
}) {
  const invalid = error ? true : undefined;
  return (
    <Field data-invalid={invalid}>
      {/* A label names one control; a group of toggles takes a title that names it. */}
      {typeof kind === "object" ? (
        <FieldTitle id={id}>{label}</FieldTitle>
      ) : (
        <FieldLabel htmlFor={id}>{label}</FieldLabel>
      )}
      {typeof kind === "object" ? (
        <ToggleGroup
          aria-labelledby={id}
          variant="choice"
          orientation={kind.stacked ? "vertical" : "horizontal"}
          size={kind.stacked ? "block" : undefined}
          className={kind.stacked ? "w-full" : "flex-wrap"}
          value={[value]}
          // Tapping the picked choice again keeps it; a field that can be empty offers None.
          onValueChange={([chosen]) => {
            if (chosen !== undefined) onChange(chosen);
          }}
          disabled={disabled}
        >
          {kind.choices.map((choice) => (
            <ToggleGroupItem
              key={choice.value}
              value={choice.value}
              className="min-h-11 min-w-11"
            >
              {/* The picked choice's check, so its fill isn't the only sign of it. */}
              <Check
                aria-hidden
                className="hidden group-aria-pressed/toggle:block"
              />
              {choice.label}
            </ToggleGroupItem>
          ))}
        </ToggleGroup>
      ) : kind === "long" ? (
        <Textarea
          id={id}
          value={value}
          onChange={(event) => onChange(event.target.value)}
          maxLength={maxLength}
          aria-invalid={invalid}
          disabled={disabled}
        />
      ) : (
        <Input
          id={id}
          type={
            kind === "number" || kind === "text" ? "text" : INPUT_TYPES[kind]
          }
          inputMode={kind === "number" ? "numeric" : undefined}
          value={value}
          onChange={(event) => onChange(event.target.value)}
          required={required}
          maxLength={maxLength}
          list={list}
          aria-invalid={invalid}
          disabled={disabled}
          className="min-h-11"
        />
      )}
      {description ? <FieldDescription>{description}</FieldDescription> : null}
      {error ? <FieldError>{error}</FieldError> : null}
    </Field>
  );
}
