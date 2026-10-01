import type { IGroceryItemsRepository } from "@/src/application/repositories/grocery-items.repository.interface";
import type { ISpacesRepository } from "@/src/application/repositories/spaces.repository.interface";
import { requireSpaceRole } from "@/src/application/use-cases/spaces/require-space-role";
import { NotFoundError } from "@/src/entities/errors/common";
import type { GroceryItem } from "@/src/entities/models/grocery-item.model";

export async function requireItemEditor(
  groceryItemsRepository: IGroceryItemsRepository,
  spacesRepository: ISpacesRepository,
  itemId: string,
  userId: string,
): Promise<GroceryItem> {
  const item = await groceryItemsRepository.getById(itemId);
  if (!item) {
    throw new NotFoundError("That item is no longer on the list");
  }
  await requireSpaceRole(spacesRepository, {
    spaceId: item.spaceId,
    userId,
    type: "meal-plan",
    minRole: "editor",
  });
  return item;
}
