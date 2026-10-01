import type { ISpacesRepository } from "@/src/application/repositories/spaces.repository.interface";
import { NotFoundError, UnauthorizedError } from "@/src/entities/errors/common";
import {
  hasRole,
  type SpaceRole,
  type SpaceType,
} from "@/src/entities/models/space.model";
import type { ITransaction } from "@/src/entities/models/transaction.model";

// The single access check for anything that lists or writes a space's contents.
export async function requireSpaceRole(
  spacesRepository: ISpacesRepository,
  check: {
    spaceId: string;
    userId: string;
    type: SpaceType;
    minRole: SpaceRole;
  },
  tx?: ITransaction,
): Promise<SpaceRole> {
  const access = await spacesRepository.getAccess(
    check.spaceId,
    check.userId,
    tx,
  );

  if (!access || access.type !== check.type) {
    throw new NotFoundError("Space not found");
  }

  if (!access.role || !hasRole(access.role, check.minRole)) {
    throw new UnauthorizedError("You do not have access to this space");
  }

  return access.role;
}
