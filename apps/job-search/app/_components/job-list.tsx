import { Badge } from "@repo/ui/components/badge";
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
import { formatDay } from "@/app/_lib/format-day";
import { DISMISS_LABELS, STATUS_LABELS } from "@/app/_lib/job-labels";
import type { JobSummary } from "@/src/entities/models/job.model";

// A page of jobs: a table on desktop, cards on phones (docs/build-plan.md KTD19). A dismissed
// proposal shows why in place of its next step.
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
                <TableCell>{STATUS_LABELS[job.status]}</TableCell>
                <TableCell>{next(job) ?? "—"}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
      <ul className="flex flex-col gap-2 md:hidden">
        {jobs.map((job) => (
          <li key={job.id}>
            <Item variant="outline" render={<Link href={`/jobs/${job.id}`} />}>
              <ItemContent>
                <ItemTitle>{job.role}</ItemTitle>
                <ItemDescription>
                  {[job.company.name, next(job)].filter(Boolean).join(" · ")}
                </ItemDescription>
              </ItemContent>
              <ItemActions>
                <Badge variant="secondary">{STATUS_LABELS[job.status]}</Badge>
              </ItemActions>
            </Item>
          </li>
        ))}
      </ul>
    </>
  );
}

// What's next for a job: its next step and when, or why it was dismissed.
function next(job: JobSummary): string | null {
  if (job.reviewState === "dismissed") {
    return job.dismissReason ? DISMISS_LABELS[job.dismissReason] : null;
  }
  const due = job.nextDate ? formatDay(job.nextDate) : null;
  return [job.nextStep, due].filter(Boolean).join(", due ") || null;
}
