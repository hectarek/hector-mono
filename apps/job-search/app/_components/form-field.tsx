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

// How a field is typed: text, a link, a whole number, a date, long text, or one of a few choices,
// shown as toggles ("" is none), since a native select can't reach a 44 px touch target.
export type FieldKind =
  | "text"
  | "url"
  | "number"
  | "date"
  | "long"
  | { choices: readonly { value: string; label: string }[] };

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
          variant="outline"
          className="flex-wrap"
          value={[value]}
          onValueChange={([chosen]) => onChange(chosen ?? "")}
          disabled={disabled}
        >
          {kind.choices.map((choice) => (
            <ToggleGroupItem
              key={choice.value}
              value={choice.value}
              className="min-h-11 min-w-11"
            >
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
          type={kind === "url" || kind === "date" ? kind : "text"}
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
