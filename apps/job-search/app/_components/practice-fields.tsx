import { FormField } from "@/app/_components/form-field";
import { FIELD_LABELS } from "@/app/_lib/field-labels";
import { PRACTICE_RESULT_LABELS } from "@/app/_lib/job-labels";
import { PRACTICE_RESULTS } from "@/src/entities/practice-ladder";
import { PLAN_TIME_ZONE, todayIn } from "@/src/entities/week";

const RESULTS = PRACTICE_RESULTS.map((result) => ({
  value: result,
  label: PRACTICE_RESULT_LABELS[result],
}));

const AI_USED = [
  { value: "no", label: "No" },
  { value: "yes", label: "Yes" },
];

// A try's fields as typed (R11): how it went, the day, the minutes, whether AI was used, and notes.
export type TryValues = {
  result: string;
  practicedOn: string;
  minutes: string;
  aiUsed: string;
  notes: string;
};

// A try not yet typed: dated today, with no AI.
export function freshTry(): TryValues {
  return {
    result: "",
    practicedOn: todayIn(PLAN_TIME_ZONE),
    minutes: "",
    aiUsed: "no",
    notes: "",
  };
}

// What the fields send log_practice: blank minutes and notes are left out, and the minutes go as a
// number, which the server checks.
export function tryInput(values: TryValues): Record<string, unknown> {
  return {
    result: values.result,
    practicedOn: values.practicedOn,
    aiUsed: values.aiUsed === "yes",
    ...(values.minutes.trim() && { minutes: Number(values.minutes.trim()) }),
    ...(values.notes.trim() && { notes: values.notes }),
  };
}

// The fields every try takes, which a session's form and a review's sheet share.
export function TryFields({
  id,
  values,
  onChange,
  errors,
}: {
  id: string;
  values: TryValues;
  onChange: (values: TryValues) => void;
  errors?: Partial<Record<string, string>>;
}) {
  const set = (changes: Partial<TryValues>) =>
    onChange({ ...values, ...changes });
  return (
    <>
      <FormField
        id={`${id}-result`}
        label={FIELD_LABELS.result ?? "Result"}
        kind={{ choices: RESULTS }}
        value={values.result}
        onChange={(result) => set({ result })}
        error={errors?.result}
      />
      <FormField
        id={`${id}-date`}
        label={FIELD_LABELS.practicedOn ?? "Date"}
        kind="date"
        value={values.practicedOn}
        onChange={(practicedOn) => set({ practicedOn })}
        error={errors?.practicedOn}
      />
      <FormField
        id={`${id}-minutes`}
        label={FIELD_LABELS.minutes ?? "Minutes"}
        kind="number"
        value={values.minutes}
        onChange={(minutes) => set({ minutes })}
        error={errors?.minutes}
        maxLength={3}
      />
      <FormField
        id={`${id}-ai-used`}
        label={FIELD_LABELS.aiUsed ?? "AI used"}
        kind={{ choices: AI_USED }}
        value={values.aiUsed}
        onChange={(aiUsed) => set({ aiUsed: aiUsed || "no" })}
        error={errors?.aiUsed}
      />
      <FormField
        id={`${id}-notes`}
        label={FIELD_LABELS.notes ?? "Notes"}
        kind="long"
        value={values.notes}
        onChange={(notes) => set({ notes })}
        error={errors?.notes}
        maxLength={2000}
      />
    </>
  );
}
