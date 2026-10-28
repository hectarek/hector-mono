"use client";

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
import type { FormEvent } from "react";
import { ConflictNotice } from "@/app/_components/conflict-notice";
import { FIELD_LABELS } from "@/app/_lib/field-labels";
import { useRecordForm } from "@/app/_lib/use-record-form";
import { updateSettings } from "@/app/actions/settings";
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
  const form = useRecordForm(settings, fieldsOf, isSettings);
  const { failure } = form;

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const { fields } = form;
    const input = {
      targets: Object.fromEntries(
        WEEKLY_COUNTS.map((count) => [count, numberOf(fields[count])]),
      ),
      pendingCap: numberOf(fields.pendingCap),
      updatedAt: form.opened.updatedAt?.toISOString() ?? null,
    };
    // Saved, the form stays here, open on the settings as saved.
    form.save(() => updateSettings(input), form.reopen);
  }

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
          value={form.fields[setting]}
          onChange={(event) => form.setField(setting, event.target.value)}
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
        <ConflictNotice what="the settings" changes={form.changes} />
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
      {form.saved ? (
        <p role="status" className="text-muted-foreground text-sm">
          Saved.
        </p>
      ) : null}
      <div className="flex flex-wrap items-center gap-2">
        <Button
          type="submit"
          size="lg"
          disabled={humanOnly || form.isPending}
          className="min-h-11"
        >
          {form.isPending ? "Saving…" : "Save"}
        </Button>
        {humanOnly ? (
          <span className="text-muted-foreground text-sm">Only Hector</span>
        ) : null}
      </div>
    </form>
  );
}
