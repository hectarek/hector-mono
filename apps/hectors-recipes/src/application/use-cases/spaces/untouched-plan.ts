import type { IGroceryItemsRepository } from "@/src/application/repositories/grocery-items.repository.interface";
import type { IPlanEntriesRepository } from "@/src/application/repositories/plan-entries.repository.interface";
import type { ISpacesRepository } from "@/src/application/repositories/spaces.repository.interface";
import type { ITransaction } from "@/src/entities/models/transaction.model";

// A plan nobody has used yet: no meals, no groceries, nobody else in it, no live links.
// Joining someone's plan replaces one of these without asking (ux-plan D15), since deleting
// it loses nothing.
export async function isUntouchedPlan(
  repositories: {
    spaces: ISpacesRepository;
    planEntries: IPlanEntriesRepository;
    groceryItems: IGroceryItemsRepository;
  },
  planId: string,
  tx?: ITransaction,
): Promise<boolean> {
  const { spaces, planEntries, groceryItems } = repositories;
  return (
    !(await planEntries.hasEntries(planId, tx)) &&
    !(await groceryItems.list(planId, tx)).length &&
    (await spaces.listMembers(planId, tx)).length === 1 &&
    !(await spaces.listActiveInvites(planId, tx)).length
  );
}
