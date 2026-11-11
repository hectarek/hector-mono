"use client";

import { Button } from "@repo/ui/components/button";
import { FieldGroup } from "@repo/ui/components/field";
import type { FormEvent } from "react";
import { ConflictNotice } from "@/app/_components/conflict-notice";
import { FormField } from "@/app/_components/form-field";
import { FIELD_LABELS } from "@/app/_lib/field-labels";
import { useRecordForm } from "@/app/_lib/use-record-form";
import { setWeekMilestone } from "@/app/actions/week";
import type { WeekPlan } from "@/src/entities/models/weekly-review.model";

const fieldsOf = (plan: WeekPlan | undefined): { milestone: string } => ({
  milestone: plan?.milestone ?? "",
});

function isPlan(value: unknown): value is WeekPlan {
  return (
    typeof value === "object" &&
    value !== null &&
    "id" in value &&
    "week" in value &&
    "updatedAt" in value &&
    value.updatedAt instanceof Date
  );
}

// A week's milestone, set at Monday's planning (R10 as revised 2026-11-10, U20). It fixes no
// counts: the review's first save still does. Made against the updatedAt read with the plan (R22);
// on a conflict the form stays open on the plan as it is now, with what was typed kept
// (docs/build-plan.md KTD15). A week with no plan yet takes a milestone, not a blank.
export function WeekMilestoneForm({
  week,
  plan,
}: {
  week: string;
  plan: WeekPlan | null;
}) {
  const form = useRecordForm(plan ?? undefined, fieldsOf, isPlan);
  const { failure, opened } = form;
  const typed = form.fields.milestone.trim();

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    form.save(
      () =>
        setWeekMilestone({
          week,
          milestone: typed || null,
          updatedAt: opened ? opened.updatedAt.toISOString() : null,
        }),
      form.reopen,
    );
  }

  return (
    <form onSubmit={submit} className="flex flex-col gap-6">
      {failure?.code === "conflict" ? (
        <ConflictNotice what="the milestone" changes={form.changes} />
      ) : null}
      <FieldGroup>
        <FormField
          id="week-milestone"
          label={FIELD_LABELS.milestone ?? "Milestone"}
          kind="text"
          value={form.fields.milestone}
          onChange={(text) => form.setField("milestone", text)}
          error={failure?.fields?.milestone}
          maxLength={200}
        />
      </FieldGroup>
      {failure && failure.code !== "conflict" && !failure.fields ? (
        <p role="alert" className="text-destructive text-sm">
          {failure.message}
        </p>
      ) : null}
      {form.saved ? (
        <p role="status" className="text-muted-foreground text-sm">
          Saved.
        </p>
      ) : null}
      <Button
        type="submit"
        size="lg"
        disabled={
          form.isPending || (opened ? form.edited.length === 0 : typed === "")
        }
        className="min-h-11 w-fit"
      >
        {form.isPending ? "Saving…" : opened ? "Save" : "Set the milestone"}
      </Button>
    </form>
  );
}
