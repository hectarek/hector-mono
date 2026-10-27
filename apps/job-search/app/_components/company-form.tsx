"use client";

import { Button } from "@repo/ui/components/button";
import { FieldGroup } from "@repo/ui/components/field";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { type FormEvent, useState, useTransition } from "react";
import { ConflictNotice } from "@/app/_components/conflict-notice";
import { type FieldKind, FormField } from "@/app/_components/form-field";
import { callAction } from "@/app/_lib/call-action";
import { FIELD_LABELS } from "@/app/_lib/field-labels";
import { editedFields, rebased } from "@/app/_lib/form-changes";
import { saveCompany } from "@/app/actions/companies";
import type { ActionResult } from "@/app/actions/shared";
import type {
  Company,
  CompanyFacts,
} from "@/src/entities/models/company.model";

type Fact = keyof CompanyFacts;
type Fields = Record<Fact, string>;
type Failure = Extract<ActionResult<unknown>, { ok: false }>;

const TIERS = [
  { value: "", label: "None" },
  { value: "1", label: "1" },
  { value: "2", label: "2" },
  { value: "3", label: "3" },
];

// Each fact the form holds, in its order, and how it's typed.
const FACTS: readonly {
  fact: Fact;
  kind: FieldKind;
  description?: string;
}[] = [
  { fact: "name", kind: "text" },
  { fact: "website", kind: "url" },
  { fact: "location", kind: "text", description: "Where it's based" },
  { fact: "industry", kind: "text" },
  {
    fact: "headcount",
    kind: "number",
    description: "About how many people work there",
  },
  {
    fact: "tier",
    kind: { choices: TIERS },
    description: "1 is the most wanted",
  },
  { fact: "officePolicy", kind: "text" },
  { fact: "leavePolicy", kind: "text" },
  { fact: "researchSummary", kind: "long" },
  {
    fact: "researchRef",
    kind: "text",
    description: "Where the long-form research is kept",
  },
];

const MAX_LENGTH: Partial<Record<Fact, number>> = {
  name: 120,
  website: 300,
  location: 120,
  industry: 80,
  officePolicy: 200,
  leavePolicy: 200,
  researchSummary: 2000,
  researchRef: 300,
};

// A company's facts as the form's text, blank for none.
function fieldsOf(company: Company | undefined): Fields {
  return Object.fromEntries(
    FACTS.map(({ fact }) => [fact, String(company?.[fact] ?? "")]),
  ) as Fields;
}

// What a field's text saves: blank is none, and headcount and tier are numbers. A blank name stays
// blank, for the answer to say a company needs one.
function savedValue(fact: Fact, text: string): string | number | null {
  const trimmed = text.trim();
  if (fact === "name") {
    return trimmed;
  }
  if (!trimmed) {
    return null;
  }
  return fact === "headcount" || fact === "tier" ? Number(trimmed) : trimmed;
}

function isCompany(value: unknown): value is Company {
  return (
    typeof value === "object" &&
    value !== null &&
    "id" in value &&
    "updatedAt" in value &&
    value.updatedAt instanceof Date
  );
}

// Adds a company, or changes one (R4). A change sends only the facts edited, against the
// updatedAt read with the company, and on a conflict stays open on the company as it is now,
// with what was typed kept (R22, docs/build-plan.md KTD15). Saved, it opens the company.
export function CompanyForm({ company }: { company?: Company }) {
  const router = useRouter();
  const [opened, setOpened] = useState(company);
  const [fields, setFields] = useState(() => fieldsOf(company));
  const [failure, setFailure] = useState<Failure>();
  const [changedSince, setChangedSince] = useState<Fact[]>([]);
  const [isPending, startTransition] = useTransition();

  function set(fact: Fact, text: string) {
    setFields((typed) => ({ ...typed, [fact]: text }));
  }

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const saving = opened
      ? editedFields(fields, fieldsOf(opened))
      : FACTS.map(({ fact }) => fact);
    const facts = Object.fromEntries(
      saving.map((fact) => [fact, savedValue(fact, fields[fact])]),
    );
    const input = opened
      ? { id: opened.id, updatedAt: opened.updatedAt.toISOString(), ...facts }
      : facts;
    startTransition(async () => {
      const result = await callAction(() => saveCompany(input));
      if (result.ok) {
        router.push(`/companies/${result.data.company.id}`);
        return;
      }
      setFailure(result);
      if (result.code === "conflict" && opened && isCompany(result.current)) {
        const now = rebased(fields, fieldsOf(opened), fieldsOf(result.current));
        setFields(now.fields);
        setChangedSince(now.changed);
        setOpened(result.current);
      }
    });
  }

  const now = fieldsOf(opened);

  return (
    <form onSubmit={submit} className="flex flex-col gap-6">
      {failure?.code === "conflict" ? (
        <ConflictNotice
          what="the company"
          changes={changedSince.map((fact) => ({
            label: FIELD_LABELS[fact] ?? fact,
            now: now[fact],
          }))}
        />
      ) : null}
      <FieldGroup>
        {FACTS.map(({ fact, kind, description }) => (
          <FormField
            key={fact}
            id={`company-${fact}`}
            label={FIELD_LABELS[fact] ?? fact}
            kind={kind}
            value={fields[fact]}
            onChange={(text) => set(fact, text)}
            error={failure?.fields?.[fact]}
            description={description}
            required={fact === "name"}
            maxLength={MAX_LENGTH[fact]}
          />
        ))}
      </FieldGroup>
      {failure && failure.code !== "conflict" ? (
        <p role="alert" className="text-destructive text-sm">
          {failure.message}
        </p>
      ) : null}
      <div className="flex flex-wrap gap-2">
        <Button
          type="submit"
          size="lg"
          disabled={isPending}
          className="min-h-11"
        >
          {isPending ? "Saving…" : company ? "Save" : "Add company"}
        </Button>
        <Button
          variant="secondary"
          size="lg"
          nativeButton={false}
          render={
            <Link href={company ? `/companies/${company.id}` : "/companies"} />
          }
          className="min-h-11"
        >
          Cancel
        </Button>
      </div>
    </form>
  );
}
