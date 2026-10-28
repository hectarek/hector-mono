"use client";

import { Button } from "@repo/ui/components/button";
import { FieldGroup } from "@repo/ui/components/field";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { type FormEvent, useState } from "react";
import { ConflictNotice } from "@/app/_components/conflict-notice";
import { type FieldKind, FormField } from "@/app/_components/form-field";
import { FIELD_LABELS } from "@/app/_lib/field-labels";
import { useRecordForm } from "@/app/_lib/use-record-form";
import { addPerson, updatePerson } from "@/app/actions/people";
import type { CompanyRef } from "@/src/entities/models/company.model";
import type { Person } from "@/src/entities/models/person.model";

type Fact =
  | "name"
  | "company"
  | "role"
  | "howKnown"
  | "rank"
  | "ask"
  | "nextStep"
  | "nextDate"
  | "notes";
type Fields = Record<Fact, string>;

const RANKS = [
  { value: "", label: "None" },
  { value: "A", label: "A" },
  { value: "B", label: "B" },
  { value: "C", label: "C" },
];

// Each fact the form holds, in its order, how it's typed, and how long it may be.
const FACTS: readonly {
  fact: Fact;
  kind: FieldKind;
  maxLength?: number;
  description?: string;
}[] = [
  { fact: "name", kind: "text", maxLength: 120 },
  {
    fact: "company",
    kind: "text",
    maxLength: 120,
    description: "A company already listed",
  },
  { fact: "role", kind: "text", maxLength: 120 },
  { fact: "howKnown", kind: "text", maxLength: 200 },
  {
    fact: "rank",
    kind: { choices: RANKS },
    description: "A is the closest",
  },
  { fact: "ask", kind: "text", maxLength: 300 },
  { fact: "nextStep", kind: "text", maxLength: 120 },
  { fact: "nextDate", kind: "date" },
  { fact: "notes", kind: "long", maxLength: 2000 },
];

// What a field's text saves: blank is none. A blank name stays blank, for the answer to say a
// person needs one.
function savedValue(fact: Fact, text: string): string | null {
  const trimmed = text.trim();
  return fact === "name" ? trimmed : trimmed || null;
}

function isPerson(value: unknown): value is Person {
  return (
    typeof value === "object" &&
    value !== null &&
    "id" in value &&
    "messagedOn" in value &&
    "updatedAt" in value &&
    value.updatedAt instanceof Date
  );
}

// Adds a person, or changes one (R7). A change sends only the facts edited, against the updatedAt
// read with the person, and on a conflict stays open on the person as they are now, with what was
// typed kept (R22, docs/build-plan.md KTD15). The company is picked by name from those listed.
// Added from a job, the person becomes its contact. Saved, it opens the person.
export function PersonForm({
  person,
  companies,
  companyId,
  jobId,
}: {
  person?: Person;
  companies: CompanyRef[];
  // A new person's company and job, when the form opens from one.
  companyId?: string;
  jobId?: string;
}) {
  const router = useRouter();
  const preset = companies.find(({ id }) => id === companyId)?.name ?? "";
  const fieldsOf = (shown: Person | undefined): Fields => ({
    name: shown?.name ?? "",
    company: shown ? (shown.company?.name ?? "") : preset,
    role: shown?.role ?? "",
    howKnown: shown?.howKnown ?? "",
    rank: shown?.rank ?? "",
    ask: shown?.ask ?? "",
    nextStep: shown?.nextStep ?? "",
    nextDate: shown?.nextDate ?? "",
    notes: shown?.notes ?? "",
  });
  const form = useRecordForm(person, fieldsOf, isPerson);
  const { failure } = form;
  const [companyError, setCompanyError] = useState<string>();

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const { opened, fields } = form;
    const typed = fields.company.trim().toLowerCase();
    const company = typed
      ? companies.find(({ name }) => name.toLowerCase() === typed)
      : undefined;
    if (typed && !company) {
      setCompanyError("Pick a company from the list, or add it first.");
      return;
    }
    setCompanyError(undefined);
    const saving = opened ? form.edited : FACTS.map(({ fact }) => fact);
    const facts = Object.fromEntries(
      saving.map((fact) =>
        fact === "company"
          ? ["companyId", company?.id ?? null]
          : [fact, savedValue(fact, fields[fact])],
      ),
    );
    form.save(
      () =>
        opened
          ? updatePerson({
              id: opened.id,
              updatedAt: opened.updatedAt.toISOString(),
              ...facts,
            })
          : addPerson({ ...facts, ...(jobId && { jobId }) }),
      (saved) => router.push(`/people/${saved.id}`),
    );
  }

  return (
    <form onSubmit={submit} className="flex flex-col gap-6">
      {failure?.code === "conflict" ? (
        <ConflictNotice what="the person" changes={form.changes} />
      ) : null}
      <FieldGroup>
        {FACTS.map(({ fact, kind, maxLength, description }) => (
          <FormField
            key={fact}
            id={`person-${fact}`}
            label={FIELD_LABELS[fact] ?? fact}
            kind={kind}
            value={form.fields[fact]}
            onChange={(text) => form.setField(fact, text)}
            error={
              fact === "company"
                ? (companyError ?? failure?.fields?.companyId)
                : failure?.fields?.[fact]
            }
            description={description}
            required={fact === "name"}
            maxLength={maxLength}
            list={fact === "company" ? "person-companies" : undefined}
          />
        ))}
      </FieldGroup>
      <datalist id="person-companies">
        {companies.map(({ id, name }) => (
          <option key={id} value={name} />
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
          {form.isPending ? "Saving…" : person ? "Save" : "Add person"}
        </Button>
        <Button
          variant="secondary"
          size="lg"
          nativeButton={false}
          render={<Link href={person ? `/people/${person.id}` : "/people"} />}
          className="min-h-11"
        >
          Cancel
        </Button>
      </div>
    </form>
  );
}
