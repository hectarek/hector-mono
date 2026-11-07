import { cn } from "@repo/ui/lib/utils";
import Link from "next/link";
import type { ReactNode } from "react";
import { DisplayLabel } from "@/app/_components/display";
import { MarkStaleButton } from "@/app/_components/mark-stale-button";
import { NextStepSheet } from "@/app/_components/next-step-sheet";
import { ClearBoard, PitBoard } from "@/app/_components/pit-board";
import { PracticeReview } from "@/app/_components/practice-review";
import { formatDay } from "@/app/_lib/format-day";
import type { TodayView } from "@/src/entities/models/today.model";
import { LADDER_STEPS } from "@/src/entities/practice-ladder";

const DAY_MS = 24 * 60 * 60 * 1000;

// One thing due: what to do, the record it's for, the day it's due (none for a stale candidate,
// which waits on no date), and the one action that clears it.
type Task = {
  key: string;
  href: string;
  title: string;
  meta: string;
  due: string | null;
  action: ReactNode;
};

// What's due on This week (R9), as the design system's pit board and task rows: the earliest
// task goes on the board, and the rest follow earliest first, stale candidates last. Each row
// opens its record, with its one action under it: a stale candidate marks stale, a job's or
// person's next step opens its sheet, a practice review opens its log. With nothing due, the
// board says so, and points at what's waiting instead.
export function DueList({
  due,
  today,
  waiting,
}: {
  due: TodayView["due"];
  today: string;
  // How many decisions wait above, for the clear board's pointer.
  waiting: number;
}) {
  const tasks = tasksOf(due);
  if (!tasks.length) {
    return (
      <ClearBoard
        instead={
          waiting
            ? `${waiting} ${waiting === 1 ? "decision waits" : "decisions wait"} for you above.`
            : "Nothing needs a decision either."
        }
      />
    );
  }
  const next = tasks[0]?.due ? tasks[0] : undefined;
  const rest = next ? tasks.slice(1) : tasks;

  return (
    <div className="flex flex-col gap-3">
      {next ? (
        <div className="flex flex-col gap-2">
          <PitBoard
            href={next.href}
            reason={`Next up · ${when(next.due, today)}`}
            instruction={next.title}
            meta={next.meta}
          />
          {/* Keyed by its task: when the next task takes the board, its sheet starts afresh
              rather than keeping the one before's record. */}
          <div key={next.key} className="flex flex-wrap gap-2">
            {next.action}
          </div>
        </div>
      ) : null}
      {rest.length ? (
        <ul className="bg-card divide-y overflow-hidden rounded-xl border">
          {rest.map((task) => (
            <TaskRow key={task.key} task={task} today={today} />
          ))}
        </ul>
      ) : null}
    </div>
  );
}

function tasksOf(due: TodayView["due"]): Task[] {
  const dated: Task[] = [
    ...due.jobs.map((job) => ({
      key: `job-${job.id}`,
      href: `/jobs/${job.id}`,
      title: job.nextStep ?? job.role,
      meta: joined([job.nextStep ? job.role : null, job.company.name]),
      due: job.nextDate,
      action: <NextStepSheet kind="job" record={job} name={job.role} />,
    })),
    ...due.people.map((person) => ({
      key: `person-${person.id}`,
      href: `/people/${person.id}`,
      title: person.nextStep ?? person.name,
      meta: joined([
        person.nextStep ? person.name : null,
        person.company?.name ?? null,
      ]),
      due: person.nextDate,
      action: (
        <NextStepSheet kind="person" record={person} name={person.name} />
      ),
    })),
    ...due.practice.map(({ id, topic, nextReview }) => ({
      key: `practice-${id}`,
      href: `/practice/${id}`,
      title: `Review: ${topic}`,
      meta: `Review ${nextReview.step} of ${LADDER_STEPS}`,
      due: nextReview.dueOn,
      action: <PracticeReview session={{ id, topic, step: nextReview.step }} />,
    })),
  ];
  const stale: Task[] = due.stale.map((job) => ({
    key: `stale-${job.id}`,
    href: `/jobs/${job.id}`,
    title: `${job.company.name} hasn't replied`,
    meta: joined([
      job.role,
      job.appliedOn ? `Applied ${formatDay(job.appliedOn)}` : null,
    ]),
    due: null,
    action: <MarkStaleButton jobId={job.id} />,
  }));
  // Earliest first; the sort is stable, so a day's tasks keep the order above.
  return [
    ...dated.sort((a, b) => (a.due ?? "").localeCompare(b.due ?? "")),
    ...stale,
  ];
}

function TaskRow({ task, today }: { task: Task; today: string }) {
  const late = task.due !== null && task.due < today;
  return (
    <li>
      <Link
        href={task.href}
        className="hover:bg-accent focus-visible:outline-ring flex min-h-11 items-start justify-between gap-3 px-3 pt-3 pb-2 focus-visible:outline-2 focus-visible:-outline-offset-2"
      >
        <span className="flex min-w-0 flex-col">
          <span className="font-bold break-words">{task.title}</span>
          {task.meta ? (
            <span className="text-muted-foreground text-sm break-words">
              {task.meta}
            </span>
          ) : null}
        </span>
        <DisplayLabel
          className={cn("shrink-0 pt-1", late ? "text-warning" : undefined)}
        >
          {when(task.due, today)}
        </DisplayLabel>
      </Link>
      <div className="flex flex-wrap gap-2 px-3 pb-3">{task.action}</div>
    </li>
  );
}

// When a task is due, the way a task row says it: today, so many days late, or a stale
// candidate's question.
function when(due: string | null, today: string): string {
  if (due === null) return "Stale?";
  if (due >= today) return "Today";
  const days = Math.round((Date.parse(today) - Date.parse(due)) / DAY_MS);
  return `${days} ${days === 1 ? "day" : "days"} late`;
}

function joined(parts: (string | null)[]): string {
  return parts.filter(Boolean).join(" · ");
}
