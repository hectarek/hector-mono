import { cn } from "@repo/ui/lib/utils";
import { ChevronRight } from "lucide-react";
import Link from "next/link";
import type { ReactElement, ReactNode } from "react";
import { DisplayLabel } from "@/app/_components/display";
import { MarkStaleButton } from "@/app/_components/mark-stale-button";
import { NextStepSheet } from "@/app/_components/next-step-sheet";
import {
  ClearBoard,
  PIT_BOARD,
  PitBoard,
  PitBoardFace,
} from "@/app/_components/pit-board";
import { PracticeReview } from "@/app/_components/practice-review";
import { formatDay, formatWeekday } from "@/app/_lib/format-day";
import type { JobSummary } from "@/src/entities/models/job.model";
import type { PersonSummary } from "@/src/entities/models/person.model";
import type { DueSession } from "@/src/entities/models/practice-entry.model";
import type { DueJob, TodayView } from "@/src/entities/models/today.model";
import { LADDER_STEPS } from "@/src/entities/practice-ladder";

const DAY_MS = 24 * 60 * 60 * 1000;
// How many late tasks show before the rest fold under Show more.
const LATE_SHOWN = 5;
// A person's rank as the pit board ranks it, beside a company's tier: A with tier 1.
const RANK_PRIORITY: Record<string, number> = { A: 1, B: 2, C: 3 };
// A record with no tier or rank comes after every one that has one.
const UNRANKED = 4;

// A row's tap target: the whole row, 44 px or taller (the design system's TaskRow).
const ROW =
  "hover:bg-accent focus-visible:outline-ring flex min-h-11 w-full items-start gap-3 px-3 py-3 text-left focus-visible:outline-2 focus-visible:-outline-offset-2";

// A job's or a person's next step: its record, the step, when it's due, and its sheet, which its
// row or the pit board opens.
type StepTask = {
  key: string;
  kind: "Job" | "Person";
  name: string;
  step: string | null;
  due: string;
  // How much the record matters to the pit board: a job's company tier or a person's rank.
  priority: number;
  sheet: (trigger: ReactElement, face: ReactNode) => ReactNode;
};

const byDue = (a: StepTask, b: StepTask) => a.due.localeCompare(b.due);
// The pit board's pick until the timing tower's pace data exists (the UX plan's UX4): the record
// that matters most, then the earliest due.
const byPriority = (a: StepTask, b: StepTask) =>
  a.priority - b.priority || byDue(a, b);

// What's due on This week (R9, the design system's PitBoard and TaskRow): the next task on the pit
// board, then the rest in groups (late, today, stale candidates and practice reviews), each row one
// tap that opens its sheet or its record, what's due later this week, folded by weekday, and how
// many steps have no date. With nothing due, the board says so and points at what's waiting
// instead.
export function DueList({
  due,
  later,
  undated,
  today,
  waiting,
}: {
  due: TodayView["due"];
  later: TodayView["later"];
  undated: TodayView["undated"];
  today: string;
  // How many decisions wait above, for the clear board's pointer.
  waiting: number;
}) {
  const steps = [
    ...due.jobs.map((job) => jobTask(job, today)),
    ...due.people.map((person) => personTask(person, today)),
  ].sort(byDue);
  const board = [...steps].sort(byPriority)[0];
  const rest = steps.filter((task) => task !== board);
  // With no step due, the earliest practice review takes the board.
  const reviewOnBoard = board ? undefined : due.practice[0];
  const reviews = reviewOnBoard ? due.practice.slice(1) : due.practice;
  const coming = [
    ...later.jobs.map((job) => jobTask(job, today)),
    ...later.people.map((person) => personTask(person, today)),
  ].sort(byDue);

  if (!board && !reviewOnBoard && !due.stale.length) {
    return (
      <div className="flex flex-col gap-4">
        <ClearBoard
          instead={
            waiting
              ? `${waiting} ${waiting === 1 ? "decision waits" : "decisions wait"} for you above.`
              : "Nothing needs a decision either."
          }
        />
        <LaterThisWeek tasks={coming} today={today} />
        <NoDateLine undated={undated} />
      </div>
    );
  }

  const late = rest.filter(({ due: day }) => day < today);
  const onToday = rest.filter(({ due: day }) => day >= today);
  return (
    <div className="flex flex-col gap-4">
      {/* Keyed by its task: when the next task takes the board, its sheet starts afresh rather
          than keeping the one before's record. */}
      {board ? (
        <div key={board.key}>
          {board.sheet(
            <button type="button" className={PIT_BOARD} />,
            <PitBoardFace
              reason={`Next up · ${when(board.due, today)}`}
              instruction={board.step ?? board.name}
              meta={board.step ? board.name : ""}
            />,
          )}
        </div>
      ) : null}
      {reviewOnBoard ? (
        <div key={reviewOnBoard.id} className="flex flex-col gap-2">
          <PitBoard
            href={`/practice/${reviewOnBoard.id}`}
            reason={`Next up · ${when(reviewOnBoard.nextReview.dueOn, today)}`}
            instruction={`Review: ${reviewOnBoard.topic}`}
            meta={`Review ${reviewOnBoard.nextReview.step} of ${LADDER_STEPS}`}
          />
          <div className="flex flex-wrap gap-2">
            <PracticeReview session={reviewSession(reviewOnBoard)} />
          </div>
        </div>
      ) : null}
      <Group label="Late" count={late.length}>
        <StepRows tasks={late.slice(0, LATE_SHOWN)} today={today} />
        {late.length > LATE_SHOWN ? (
          <details className="group">
            <summary className="text-muted-foreground flex min-h-11 cursor-pointer items-center px-3 text-sm font-medium group-open:hidden">
              Show {late.length - LATE_SHOWN} more
            </summary>
            <StepRows tasks={late.slice(LATE_SHOWN)} today={today} />
          </details>
        ) : null}
      </Group>
      <Group label="Today" count={onToday.length}>
        <StepRows tasks={onToday} today={today} />
      </Group>
      <Group label="Stale?" count={due.stale.length}>
        <ul className="bg-card divide-y overflow-hidden rounded-xl border">
          {due.stale.map((job) => (
            <StaleRow key={job.id} job={job} />
          ))}
        </ul>
      </Group>
      <Group label="Reviews" count={reviews.length}>
        <ul className="bg-card divide-y overflow-hidden rounded-xl border">
          {reviews.map((session) => (
            <ReviewRow key={session.id} session={session} today={today} />
          ))}
        </ul>
      </Group>
      <LaterThisWeek tasks={coming} today={today} />
      <NoDateLine undated={undated} />
    </div>
  );
}

function jobTask(job: DueJob, today: string): StepTask {
  const name = joined([job.role, job.company.name]);
  const due = job.nextDate ?? today;
  return {
    key: `job-${job.id}`,
    kind: "Job",
    name,
    step: job.nextStep,
    due,
    priority: job.company.tier ?? UNRANKED,
    sheet: (trigger, face) => (
      <NextStepSheet
        kind="job"
        record={job}
        title={name}
        detail={joined([job.nextStep, when(due, today)])}
        href={`/jobs/${job.id}`}
        job={job}
        contacts={job.contacts}
        trigger={trigger}
      >
        {face}
      </NextStepSheet>
    ),
  };
}

function personTask(person: PersonSummary, today: string): StepTask {
  const name = joined([person.name, person.company?.name ?? null]);
  const due = person.nextDate ?? today;
  return {
    key: `person-${person.id}`,
    kind: "Person",
    name,
    step: person.nextStep,
    due,
    priority: (person.rank && RANK_PRIORITY[person.rank]) || UNRANKED,
    sheet: (trigger, face) => (
      <NextStepSheet
        kind="person"
        record={person}
        title={name}
        detail={joined([person.nextStep, when(due, today)])}
        href={`/people/${person.id}`}
        trigger={trigger}
      >
        {face}
      </NextStepSheet>
    ),
  };
}

const reviewSession = ({ id, topic, nextReview }: DueSession) => ({
  id,
  topic,
  step: nextReview.step,
});

// A group of due tasks under its label and count; an empty group isn't shown.
function Group({
  label,
  count,
  children,
}: {
  label: string;
  count: number;
  children: ReactNode;
}) {
  if (!count) return null;
  return (
    <section className="flex flex-col gap-2">
      <h3>
        <DisplayLabel className="text-muted-foreground">
          {label} · {count}
        </DisplayLabel>
      </h3>
      {children}
    </section>
  );
}

// Steps in rows, each one tap that opens its sheet: the record in bold, marked as a job or a
// person, with the step under it, when it's due on the right, and a chevron to say it opens.
function StepRows({ tasks, today }: { tasks: StepTask[]; today: string }) {
  if (!tasks.length) return null;
  return (
    <ul className="bg-card divide-y overflow-hidden rounded-xl border">
      {tasks.map((task) => (
        <li key={task.key}>
          {task.sheet(
            <button type="button" className={ROW} />,
            <RowFace
              name={task.name}
              meta={joined([task.kind, task.step])}
              when={when(task.due, today)}
              late={task.due < today}
            />,
          )}
        </li>
      ))}
    </ul>
  );
}

function RowFace({
  name,
  meta,
  when: label,
  late,
}: {
  name: string;
  meta: string;
  when: string;
  late: boolean;
}) {
  return (
    <>
      <span className="flex min-w-0 flex-1 flex-col">
        <span className="font-bold break-words">{name}</span>
        <span className="text-muted-foreground text-sm break-words">
          {meta}
        </span>
      </span>
      <DisplayLabel
        className={cn("shrink-0 pt-1", late ? "text-warning" : undefined)}
      >
        {label}
      </DisplayLabel>
      <ChevronRight
        aria-hidden="true"
        className="text-muted-foreground mt-0.5 size-4 shrink-0"
      />
    </>
  );
}

// A stale candidate: its row opens the job, and Mark stale sits on its own line under it.
function StaleRow({ job }: { job: JobSummary }) {
  return (
    <li>
      <Link href={`/jobs/${job.id}`} className={ROW}>
        <RowFace
          name={`${job.company.name} hasn't replied`}
          meta={joined([
            job.role,
            job.appliedOn ? `Applied ${formatDay(job.appliedOn)}` : null,
          ])}
          when="Stale?"
          late={false}
        />
      </Link>
      <div className="flex flex-wrap gap-2 px-3 pb-3">
        <MarkStaleButton jobId={job.id} />
      </div>
    </li>
  );
}

// A practice review due: its row opens the session, and Log review sits on its own line under it.
function ReviewRow({ session, today }: { session: DueSession; today: string }) {
  return (
    <li>
      <Link href={`/practice/${session.id}`} className={ROW}>
        <RowFace
          name={`Review: ${session.topic}`}
          meta={`Review ${session.nextReview.step} of ${LADDER_STEPS}`}
          when={when(session.nextReview.dueOn, today)}
          late={session.nextReview.dueOn < today}
        />
      </Link>
      <div className="flex flex-wrap gap-2 px-3 pb-3">
        <PracticeReview session={reviewSession(session)} />
      </div>
    </li>
  );
}

// What's due after today, through Sunday, folded until it's opened, by weekday (R9 as revised
// 2026-11-07).
function LaterThisWeek({ tasks, today }: { tasks: StepTask[]; today: string }) {
  if (!tasks.length) return null;
  const days = [...new Set(tasks.map(({ due }) => due))];
  return (
    <details className="flex flex-col gap-2">
      <summary className="flex min-h-11 cursor-pointer items-center">
        <DisplayLabel className="text-muted-foreground">
          Later this week · {tasks.length}
        </DisplayLabel>
      </summary>
      <div className="flex flex-col gap-3">
        {days.map((day) => (
          <section key={day} className="flex flex-col gap-2">
            <h3>
              <DisplayLabel className="text-muted-foreground">
                {formatWeekday(day)}
              </DisplayLabel>
            </h3>
            <StepRows
              tasks={tasks.filter(({ due }) => due === day)}
              today={today}
            />
          </section>
        ))}
      </div>
    </details>
  );
}

// How many next steps have no date, so never show as due, each count a link to the list that
// dates them in one tap (R9 as revised 2026-11-07, the UX plan's UX6).
function NoDateLine({ undated }: { undated: TodayView["undated"] }) {
  const { people, jobs } = undated;
  if (!people && !jobs) return null;
  return (
    <p className="flex flex-wrap items-center gap-x-4">
      <DisplayLabel className="text-muted-foreground">No date</DisplayLabel>
      {people ? (
        <Link
          href="/people?view=no-date"
          aria-label={`${counted(people, "person", "people")} whose next step has no date`}
          className={COUNT_LINK}
        >
          {counted(people, "person", "people")}
        </Link>
      ) : null}
      {jobs ? (
        <Link
          href="/jobs?view=no-date"
          aria-label={`${counted(jobs, "job", "jobs")} whose next step has no date`}
          className={COUNT_LINK}
        >
          {counted(jobs, "job", "jobs")}
        </Link>
      ) : null}
    </p>
  );
}

const COUNT_LINK =
  "inline-flex min-h-11 items-center text-sm font-medium underline underline-offset-4";

const counted = (count: number, one: string, many: string) =>
  `${count} ${count === 1 ? one : many}`;

// When a task is due, the way a row says it: so many days late, today, or a later day's weekday.
function when(due: string, today: string): string {
  if (due === today) return "Today";
  if (due > today) return formatWeekday(due, true);
  const days = Math.round((Date.parse(today) - Date.parse(due)) / DAY_MS);
  return `${days} ${days === 1 ? "day" : "days"} late`;
}

function joined(parts: (string | null)[]): string {
  return parts.filter(Boolean).join(" · ");
}
