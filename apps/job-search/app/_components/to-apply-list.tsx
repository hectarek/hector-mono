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
import { DriverCode } from "@/app/_components/driver-code";
import { NotForMe } from "@/app/_components/not-for-me";
import { PinButton } from "@/app/_components/pin-button";
import { StatusChip } from "@/app/_components/status-chip";
import { withFrom } from "@/app/_lib/back-link";
import { formatDay } from "@/app/_lib/format-day";
import { payBand } from "@/app/_lib/format-pay";
import type { JobSummary } from "@/src/entities/models/job.model";

// The ranked list's jobs in its order (R27): the jobs page's To apply view, and the top three on
// Today. Each shows its place, its fit score, when it was posted, its posted pay and Claude's
// reason, with Pin and Not for me. A table on desktop, cards on phones (KTD19). `start` is the
// place of the first job shown, for a page after the first.
export function ToApplyList({
  jobs,
  from,
  human,
  start = 1,
}: {
  jobs: JobSummary[];
  from: string;
  human: boolean;
  start?: number;
}) {
  return (
    <>
      <div className="hidden md:block">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>#</TableHead>
              <TableHead>Job</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Fit</TableHead>
              <TableHead>Posted</TableHead>
              <TableHead>Pay</TableHead>
              <TableHead>
                <span className="sr-only">Actions</span>
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {jobs.map((job, index) => (
              <TableRow key={job.id}>
                <TableCell>
                  <span className="font-mono">{start + index}</span>
                </TableCell>
                <TableCell className="whitespace-normal">
                  <div className="flex flex-col gap-1">
                    <span className="flex flex-wrap items-center gap-2">
                      <Link
                        href={withFrom(`/jobs/${job.id}`, from)}
                        className="font-medium underline-offset-4 hover:underline"
                      >
                        {job.role}
                      </Link>
                      {job.pinnedAt ? (
                        <Badge variant="outline">Pinned</Badge>
                      ) : null}
                    </span>
                    <span className="text-muted-foreground">
                      {job.company.name}
                    </span>
                    <Reason job={job} />
                  </div>
                </TableCell>
                <TableCell>
                  <StatusChip status={job.status} applied={false} />
                </TableCell>
                <TableCell>
                  <span className="font-mono">{fitOf(job) ?? "—"}</span>
                </TableCell>
                <TableCell>{postedOf(job)}</TableCell>
                <TableCell>{payBand(job) ?? "—"}</TableCell>
                <TableCell>
                  <Actions job={job} human={human} />
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
      <ol className="flex flex-col gap-4 md:hidden">
        {jobs.map((job, index) => (
          <li key={job.id} className="flex flex-col gap-2">
            <Item
              variant="outline"
              render={<Link href={withFrom(`/jobs/${job.id}`, from)} />}
            >
              <ItemContent>
                <ItemTitle>
                  {start + index}. {job.role}
                </ItemTitle>
                <ItemDescription>
                  {[
                    job.company.name,
                    fitOf(job) && `Fit ${fitOf(job)}`,
                    postedOf(job),
                    payBand(job),
                    job.pinnedAt ? "Pinned" : null,
                  ]
                    .filter(Boolean)
                    .join(" · ")}
                </ItemDescription>
              </ItemContent>
              <ItemActions>
                <StatusChip status={job.status} applied={false} />
              </ItemActions>
            </Item>
            {/* Outside the card, which is a link. */}
            <Reason job={job} />
            <Actions job={job} human={human} />
          </li>
        ))}
      </ol>
    </>
  );
}

// Why Claude added the job, in its own words, as plain text (KTD21).
function Reason({ job }: { job: JobSummary }) {
  return job.reason ? (
    <span className="text-muted-foreground flex items-start gap-2 text-sm">
      <DriverCode actor="agent" />
      <span className="min-w-0 break-words">{job.reason}</span>
    </span>
  ) : null;
}

function Actions({ job, human }: { job: JobSummary; human: boolean }) {
  return (
    <div className="flex flex-wrap gap-2">
      <PinButton job={job} />
      <NotForMe job={job} human={human} />
    </div>
  );
}

// The fit score out of 10, when the sweep gave one.
function fitOf(job: JobSummary): string | null {
  return job.score === null ? null : `${job.score}/10`;
}

// When the posting went up, or when the job was found if the posting gave no date.
function postedOf(job: JobSummary): string {
  return job.postedOn
    ? `Posted ${formatDay(job.postedOn)}`
    : `Found ${formatDay(job.foundOn)}`;
}
