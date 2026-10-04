import { Button } from "@repo/ui/components/button";
import { ChevronLeft, ChevronRight } from "lucide-react";
import Link from "next/link";
import { AddPlanToListButton } from "@/app/_components/add-plan-to-list-button";
import { MakeDefaultButton } from "@/app/_components/make-default-button";
import { PlanWeek } from "@/app/_components/plan-week";
import { SpaceHeader } from "@/app/_components/space-header";
import { SpaceSwitcher } from "@/app/_components/space-switcher";
import { StartOwnPlanButton } from "@/app/_components/start-own-plan-button";
import { getCurrentUserId } from "@/app/_lib/current-user";
import { loadPlans } from "@/app/_lib/load-plans";
import { firstParam, type SearchParams } from "@/app/_lib/search-params";
import { getInjection } from "@/di/container";
import { hasRole } from "@/src/entities/models/space.model";
import {
  addDays,
  formatDay,
  formatWeekRange,
  isIsoDate,
  mondayOf,
  PLAN_TIME_ZONE,
  todayIn,
  weekDates,
} from "@/src/entities/week";

export const dynamic = "force-dynamic";

export default async function PlanPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const params = await searchParams;
  const requestedWeek = firstParam(params.week);
  const requestedPlan = firstParam(params.plan);

  const today = todayIn(PLAN_TIME_ZONE);
  const monday = mondayOf(
    requestedWeek && isIsoDate(requestedWeek) ? requestedWeek : today,
  );

  const userId = await getCurrentUserId();
  const { plans, current } = await loadPlans(userId, requestedPlan);
  const canEdit = hasRole(current.role, "editor");

  const [entries, cookDaysToAdd] = await Promise.all([
    getInjection("IGetWeekPlanController")(
      { spaceId: current.id, date: monday },
      userId,
    ),
    canEdit
      ? getInjection("IListMealsToAddController")(
          { planId: current.id },
          userId,
        )
      : Promise.resolve([]),
  ]);

  const planParam = requestedPlan ? `&plan=${requestedPlan}` : "";
  const weekHref = (date: string) => `/plan?week=${date}${planParam}`;
  const isThisWeek = monday === mondayOf(today);

  return (
    <div className="flex flex-col gap-4">
      <SpaceSwitcher
        spaces={plans}
        currentId={current.id}
        label="Meal plans"
        hrefFor={(id) => `/plan?plan=${id}&week=${monday}`}
      />

      {/* In the ⋯ sheet (D42). In more than one plan: which one Plan and Groceries open to
          (D14). Only in someone else's: a way to start their own (D16). */}
      <SpaceHeader space={current}>
        {plans.length > 1 &&
          (current.isDefault ? (
            <p className="text-muted-foreground text-center text-sm">
              Your default plan: Plan and Groceries open to it.
            </p>
          ) : (
            <MakeDefaultButton type="meal-plan" spaceId={current.id} />
          ))}
        {!plans.some((plan) => plan.role === "owner") && <StartOwnPlanButton />}
      </SpaceHeader>

      <nav
        aria-label="Week"
        className="flex items-center justify-between gap-2"
      >
        <Button
          variant="secondary"
          size="icon-lg"
          nativeButton={false}
          render={
            <Link
              href={weekHref(addDays(monday, -7))}
              aria-label="Previous week"
            />
          }
        >
          <ChevronLeft />
        </Button>
        <div className="flex flex-col items-center">
          <span className="text-sm font-medium">{formatWeekRange(monday)}</span>
          {isThisWeek && (
            <span className="text-muted-foreground text-xs">This week</span>
          )}
        </div>
        <Button
          variant="secondary"
          size="icon-lg"
          nativeButton={false}
          render={
            <Link href={weekHref(addDays(monday, 7))} aria-label="Next week" />
          }
        >
          <ChevronRight />
        </Button>
      </nav>
      {!isThisWeek && (
        <Button
          variant="secondary"
          size="lg"
          nativeButton={false}
          render={<Link href={weekHref(today)} />}
          className="self-center"
        >
          Back to this week
        </Button>
      )}

      <PlanWeek
        today={today}
        canEdit={canEdit}
        entries={entries}
        days={weekDates(monday).map((date) => ({
          date,
          ...formatDay(date),
          isToday: date === today,
          isPast: date < today,
        }))}
      />

      {/* Planning starts from a recipe (D40); with no button for it (D50), an empty week
          says how. */}
      {canEdit && entries.length === 0 && (
        <p className="text-muted-foreground text-center text-sm">
          Nothing planned this week. To plan a meal, open a recipe and tap Add
          to plan.
        </p>
      )}

      {/* Under the week (D50): the planned meals in a range not on the list yet (D41, D44);
          with none, it says so, with the way to the list. Always there for an editor, so a
          press's result isn't lost when nothing is left to add. Keyed by plan, so its message
          doesn't follow you. */}
      {canEdit && (
        <AddPlanToListButton
          key={current.id}
          planId={current.id}
          today={today}
          cookDays={cookDaysToAdd}
        />
      )}
    </div>
  );
}
