import type { ISpacesRepository } from "@/src/application/repositories/spaces.repository.interface";
import {
  type CreateSpaceInput,
  type InviteRole,
  personalSpaceName,
  type Space,
  type SpaceAccess,
  type SpaceInvite,
  type SpaceMember,
  type SpaceRole,
  type SpaceType,
  type SpaceWithRole,
} from "@/src/entities/models/space.model";

type Member = { spaceId: string; userId: string; role: SpaceRole };
type StoredSpace = Space & { autoName: boolean };

export class MockSpacesRepository implements ISpacesRepository {
  private spaces: StoredSpace[] = [];
  private members: Member[] = [];
  private invites: SpaceInvite[] = [];
  private revokedInviteIds = new Set<string>();
  // Stands in for Neon Auth's user table; tests set names through makeApp's nameUser.
  readonly userNames = new Map<string, string>();
  private defaults = new Map<string, Partial<Record<SpaceType, string>>>();

  async create(
    input: CreateSpaceInput & { autoName?: boolean },
    ownerId: string,
  ): Promise<Space> {
    const now = new Date();
    const space: Space = {
      id: crypto.randomUUID(),
      type: input.type,
      name: input.name,
      description: input.description ?? null,
      createdAt: now,
      updatedAt: now,
    };

    this.spaces.push({ ...space, autoName: input.autoName ?? false });
    this.members.push({ spaceId: space.id, userId: ownerId, role: "owner" });
    return space;
  }

  // As the real repository shows it: an automatic name follows its owner's (D83).
  private shown({ autoName, ...space }: StoredSpace): Space {
    if (!autoName) return space;
    const owner = this.members.find(
      (member) => member.spaceId === space.id && member.role === "owner",
    );
    const ownerName = owner ? (this.userNames.get(owner.userId) ?? null) : null;
    return { ...space, name: personalSpaceName(space.type, ownerName) };
  }

  async getById(spaceId: string): Promise<Space | undefined> {
    const space = this.spaces.find((candidate) => candidate.id === spaceId);
    return space && this.shown(space);
  }

  async getAccess(
    spaceId: string,
    userId: string,
  ): Promise<SpaceAccess | undefined> {
    const space = await this.getById(spaceId);
    if (!space) {
      return undefined;
    }
    return {
      type: space.type,
      role: (await this.getMemberRole(spaceId, userId)) ?? null,
    };
  }

  async findOwned(userId: string, type: SpaceType): Promise<Space | undefined> {
    const owned = this.spaces.find(
      (space) =>
        space.type === type &&
        this.members.some(
          (member) =>
            member.spaceId === space.id &&
            member.userId === userId &&
            member.role === "owner",
        ),
    );
    return owned && this.shown(owned);
  }

  async listForUser(userId: string, type: SpaceType): Promise<SpaceWithRole[]> {
    return this.members
      .filter((member) => member.userId === userId)
      .flatMap((member) => {
        const space = this.spaces.find(
          (candidate) =>
            candidate.id === member.spaceId && candidate.type === type,
        );
        const isDefault = this.defaults.get(userId)?.[type] === space?.id;
        return space
          ? [{ ...this.shown(space), role: member.role, isDefault }]
          : [];
      });
  }

  async setDefault(
    userId: string,
    type: SpaceType,
    spaceId: string | null,
  ): Promise<void> {
    const choices = { ...this.defaults.get(userId) };
    if (spaceId) choices[type] = spaceId;
    else delete choices[type];
    this.defaults.set(userId, choices);
  }

  async rename(spaceId: string, name: string): Promise<void> {
    this.spaces = this.spaces.map((space) =>
      space.id === spaceId
        ? { ...space, name, autoName: false, updatedAt: new Date() }
        : space,
    );
  }

  async delete(spaceId: string): Promise<void> {
    this.spaces = this.spaces.filter((space) => space.id !== spaceId);
    this.members = this.members.filter((member) => member.spaceId !== spaceId);
    this.invites = this.invites.filter((invite) => invite.spaceId !== spaceId);
  }

  async lockOwnerScope(): Promise<void> {}

  async listMembers(spaceId: string): Promise<SpaceMember[]> {
    return this.members
      .filter((member) => member.spaceId === spaceId)
      .map((member) => ({
        userId: member.userId,
        role: member.role,
        name: this.userNames.get(member.userId) ?? null,
        email: null,
        image: null,
      }));
  }

  async getUserName(userId: string): Promise<string | null> {
    return this.userNames.get(userId) ?? null;
  }

  async addMember(
    spaceId: string,
    userId: string,
    role: InviteRole,
  ): Promise<void> {
    if (!(await this.getMemberRole(spaceId, userId))) {
      this.members.push({ spaceId, userId, role });
    }
  }

  async updateMemberRole(
    spaceId: string,
    userId: string,
    role: InviteRole,
  ): Promise<void> {
    this.members = this.members.map((member) =>
      member.spaceId === spaceId &&
      member.userId === userId &&
      member.role !== "owner"
        ? { ...member, role }
        : member,
    );
  }

  async removeMember(spaceId: string, userId: string): Promise<void> {
    this.members = this.members.filter(
      (member) =>
        !(
          member.spaceId === spaceId &&
          member.userId === userId &&
          member.role !== "owner"
        ),
    );
  }

  async getMemberRole(
    spaceId: string,
    userId: string,
  ): Promise<SpaceRole | undefined> {
    return this.members.find(
      (member) => member.spaceId === spaceId && member.userId === userId,
    )?.role;
  }

  async createInvite(spaceId: string, role: InviteRole): Promise<SpaceInvite> {
    const invite: SpaceInvite = {
      id: crypto.randomUUID(),
      spaceId,
      token: crypto.randomUUID(),
      role,
      createdAt: new Date(),
    };
    this.invites.push(invite);
    return invite;
  }

  async listActiveInvites(spaceId: string): Promise<SpaceInvite[]> {
    return this.invites.filter(
      (invite) =>
        invite.spaceId === spaceId && !this.revokedInviteIds.has(invite.id),
    );
  }

  async getActiveInviteByToken(
    token: string,
  ): Promise<SpaceInvite | undefined> {
    return this.invites.find(
      (candidate) =>
        candidate.token === token && !this.revokedInviteIds.has(candidate.id),
    );
  }

  async getInviteById(inviteId: string): Promise<SpaceInvite | undefined> {
    return this.invites.find((candidate) => candidate.id === inviteId);
  }

  async revokeInvite(inviteId: string): Promise<void> {
    this.revokedInviteIds.add(inviteId);
  }
}
