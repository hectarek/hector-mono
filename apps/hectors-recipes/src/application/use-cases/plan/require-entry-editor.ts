import type { IPlanEntriesRepository } from "@/src/application/repositories/plan-entries.repository.interface";
import type { ISpacesRepository } from "@/src/application/repositories/spaces.repository.interface";
import { requireSpaceRole } from "@/src/application/use-cases/spaces/require-space-role";
import { NotFoundError } from "@/src/entities/errors/common";
import type { PlanEntry } from "@/src/entities/models/plan-entry.model";

export async function requireEntryEditor(
  planEntriesRepository: IPlanEntriesRepository,
  spacesRepository: ISpacesRepository,
  entryId: string,
  userId: string,
): Promise<PlanEntry> {
  const entry = await planEntriesRepository.getById(entryId);
  if (!entry) {
    throw new NotFoundError("That meal is no longer on the plan");
  }
  await requireSpaceRole(spacesRepository, {
    spaceId: entry.spaceId,
    userId,
    type: "meal-plan",
    minRole: "editor",
  });
  return entry;
}
