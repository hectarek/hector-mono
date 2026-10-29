"use client";

import { Button } from "@repo/ui/components/button";
import { FieldGroup } from "@repo/ui/components/field";
import type { FormEvent } from "react";
import { ConflictNotice } from "@/app/_components/conflict-notice";
import { FormField } from "@/app/_components/form-field";
import { FIELD_LABELS } from "@/app/_lib/field-labels";
import { useRecordForm } from "@/app/_lib/use-record-form";
import { saveWeeklyReview } from "@/app/actions/week";
import type { WeeklyReview } from "@/src/entities/models/weekly-review.model";

type ReviewField = "milestone" | "change";
const REVIEW_FIELDS: readonly ReviewField[] = ["milestone", "change"];

const fieldsOf = (
  review: WeeklyReview | undefined,
): Record<ReviewField, string> => ({
  milestone: review?.milestone ?? "",
  change: review?.change ?? "",
});

function isReview(value: unknown): value is WeeklyReview {
  return (
    typeof value === "object" &&
    value !== null &&
    "id" in value &&
    "week" in value &&
    "updatedAt" in value &&
    value.updatedAt instanceof Date
  );
}

// A week's review (R10): its build milestone and its one change. The first save fixes the week's
// counts and targets as they are then; a later one, made against the updatedAt read with the
// review (R22), changes only what was edited, and on a conflict the form stays open on the review
// as it is now, with what was typed kept (docs/build-plan.md KTD15).
export function WeeklyReviewForm({
  week,
  review,
}: {
  week: string;
  review: WeeklyReview | null;
}) {
  const form = useRecordForm(review ?? undefined, fieldsOf, isReview);
  const { failure } = form;

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const { opened } = form;
    const fields = (opened ? form.edited : REVIEW_FIELDS).map(
      (field) => [field, form.fields[field].trim() || null] as const,
    );
    form.save(
      () =>
        saveWeeklyReview({
          week,
          updatedAt: opened ? opened.updatedAt.toISOString() : null,
          ...Object.fromEntries(fields),
        }),
      form.reopen,
    );
  }

  return (
    <form onSubmit={submit} className="flex flex-col gap-6">
      {failure?.code === "conflict" ? (
        <ConflictNotice what="the review" changes={form.changes} />
      ) : null}
      <FieldGroup>
        <FormField
          id="review-milestone"
          label={FIELD_LABELS.milestone ?? "Build milestone"}
          kind="text"
          value={form.fields.milestone}
          onChange={(text) => form.setField("milestone", text)}
          error={failure?.fields?.milestone}
          maxLength={200}
        />
        <FormField
          id="review-change"
          label={FIELD_LABELS.change ?? "The one change"}
          kind="long"
          value={form.fields.change}
          onChange={(text) => form.setField("change", text)}
          error={failure?.fields?.change}
          maxLength={500}
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
          form.isPending ||
          (form.opened !== undefined && form.edited.length === 0)
        }
        className="min-h-11 w-fit"
      >
        {form.isPending ? "Saving…" : form.opened ? "Save" : "Save the review"}
      </Button>
    </form>
  );
}
