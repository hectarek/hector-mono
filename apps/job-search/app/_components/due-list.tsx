import { Badge } from "@repo/ui/components/badge";
import { Button } from "@repo/ui/components/button";
import {
  Item,
  ItemActions,
  ItemContent,
  ItemDescription,
  ItemTitle,
} from "@repo/ui/components/item";
import Link from "next/link";
import type { ReactNode } from "react";
import { MarkStaleButton } from "@/app/_components/mark-stale-button";
import { NextStepSheet } from "@/app/_components/next-step-sheet";
import { PracticeReview } from "@/app/_components/practice-review";
import { formatDay } from "@/app/_lib/format-day";
import type { TodayView } from "@/src/entities/models/today.model";
import { LADDER_STEPS } from "@/src/entities/practice-ladder";

// What's due on This week (R9), each row with its one tap path: a stale candidate marks stale or
// opens; a job's or person's next step opens its sheet; a practice review opens its log.
export function DueList({
  due,
  today,
}: {
  due: TodayView["due"];
  today: string;
}) {
  return (
    <ul className="flex flex-col gap-2">
      {due.stale.map((job) => (
        <DueRow
          key={`stale-${job.id}`}
          href={`/jobs/${job.id}`}
          label={job.role}
          description={[
            job.company.name,
            job.appliedOn ? `applied ${formatDay(job.appliedOn)}` : null,
            "no reply",
          ]}
          badge="Stale?"
        >
          <MarkStaleButton jobId={job.id} />
          <Button
            variant="ghost"
            size="lg"
            nativeButton={false}
            render={<Link href={`/jobs/${job.id}`} />}
            className="min-h-11"
          >
            Open job
          </Button>
        </DueRow>
      ))}
      {due.jobs.map((job) => (
        <DueRow
          key={`job-${job.id}`}
          href={`/jobs/${job.id}`}
          label={job.role}
          description={[job.company.name, job.nextStep, dayOf(job.nextDate)]}
          badge={overdue(job.nextDate, today)}
        >
          <NextStepSheet kind="job" record={job} name={job.role} />
        </DueRow>
      ))}
      {due.people.map((person) => (
        <DueRow
          key={`person-${person.id}`}
          href={`/people/${person.id}`}
          label={person.name}
          description={[
            person.company?.name ?? null,
            person.nextStep,
            dayOf(person.nextDate),
          ]}
          badge={overdue(person.nextDate, today)}
        >
          <NextStepSheet kind="person" record={person} name={person.name} />
        </DueRow>
      ))}
      {due.practice.map(({ id, topic, nextReview }) => (
        <DueRow
          key={`practice-${id}`}
          href={`/practice/${id}`}
          label={topic}
          description={[
            `Review ${nextReview.step} of ${LADDER_STEPS}`,
            dayOf(nextReview.dueOn),
          ]}
          badge={overdue(nextReview.dueOn, today)}
        >
          <PracticeReview session={{ id, topic, step: nextReview.step }} />
        </DueRow>
      ))}
    </ul>
  );
}

function DueRow({
  href,
  label,
  description,
  badge,
  children,
}: {
  // The record's page, and what the row calls it.
  href: string;
  label: string;
  description: (string | null)[];
  badge: string | null;
  children: ReactNode;
}) {
  return (
    <li>
      <Item variant="outline">
        <ItemContent>
          <ItemTitle>
            <Link href={href} className="underline-offset-4 hover:underline">
              {label}
            </Link>
            {badge ? <Badge variant="secondary">{badge}</Badge> : null}
          </ItemTitle>
          <ItemDescription>
            {description.filter(Boolean).join(" · ")}
          </ItemDescription>
        </ItemContent>
        <ItemActions>{children}</ItemActions>
      </Item>
    </li>
  );
}

function dayOf(day: string | null): string | null {
  return day ? formatDay(day) : null;
}

function overdue(day: string | null, today: string): string | null {
  return day && day < today ? "Overdue" : null;
}
