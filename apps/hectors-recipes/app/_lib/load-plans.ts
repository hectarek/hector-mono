import { notFound } from "next/navigation";
import { getInjection } from "@/di/container";
import {
  pickDefaultSpace,
  type SpaceWithRole,
} from "@/src/entities/models/space.model";

// The plans this user is in and the one to show (with its grocery list): ?plan= if they're a
// member, else the default, where a shared one beats their own. A personal plan is only
// created when they're in none, so joining someone's shared plan never leaves an empty one
// behind.
export async function loadPlans(
  userId: string | undefined,
  requestedId: string | undefined,
): Promise<{ plans: SpaceWithRole[]; current: SpaceWithRole }> {
  const list = () =>
    getInjection("IListMySpacesController")({ type: "meal-plan" }, userId);

  let plans = await list();
  if (!plans.length) {
    await getInjection("IEnsurePersonalSpaceController")("meal-plan", userId);
    plans = await list();
  }

  const current = requestedId
    ? plans.find((plan) => plan.id === requestedId)
    : pickDefaultSpace(plans);
  if (!current) {
    notFound();
  }
  return { plans, current };
}
