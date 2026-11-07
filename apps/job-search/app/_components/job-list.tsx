import {
  Item,
  ItemActions,
  ItemContent,
  ItemDescription,
  ItemTitle,
} from "@repo/ui/components/item";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@repo/ui/components/table";
import Link from "next/link";
import { DateChips } from "@/app/_components/date-chips";
import { StatusChip } from "@/app/_components/status-chip";
import { formatDay } from "@/app/_lib/format-day";
import { DISMISS_LABELS } from "@/app/_lib/job-labels";
import { isClosed } from "@/src/entities/job-lifecycle";
import type { JobSummary } from "@/src/entities/models/job.model";

// A page of jobs: a table on desktop, cards on phones (docs/build-plan.md KTD19), each job's status
// as the design system's status chip. A dismissed proposal shows why in place of its next step.
export function JobList({ jobs }: { jobs: JobSummary[] }) {
  return (
    <>
      <div className="hidden md:block">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Role</TableHead>
              <TableHead>Company</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Next</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {jobs.map((job) => (
              <TableRow key={job.id}>
                <TableCell>
                  <Link
                    href={`/jobs/${job.id}`}
                    className="font-medium underline-offset-4 hover:underline"
                  >
                    {job.role}
                  </Link>
                </TableCell>
                <TableCell>{job.company.name}</TableCell>
                <TableCell>
                  <StatusChip
                    status={job.status}
                    applied={job.appliedOn !== null}
                  />
                </TableCell>
                <TableCell>
                  <div className="flex flex-col gap-2">
                    <span>{next(job) ?? "—"}</span>
                    <JobDateChips job={job} />
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
      <ul className="flex flex-col gap-2 md:hidden">
        {jobs.map((job) => (
          <li key={job.id} className="flex flex-col gap-2">
            <Item variant="outline" render={<Link href={`/jobs/${job.id}`} />}>
              <ItemContent>
                <ItemTitle>{job.role}</ItemTitle>
                <ItemDescription>
                  {[job.company.name, next(job)].filter(Boolean).join(" · ")}
                </ItemDescription>
              </ItemContent>
              <ItemActions>
                <StatusChip
                  status={job.status}
                  applied={job.appliedOn !== null}
                />
              </ItemActions>
            </Item>
            {/* Outside the card, which is a link. */}
            <JobDateChips job={job} />
          </li>
        ))}
      </ul>
    </>
  );
}

// An open job's step with no date gets one-tap date chips, so it can join This week (the UX plan's
// UX6). A proposal waits on Hector's review, which sets its step.
function JobDateChips({ job }: { job: JobSummary }) {
  return job.reviewState === "accepted" &&
    !isClosed(job.status) &&
    job.nextStep &&
    !job.nextDate ? (
    <DateChips kind="job" record={job} name={job.role} />
  ) : null;
}

// What's next for a job: its next step and when, or why it was dismissed.
function next(job: JobSummary): string | null {
  if (job.reviewState === "dismissed") {
    return job.dismissReason ? DISMISS_LABELS[job.dismissReason] : null;
  }
  const due = job.nextDate ? formatDay(job.nextDate) : null;
  return [job.nextStep, due].filter(Boolean).join(", due ") || null;
}
