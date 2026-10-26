"use client";

import { Alert, AlertDescription, AlertTitle } from "@repo/ui/components/alert";
import { Button } from "@repo/ui/components/button";
import {
  Field,
  FieldDescription,
  FieldError,
  FieldGroup,
  FieldLabel,
  FieldLegend,
  FieldSet,
} from "@repo/ui/components/field";
import { Input } from "@repo/ui/components/input";
import { type FormEvent, useState, useTransition } from "react";
import { callAction } from "@/app/_lib/call-action";
import { FIELD_LABELS } from "@/app/_lib/field-labels";
import { rebased } from "@/app/_lib/form-changes";
import { updateSettings } from "@/app/actions/settings";
import type { ActionResult } from "@/app/actions/shared";
import {
  type Settings,
  WEEKLY_COUNTS,
} from "@/src/entities/models/settings.model";

type Setting = (typeof WEEKLY_COUNTS)[number] | "pendingCap";
type Fields = Record<Setting, string>;

// Settings as the form's text: a blank target for none.
function fieldsOf({ targets, pendingCap }: Settings): Fields {
  return {
    ...(Object.fromEntries(
      WEEKLY_COUNTS.map((count) => [count, targets[count]?.toString() ?? ""]),
    ) as Record<(typeof WEEKLY_COUNTS)[number], string>),
    pendingCap: String(pendingCap),
  };
}

// A number as typed, or none when blank.
function numberOf(text: string): number | null {
  return text.trim() ? Number(text) : null;
}

function isSettings(value: unknown): value is Settings {
  return (
    typeof value === "object" &&
    value !== null &&
    "targets" in value &&
    "pendingCap" in value
  );
}

// Hector's weekly targets and queue cap (R12). Only he changes them (R21), so Claude's session
// sees the form off. A save is made against the updatedAt read with them, and on a conflict the
// form stays open on the settings as they are now, with what was typed kept (R22, KTD15).
export function SettingsForm({
  settings,
  humanOnly,
}: {
  settings: Settings;
  humanOnly: boolean;
}) {
  const [opened, setOpened] = useState(settings);
  const [fields, setFields] = useState(() => fieldsOf(settings));
  const [result, setResult] = useState<ActionResult<Settings>>();
  const [changedSince, setChangedSince] = useState<Setting[]>([]);
  const [isPending, startTransition] = useTransition();

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const input = {
      targets: Object.fromEntries(
        WEEKLY_COUNTS.map((count) => [count, numberOf(fields[count])]),
      ),
      pendingCap: numberOf(fields.pendingCap),
      updatedAt: opened.updatedAt?.toISOString() ?? null,
    };
    startTransition(async () => {
      const answer = await callAction(() => updateSettings(input));
      setResult(answer);
      if (answer.ok) {
        setOpened(answer.data);
        setFields(fieldsOf(answer.data));
        setChangedSince([]);
      } else if (answer.code === "conflict" && isSettings(answer.current)) {
        const now = rebased(fields, fieldsOf(opened), fieldsOf(answer.current));
        setFields(now.fields);
        setChangedSince(now.changed);
        setOpened(answer.current);
      }
    });
  }

  const now = fieldsOf(opened);
  const failure = result?.ok === false ? result : undefined;

  const field = (setting: Setting, description?: string) => {
    const error = failure?.fields?.[setting];
    return (
      <Field key={setting} data-invalid={error ? true : undefined}>
        <FieldLabel htmlFor={`setting-${setting}`}>
          {FIELD_LABELS[setting]}
        </FieldLabel>
        <Input
          id={`setting-${setting}`}
          inputMode="numeric"
          value={fields[setting]}
          onChange={(event) =>
            setFields((typed) => ({ ...typed, [setting]: event.target.value }))
          }
          aria-invalid={error ? true : undefined}
          disabled={humanOnly}
          className="min-h-11"
        />
        {description ? (
          <FieldDescription>{description}</FieldDescription>
        ) : null}
        {error ? <FieldError>{error}</FieldError> : null}
      </Field>
    );
  };

  return (
    <form onSubmit={submit} className="flex flex-col gap-6">
      {failure?.code === "conflict" ? (
        <Alert>
          <AlertTitle>Changed since you opened them</AlertTitle>
          <AlertDescription>
            <p>
              The form shows the settings as they are now, with your edits kept.
              Save to keep them.
            </p>
            <ul>
              {changedSince.map((setting) => (
                <li key={setting}>
                  {FIELD_LABELS[setting]} is now {now[setting] || "none"}
                </li>
              ))}
            </ul>
          </AlertDescription>
        </Alert>
      ) : null}
      <div className="flex flex-col gap-6">
        <FieldSet>
          <FieldLegend>Weekly targets</FieldLegend>
          <FieldDescription>
            What each week, Monday to Sunday in Eastern time, counts toward.
            Blank for none.
          </FieldDescription>
          <FieldGroup>{WEEKLY_COUNTS.map((count) => field(count))}</FieldGroup>
        </FieldSet>
        {field(
          "pendingCap",
          "The most proposals from Claude that wait for your review at once",
        )}
      </div>
      {failure && failure.code !== "conflict" ? (
        <p role="alert" className="text-destructive text-sm">
          {failure.message}
        </p>
      ) : null}
      {result?.ok ? (
        <p role="status" className="text-muted-foreground text-sm">
          Saved.
        </p>
      ) : null}
      <div className="flex flex-wrap items-center gap-2">
        <Button
          type="submit"
          size="lg"
          disabled={humanOnly || isPending}
          className="min-h-11"
        >
          {isPending ? "Saving…" : "Save"}
        </Button>
        {humanOnly ? (
          <span className="text-muted-foreground text-sm">Only Hector</span>
        ) : null}
      </div>
    </form>
  );
}
