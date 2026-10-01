import type {
  CreateSpaceInput,
  InviteRole,
  Space,
  SpaceAccess,
  SpaceInvite,
  SpaceMember,
  SpaceRole,
  SpaceType,
  SpaceWithRole,
} from "@/src/entities/models/space.model";
import type { ITransaction } from "@/src/entities/models/transaction.model";

export interface ISpacesRepository {
  // Inserts the space and its owner membership; pass a transaction so both land together.
  create(
    input: CreateSpaceInput,
    ownerId: string,
    tx?: ITransaction,
  ): Promise<Space>;
  getById(spaceId: string, tx?: ITransaction): Promise<Space | undefined>;
  getAccess(
    spaceId: string,
    userId: string,
    tx?: ITransaction,
  ): Promise<SpaceAccess | undefined>;
  findOwned(
    userId: string,
    type: SpaceType,
    tx?: ITransaction,
  ): Promise<Space | undefined>;
  // Marks the one they chose to open to (isDefault).
  listForUser(userId: string, type: SpaceType): Promise<SpaceWithRole[]>;
  // Their default book or plan; null clears it.
  setDefault(
    userId: string,
    type: SpaceType,
    spaceId: string | null,
    tx?: ITransaction,
  ): Promise<void>;
  rename(spaceId: string, name: string, tx?: ITransaction): Promise<void>;
  delete(spaceId: string, tx?: ITransaction): Promise<void>;
  // Serializes concurrent "create my personal space" calls for the same user and type.
  lockOwnerScope(
    userId: string,
    type: SpaceType,
    tx: ITransaction,
  ): Promise<void>;

  listMembers(spaceId: string, tx?: ITransaction): Promise<SpaceMember[]>;
  // The name on someone's account (Neon Auth), or null if it has none.
  getUserName(userId: string, tx?: ITransaction): Promise<string | null>;
  // No-op if already a member: joining again never changes an existing role.
  addMember(
    spaceId: string,
    userId: string,
    role: InviteRole,
    tx?: ITransaction,
  ): Promise<void>;
  updateMemberRole(
    spaceId: string,
    userId: string,
    role: InviteRole,
    tx?: ITransaction,
  ): Promise<void>;
  removeMember(
    spaceId: string,
    userId: string,
    tx?: ITransaction,
  ): Promise<void>;
  getMemberRole(
    spaceId: string,
    userId: string,
    tx?: ITransaction,
  ): Promise<SpaceRole | undefined>;

  createInvite(
    spaceId: string,
    role: InviteRole,
    createdBy: string,
    tx?: ITransaction,
  ): Promise<SpaceInvite>;
  listActiveInvites(spaceId: string, tx?: ITransaction): Promise<SpaceInvite[]>;
  getActiveInviteByToken(
    token: string,
    tx?: ITransaction,
  ): Promise<SpaceInvite | undefined>;
  getInviteById(
    inviteId: string,
    tx?: ITransaction,
  ): Promise<SpaceInvite | undefined>;
  revokeInvite(inviteId: string, tx?: ITransaction): Promise<void>;
}
