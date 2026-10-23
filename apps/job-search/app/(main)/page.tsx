import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyTitle,
} from "@repo/ui/components/empty";
import { getPageActor } from "@/app/_lib/current-actor";
import {
  formatWeekRange,
  mondayOf,
  PLAN_TIME_ZONE,
  todayIn,
} from "@/src/entities/week";

export default async function ThisWeekPage() {
  // The session first: it keeps other accounts out, and it ends the prerender, so the clock
  // is read only at request time.
  await getPageActor();
  const monday = mondayOf(todayIn(PLAN_TIME_ZONE));

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-xl font-semibold tracking-tight">This week</h1>
        <p className="text-muted-foreground text-sm">
          {formatWeekRange(monday)}
        </p>
      </div>
      <Empty>
        <EmptyHeader>
          <EmptyTitle>Nothing here yet</EmptyTitle>
          <EmptyDescription>
            What needs a decision and what&apos;s due will show here.
          </EmptyDescription>
        </EmptyHeader>
      </Empty>
    </div>
  );
}
