import { cn } from "@repo/ui/lib/utils";
import { STATUS_LABELS } from "@/app/_lib/job-labels";
import { isClosed, type JobStatus } from "@/src/entities/job-lifecycle";

// The four stages after applying, which a job's chip fills up to.
const STAGES: readonly JobStatus[] = ["applied", "screen", "onsite", "offer"];

// A job's status as a position on the track (the design system's StatusChip): four slanted
// sectors from Applied to Offer, filled up to where the job stands, beside its label. Before
// applying the sectors are empty outlines; a closed job keeps the ones it reached, greyed; an
// accepted offer fills all four in success. Color stays free for pace.
export function StatusChip({
  status,
  applied,
}: {
  status: JobStatus;
  // Whether an application went in, so a closed job shows it got that far.
  applied: boolean;
}) {
  const reached = sectorsReached(status, applied);
  const pre = status === "verify" || status === "target";
  const won = status === "offer-accepted";
  const closed = isClosed(status) && !won;

  return (
    <span
      className={cn(
        "bg-card inline-flex items-center gap-1.5 rounded-xs border px-2 py-0.5 whitespace-nowrap",
        closed ? "text-muted-foreground" : "text-foreground",
      )}
    >
      <span aria-hidden="true" className="inline-grid grid-cols-4 gap-0.5">
        {STAGES.map((stage, i) => (
          <span
            key={stage}
            className={cn(
              "h-2 w-1.5 -skew-x-18",
              won
                ? "bg-success"
                : pre
                  ? "ring-ghost ring-1 ring-inset"
                  : i < reached
                    ? closed
                      ? "bg-ghost"
                      : "bg-foreground"
                    : "bg-border",
            )}
          />
        ))}
      </span>
      <span className="font-heading font-stretch-118% text-2xs font-bold tracking-widest uppercase">
        {STATUS_LABELS[status]}
      </span>
    </span>
  );
}

function sectorsReached(status: JobStatus, applied: boolean): number {
  const stage = STAGES.indexOf(status);
  if (stage >= 0) return stage + 1;
  if (status === "offer-accepted" || status === "offer-declined") return 4;
  return applied ? 1 : 0;
}
