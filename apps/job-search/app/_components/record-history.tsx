import { SectionTitle } from "@/app/_components/display";
import { DriverCode } from "@/app/_components/driver-code";
import { getPageActor } from "@/app/_lib/current-actor";
import { fieldLabel } from "@/app/_lib/field-labels";
import { getInjection } from "@/di/container";
import {
  ACTIVITY_PAGE_MAX,
  type ActivityEntry,
  type FieldChange,
  type RecordRef,
} from "@/src/entities/models/activity.model";
import { PLAN_TIME_ZONE } from "@/src/entities/week";

const ACTIONS: Record<ActivityEntry["action"], string> = {
  created: "Created",
  updated: "Updated",
  deleted: "Deleted",
  refused: "Refused",
};

// Eastern time, as everywhere in the app (docs/build-plan.md KTD18).
const WHEN = new Intl.DateTimeFormat("en-US", {
  timeZone: PLAN_TIME_ZONE,
  month: "short",
  day: "numeric",
  hour: "numeric",
  minute: "2-digit",
});

// A record's history (R19), as the design system's timing feed: its changes, newest first, each
// with when, who made it (a driver code), the page tool when one did, and each field it changed,
// before and after. The company, job, settings and person
// pages mount it (U5 to U7). It shows the latest ACTIVITY_PAGE_MAX changes; list_activity pages through more.
export async function RecordHistory({ record }: { record: RecordRef }) {
  const actor = await getPageActor();
  const { entries } = await getInjection("IListActivityController")(
    { record, limit: ACTIVITY_PAGE_MAX },
    actor,
  );

  return (
    <section aria-labelledby="record-history" className="flex flex-col gap-2">
      <SectionTitle id="record-history">History</SectionTitle>
      {entries.length ? (
        <ol className="bg-card flex flex-col divide-y rounded-xl border px-3">
          {entries.map((entry) => (
            <HistoryEntry key={entry.id} entry={entry} />
          ))}
        </ol>
      ) : (
        <p className="text-muted-foreground text-sm">No changes yet.</p>
      )}
    </section>
  );
}

function HistoryEntry({ entry }: { entry: ActivityEntry }) {
  return (
    <li className="flex flex-col gap-1.5 py-3 text-sm sm:flex-row sm:items-start sm:gap-3">
      <div className="flex shrink-0 items-center gap-2 sm:w-40 sm:justify-between">
        <time
          dateTime={entry.createdAt.toISOString()}
          className="text-muted-foreground text-2xs font-mono"
        >
          {WHEN.format(entry.createdAt)}
        </time>
        <DriverCode actor={entry.actor} />
      </div>
      <div className="flex min-w-0 flex-1 flex-col gap-1.5">
        <p className="flex flex-wrap items-baseline gap-x-2">
          <span
            className={
              entry.action === "refused"
                ? "text-destructive font-bold"
                : "font-bold"
            }
          >
            {ACTIONS[entry.action]}
          </span>
          {entry.tool ? (
            <code className="text-muted-foreground font-mono text-xs break-all">
              {entry.tool}
            </code>
          ) : null}
        </p>
        <HistoryDetails entry={entry} />
      </div>
    </li>
  );
}

// What an entry changed, field by field, and its reason.
function HistoryDetails({ entry }: { entry: ActivityEntry }) {
  return (
    <>
      {entry.changes.length ? (
        <dl className="flex flex-col gap-1">
          {entry.changes.map((change) => (
            <div key={change.field} className="flex flex-wrap gap-x-2">
              <dt className="text-muted-foreground">
                {fieldLabel(change.field)}
              </dt>
              <dd className="min-w-0 break-words">
                <BeforeAndAfter change={change} />
              </dd>
            </div>
          ))}
        </dl>
      ) : null}
      {entry.reason ? (
        <p className="text-muted-foreground">
          {entry.action === "refused"
            ? `Tried to ${entry.reason.replaceAll("-", " ")}`
            : `Reason: ${entry.reason}`}
        </p>
      ) : null}
    </>
  );
}

// The old value struck through, then the new one. A field that was set from nothing shows only
// its new value, and one that was cleared only its old one.
function BeforeAndAfter({
  change: { before, after },
}: {
  change: FieldChange;
}) {
  return (
    <>
      {before === null ? null : (
        <del className="text-muted-foreground">{shown(before)}</del>
      )}
      {before === null || after === null ? null : (
        <span aria-hidden="true"> → </span>
      )}
      {after === null ? null : (
        <ins className="no-underline">{shown(after)}</ins>
      )}
    </>
  );
}

function shown(value: unknown): string {
  if (Array.isArray(value)) {
    return value.map(shown).join(", ");
  }
  return typeof value === "object" ? JSON.stringify(value) : String(value);
}
