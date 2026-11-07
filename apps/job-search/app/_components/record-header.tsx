import type { ReactNode } from "react";
import { DisplayLabel, RecordTitle } from "@/app/_components/display";
import { DriverCode } from "@/app/_components/driver-code";
import { formatDay } from "@/app/_lib/format-day";
import type { RecordAdded } from "@/src/entities/models/activity.model";
import { PLAN_TIME_ZONE, todayIn } from "@/src/entities/week";

// The design system's RecordHeader, at the top of a job's, a person's or a company's page (the UX
// plan's UX8): what the record is, who added it and when, its name in Atkinson (a real name), its
// key facts on one line, its status and its actions.
export function RecordHeader({
  kind,
  added,
  name,
  facts,
  status,
  actions,
}: {
  kind: string;
  added: RecordAdded;
  name: string;
  // The facts line, joined with middle dots by the page.
  facts?: ReactNode;
  status?: ReactNode;
  actions: ReactNode;
}) {
  return (
    <header className="flex flex-col gap-2">
      <div className="text-muted-foreground flex flex-wrap items-center gap-2">
        <DisplayLabel>{kind}</DisplayLabel>
        {added ? (
          <>
            <DriverCode actor={added.by} />
            <span className="text-sm">
              added {formatDay(todayIn(PLAN_TIME_ZONE, added.at))}
            </span>
          </>
        ) : null}
      </div>
      <RecordTitle className="break-words">{name}</RecordTitle>
      {facts ? (
        <p className="text-muted-foreground text-sm break-words">{facts}</p>
      ) : null}
      {status ? (
        <div className="flex flex-wrap items-center gap-2">{status}</div>
      ) : null}
      <div className="flex flex-wrap items-center gap-2">{actions}</div>
    </header>
  );
}

// Parts of a facts line, the empty ones left out, joined with middle dots.
export function factsLine(parts: (string | null | undefined)[]): string {
  return parts.filter(Boolean).join(" · ");
}
