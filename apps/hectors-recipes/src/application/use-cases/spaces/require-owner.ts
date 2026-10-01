import type { ISpacesRepository } from "@/src/application/repositories/spaces.repository.interface";
import { requireSpaceRole } from "@/src/application/use-cases/spaces/require-space-role";
import { NotFoundError } from "@/src/entities/errors/common";
import type { Space } from "@/src/entities/models/space.model";

// For operations on a space of any type that only its owner may perform.
export async function requireOwner(
  spacesRepository: ISpacesRepository,
  spaceId: string,
  userId: string,
): Promise<Space> {
  const space = await spacesRepository.getById(spaceId);
  if (!space) {
    throw new NotFoundError("Space not found");
  }
  await requireSpaceRole(spacesRepository, {
    spaceId,
    userId,
    type: space.type,
    minRole: "owner",
  });
  return space;
}
