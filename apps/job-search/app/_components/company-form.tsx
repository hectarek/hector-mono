"use client";

import { Alert, AlertDescription, AlertTitle } from "@repo/ui/components/alert";
import { Button } from "@repo/ui/components/button";
import {
  Field,
  FieldDescription,
  FieldError,
  FieldGroup,
  FieldLabel,
  FieldTitle,
} from "@repo/ui/components/field";
import { Input } from "@repo/ui/components/input";
import { Textarea } from "@repo/ui/components/textarea";
import { ToggleGroup, ToggleGroupItem } from "@repo/ui/components/toggle-group";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { type FormEvent, useState, useTransition } from "react";
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

// Each fact the form holds, in its order, and how it's typed.
const FACTS: readonly {
  fact: Fact;
  input: "text" | "url" | "number" | "tier" | "long";
  description?: string;
}[] = [
  { fact: "name", input: "text" },
  { fact: "website", input: "url" },
  { fact: "location", input: "text", description: "Where it's based" },
  { fact: "industry", input: "text" },
  {
    fact: "headcount",
    input: "number",
    description: "About how many people work there",
  },
  { fact: "tier", input: "tier", description: "1 is the most wanted" },
  { fact: "officePolicy", input: "text" },
  { fact: "leavePolicy", input: "text" },
  { fact: "researchSummary", input: "long" },
  {
    fact: "researchRef",
    input: "text",
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
        <Alert>
          <AlertTitle>Changed since you opened it</AlertTitle>
          <AlertDescription>
            <p>
              The form shows the company as it is now, with your edits kept.
              Save to keep them.
            </p>
            <ul>
              {changedSince.map((fact) => (
                <li key={fact}>
                  {FIELD_LABELS[fact]} is now {now[fact] || "empty"}
                </li>
              ))}
            </ul>
          </AlertDescription>
        </Alert>
      ) : null}
      <FieldGroup>
        {FACTS.map(({ fact, input, description }) => {
          const error = failure?.fields?.[fact];
          const id = `company-${fact}`;
          return (
            <Field key={fact} data-invalid={error ? true : undefined}>
              {/* A label names one control; the tier's buttons are a group, which a title names. */}
              {input === "tier" ? (
                <FieldTitle id={id}>{FIELD_LABELS[fact]}</FieldTitle>
              ) : (
                <FieldLabel htmlFor={id}>{FIELD_LABELS[fact]}</FieldLabel>
              )}
              {input === "tier" ? (
                <ToggleGroup
                  aria-labelledby={id}
                  variant="outline"
                  value={[fields.tier]}
                  onValueChange={([tier]) => set("tier", tier ?? "")}
                >
                  {["", "1", "2", "3"].map((tier) => (
                    <ToggleGroupItem
                      key={tier}
                      value={tier}
                      className="min-h-11 min-w-11"
                    >
                      {tier || "None"}
                    </ToggleGroupItem>
                  ))}
                </ToggleGroup>
              ) : input === "long" ? (
                <Textarea
                  id={id}
                  value={fields[fact]}
                  onChange={(event) => set(fact, event.target.value)}
                  maxLength={MAX_LENGTH[fact]}
                  aria-invalid={error ? true : undefined}
                />
              ) : (
                <Input
                  id={id}
                  type={input === "url" ? "url" : "text"}
                  inputMode={input === "number" ? "numeric" : undefined}
                  value={fields[fact]}
                  onChange={(event) => set(fact, event.target.value)}
                  required={fact === "name"}
                  maxLength={MAX_LENGTH[fact]}
                  aria-invalid={error ? true : undefined}
                  className="min-h-11"
                />
              )}
              {description ? (
                <FieldDescription>{description}</FieldDescription>
              ) : null}
              {error ? <FieldError>{error}</FieldError> : null}
            </Field>
          );
        })}
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
