import { AutoRefresh } from "@/app/_components/auto-refresh";
import { ClearListButton } from "@/app/_components/clear-list-button";
import { GroceryList } from "@/app/_components/grocery-list";
import { LiveList } from "@/app/_components/live-list";
import { SpaceHeader } from "@/app/_components/space-header";
import { SpaceSwitcher } from "@/app/_components/space-switcher";
import { getCurrentUserId } from "@/app/_lib/current-user";
import { loadPlans } from "@/app/_lib/load-plans";
import { firstParam, type SearchParams } from "@/app/_lib/search-params";
import { getInjection } from "@/di/container";
import { hasRole } from "@/src/entities/models/space.model";

export const dynamic = "force-dynamic";

// A plan's grocery list: the list is part of the plan and shares its people.
export default async function GroceriesPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const requested = firstParam((await searchParams).plan);

  const userId = await getCurrentUserId();
  const { plans, current } = await loadPlans(userId, requested);
  const items = await getInjection("IGetGroceryListController")(
    { spaceId: current.id },
    userId,
  );
  const canEdit = hasRole(current.role, "editor");

  return (
    <div className="flex flex-col gap-4">
      {/* Live updates (D21), with a slower refresh as the safety net when they can't connect. */}
      <LiveList planId={current.id} />
      <AutoRefresh intervalMs={60_000} />
      <SpaceSwitcher
        spaces={plans}
        currentId={current.id}
        label="Meal plans"
        hrefFor={(id) => `/groceries?plan=${id}`}
      />

      <SpaceHeader space={current} label="Grocery list">
        {/* Starting the list over (D52), keyed by plan like the list. */}
        {canEdit && (
          <ClearListButton
            key={current.id}
            spaceId={current.id}
            count={items.length}
          />
        )}
      </SpaceHeader>

      {/* Keyed by plan, so a typed item or a message never follows you to another one. */}
      <GroceryList
        key={current.id}
        spaceId={current.id}
        items={items}
        canEdit={canEdit}
      />
    </div>
  );
}
