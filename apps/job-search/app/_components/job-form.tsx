"use client";

import { Button } from "@repo/ui/components/button";
import { FieldGroup } from "@repo/ui/components/field";
import Link from "next/link";
import { useRouter } from "next/navigation";
import type { FormEvent } from "react";
import { ConflictNotice } from "@/app/_components/conflict-notice";
import { type FieldKind, FormField } from "@/app/_components/form-field";
import { FIELD_LABELS } from "@/app/_lib/field-labels";
import {
  EMPLOYMENT_LABELS,
  LEVEL_LABELS,
  WORK_MODE_LABELS,
} from "@/app/_lib/job-labels";
import { useRecordForm } from "@/app/_lib/use-record-form";
import { addJob, updateJob } from "@/app/actions/jobs";
import type { Job } from "@/src/entities/models/job.model";

type Fact =
  | "role"
  | "clientName"
  | "postingUrl"
  | "source"
  | "level"
  | "workMode"
  | "location"
  | "payMin"
  | "payMax"
  | "employmentType"
  | "travelPercent"
  | "teamSize"
  | "targetRole"
  | "foundOn"
  | "nextStep"
  | "nextDate"
  | "appliedOn"
  | "summary";
type Fields = Record<Fact, string>;

// A set of choices, none first.
const choicesOf = (labels: Record<string, string>): FieldKind => ({
  choices: [
    { value: "", label: "None" },
    ...Object.entries(labels).map(([value, label]) => ({ value, label })),
  ],
});

// Each fact the form holds, in its order, how it's typed, and how long it may be. Applied-on is
// only for a job's edit: a move to applied sets it (R3).
const FACTS: readonly {
  fact: Fact;
  kind: FieldKind;
  maxLength?: number;
  description?: string;
}[] = [
  { fact: "role", kind: "text", maxLength: 120 },
  {
    fact: "clientName",
    kind: "text",
    maxLength: 120,
    description:
      "For a role through an agency: the agency is the company, and this its client",
  },
  { fact: "postingUrl", kind: "url", maxLength: 2000 },
  {
    fact: "source",
    kind: "text",
    maxLength: 80,
    description: "Where it came from: a source already listed, or a new one",
  },
  { fact: "level", kind: choicesOf(LEVEL_LABELS) },
  { fact: "workMode", kind: choicesOf(WORK_MODE_LABELS) },
  { fact: "location", kind: "text", maxLength: 120 },
  {
    fact: "payMin",
    kind: "number",
    description: "The posted band, in dollars a year",
  },
  { fact: "payMax", kind: "number" },
  { fact: "employmentType", kind: choicesOf(EMPLOYMENT_LABELS) },
  { fact: "travelPercent", kind: "number" },
  { fact: "teamSize", kind: "number" },
  { fact: "targetRole", kind: "text", maxLength: 80 },
  { fact: "foundOn", kind: "date" },
  { fact: "nextStep", kind: "text", maxLength: 120 },
  { fact: "nextDate", kind: "date" },
  {
    fact: "appliedOn",
    kind: "date",
    description: "A move to applied sets it",
  },
  {
    fact: "summary",
    kind: "long",
    maxLength: 2000,
    description: "A short summary of the posting",
  },
];

const NUMBERS: readonly Fact[] = [
  "payMin",
  "payMax",
  "travelPercent",
  "teamSize",
];

// A job's facts as the form's text, blank for none.
function fieldsOf(job: Job | undefined): Fields {
  return {
    role: job?.role ?? "",
    clientName: job?.clientName ?? "",
    postingUrl: job?.postingUrl ?? "",
    source: job?.source.name ?? "",
    level: job?.level ?? "",
    workMode: job?.workMode ?? "",
    location: job?.location ?? "",
    payMin: job?.payMin?.toString() ?? "",
    payMax: job?.payMax?.toString() ?? "",
    employmentType: job?.employmentType ?? "",
    travelPercent: job?.travelPercent?.toString() ?? "",
    teamSize: job?.teamSize?.toString() ?? "",
    targetRole: job?.targetRole ?? "",
    foundOn: job?.foundOn ?? "",
    nextStep: job?.nextStep ?? "",
    nextDate: job?.nextDate ?? "",
    appliedOn: job?.appliedOn ?? "",
    summary: job?.summary ?? "",
  };
}

// What a field's text saves: blank is none, and the numbers are numbers. A blank role or source
// stays blank, for the answer to say a job needs one.
function savedValue(fact: Fact, text: string): string | number | null {
  const trimmed = text.trim();
  if (fact === "role" || fact === "source") {
    return trimmed;
  }
  if (!trimmed) {
    return null;
  }
  return NUMBERS.includes(fact) ? Number(trimmed) : trimmed;
}

function isJob(value: unknown): value is Job {
  return (
    typeof value === "object" &&
    value !== null &&
    "id" in value &&
    "company" in value &&
    "updatedAt" in value &&
    value.updatedAt instanceof Date
  );
}

// Adds a job at a company, or changes one (R1). A new job sends what's filled in; a change sends
// only the facts edited, against the updatedAt read with the job, and on a conflict stays open on
// the job as it is now, with what was typed kept (R22, docs/build-plan.md KTD15). Saved, it opens
// the job. The source field suggests the sources already listed.
export function JobForm({
  job,
  companyId,
  sources,
}: {
  job?: Job;
  companyId: string;
  sources: string[];
}) {
  const router = useRouter();
  const form = useRecordForm(job, fieldsOf, isJob);
  const { failure } = form;

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const { opened } = form;
    const facts = (
      opened
        ? form.edited
        : FACTS.map(({ fact }) => fact).filter((fact) => fact !== "appliedOn")
    ).map((fact) => [fact, savedValue(fact, form.fields[fact])] as const);
    form.save(
      () =>
        opened
          ? updateJob({
              id: opened.id,
              updatedAt: opened.updatedAt.toISOString(),
              ...Object.fromEntries(facts),
            })
          : addJob({
              companyId,
              // A new job leaves out what's blank.
              ...Object.fromEntries(
                facts.filter(([, value]) => value !== null),
              ),
            }),
      (saved) => router.push(`/jobs/${saved.id}`),
    );
  }

  return (
    <form onSubmit={submit} className="flex flex-col gap-6">
      {failure?.code === "conflict" ? (
        <ConflictNotice what="the job" changes={form.changes} />
      ) : null}
      <FieldGroup>
        {FACTS.filter(({ fact }) => job || fact !== "appliedOn").map(
          ({ fact, kind, maxLength, description }) => (
            <FormField
              key={fact}
              id={`job-${fact}`}
              label={FIELD_LABELS[fact] ?? fact}
              kind={kind}
              value={form.fields[fact]}
              onChange={(text) => form.setField(fact, text)}
              error={failure?.fields?.[fact]}
              description={description}
              required={fact === "role" || fact === "source"}
              maxLength={maxLength}
              list={fact === "source" ? "lead-sources" : undefined}
            />
          ),
        )}
      </FieldGroup>
      <datalist id="lead-sources">
        {sources.map((name) => (
          <option key={name} value={name} />
        ))}
      </datalist>
      {failure && failure.code !== "conflict" ? (
        <p role="alert" className="text-destructive text-sm">
          {failure.message}
        </p>
      ) : null}
      <div className="flex flex-wrap gap-2">
        <Button
          type="submit"
          size="lg"
          disabled={form.isPending}
          className="min-h-11"
        >
          {form.isPending ? "Saving…" : job ? "Save" : "Add job"}
        </Button>
        <Button
          variant="secondary"
          size="lg"
          nativeButton={false}
          render={
            <Link href={job ? `/jobs/${job.id}` : `/companies/${companyId}`} />
          }
          className="min-h-11"
        >
          Cancel
        </Button>
      </div>
    </form>
  );
}
