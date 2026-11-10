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

// The season's checkpoint rows, each a day and a short name: as many as a season takes (R12 as
// revised 2026-11-10).
const CHECKPOINT_ROWS = [
  { on: "checkpoint1On", name: "checkpoint1Name" },
  { on: "checkpoint2On", name: "checkpoint2Name" },
  { on: "checkpoint3On", name: "checkpoint3Name" },
] as const;

type CheckpointField = (typeof CHECKPOINT_ROWS)[number]["on" | "name"];
type Setting =
  | (typeof WEEKLY_COUNTS)[number]
  | "payFloor"
  | "seasonStart"
  | "seasonFinish"
  | CheckpointField;
type Fields = Record<Setting, string>;

// Settings as the form's text: a blank target, floor, date or name for none.
function fieldsOf({ targets, payFloor, season }: Settings): Fields {
  return {
    ...(Object.fromEntries(
      WEEKLY_COUNTS.map((count) => [count, targets[count]?.toString() ?? ""]),
    ) as Record<(typeof WEEKLY_COUNTS)[number], string>),
    payFloor: payFloor?.toString() ?? "",
    seasonStart: season?.start ?? "",
    seasonFinish: season?.finish ?? "",
    ...(Object.fromEntries(
      CHECKPOINT_ROWS.flatMap(({ on, name }, index) => {
        const checkpoint = season?.checkpoints[index];
        return [
          [on, checkpoint?.on ?? ""],
          [name, checkpoint?.name ?? ""],
        ];
      }),
    ) as Record<CheckpointField, string>),
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
    "payFloor" in value
  );
}

// Hector's weekly targets, pay floor and search season (R12 as revised 2026-11-10). Only he
// changes them (R21), so Claude's session sees the form off. A save is made against the updatedAt
// read with them, and on a conflict the form stays open on the settings as they are now, with
// what was typed kept (R22, KTD15).
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
      payFloor: numberOf(fields.payFloor),
      seasonStart: fields.seasonStart || null,
      seasonFinish: fields.seasonFinish || null,
      // Every row, so a check names a checkpoint by its row: a blank one is no checkpoint.
      checkpoints: CHECKPOINT_ROWS.map(({ on, name }) => ({
        on: fields[on],
        name: fields[name],
      })),
      updatedAt: form.opened.updatedAt?.toISOString() ?? null,
    };
    // Saved, the form stays here, open on the settings as saved.
    form.save(() => updateSettings(input), form.reopen);
  }

  const errorOf = (setting: Setting | "checkpoints") =>
    failure?.fields?.[setting];

  const field = (
    setting: Setting,
    {
      label = FIELD_LABELS[setting],
      description,
      type = "number",
      error = errorOf(setting),
    }: {
      label?: string;
      description?: string;
      type?: "number" | "date" | "text";
      error?: string;
    } = {},
  ) => (
    <Field key={setting} data-invalid={error ? true : undefined}>
      <FieldLabel htmlFor={`setting-${setting}`}>{label}</FieldLabel>
      <Input
        id={`setting-${setting}`}
        type={type === "date" ? "date" : "text"}
        inputMode={type === "number" ? "numeric" : undefined}
        value={form.fields[setting]}
        onChange={(event) => form.setField(setting, event.target.value)}
        aria-invalid={error ? true : undefined}
        disabled={humanOnly}
        className="min-h-11"
      />
      {description ? <FieldDescription>{description}</FieldDescription> : null}
      {error ? <FieldError>{error}</FieldError> : null}
    </Field>
  );

  const checkpointsError = errorOf("checkpoints");

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
        {field("payFloor", {
          description:
            "The yearly pay, in US dollars, the ranked list weighs a posted band against: a top under it ranks lower, a bottom at or over it higher. Blank for none.",
        })}
        <FieldSet>
          <FieldLegend>Season</FieldLegend>
          <FieldDescription>
            What Today tracks toward: the search season from its start to its
            finish, with up to three checkpoints between, each with a short
            name. Blank for none.
          </FieldDescription>
          <FieldGroup>
            {field("seasonStart", { type: "date" })}
            {field("seasonFinish", { type: "date" })}
            {CHECKPOINT_ROWS.map(({ on, name }, index) => (
              <FieldSet key={on}>
                <FieldLegend variant="label">
                  Checkpoint {index + 1}
                </FieldLegend>
                <div className="grid gap-3 sm:grid-cols-2">
                  {field(on, { label: "Date", type: "date", error: "" })}
                  {field(name, { label: "Name", type: "text", error: "" })}
                </div>
              </FieldSet>
            ))}
            {checkpointsError ? (
              <FieldError>{checkpointsError}</FieldError>
            ) : null}
          </FieldGroup>
        </FieldSet>
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
