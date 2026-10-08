import { randomBytes } from "node:crypto";
import { and, asc, desc, eq, isNull, ne, sql } from "drizzle-orm";
import { spaceInvites, spaceMembers, spaces, userSettings } from "@/db/schema";
import type { ISpacesRepository } from "@/src/application/repositories/spaces.repository.interface";
import type { ILoggerService } from "@/src/application/services/logger.service.interface";
import { DatabaseOperationError } from "@/src/entities/errors/common";
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
import type { ITransaction } from "@/src/entities/models/transaction.model";
import { BaseRepository } from "@/src/infrastructure/repositories/base.repository";
import { neonAuthUsers } from "@/src/infrastructure/repositories/neon-auth-users";

const inviteColumns = {
  id: spaceInvites.id,
  spaceId: spaceInvites.spaceId,
  token: spaceInvites.token,
  role: spaceInvites.role,
  createdAt: spaceInvites.createdAt,
};

// Which user_settings column holds each type's default.
const DEFAULT_COLUMN = {
  "meal-plan": "defaultPlanId",
  "recipe-book": "defaultBookId",
} as const satisfies Record<SpaceType, keyof typeof userSettings.$inferInsert>;

// The owner's account name, for a space still carrying its automatic name (D83). Written out
// with aliases: Drizzle leaves columns unqualified in a one-table query, where "id" would
// mean the subquery's own, and Neon Auth's user table has a "role" of its own too.
const OWNER_NAME = sql<string | null>`(
  select owner_account.name from space_members owner_member
  join neon_auth."user" owner_account on owner_account.id = owner_member.user_id
  where owner_member.space_id = "spaces"."id" and owner_member.role = 'owner'
  limit 1
)`;

type SpaceRow = typeof spaces.$inferSelect;

// A space as the app shows it: one still carrying its automatic name takes its owner's
// current one ("Hector's Recipes" follows Hector renaming his account).
function toSpace(row: SpaceRow, ownerName: string | null): Space {
  return {
    id: row.id,
    type: row.type,
    name: row.autoName ? personalSpaceName(row.type, ownerName) : row.name,
    description: row.description,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

// Owner first, then editors, then viewers.
const ROLE_ORDER = sql`case ${spaceMembers.role} when 'owner' then 0 when 'editor' then 1 else 2 end`;

export class SpacesRepository
  extends BaseRepository
  implements ISpacesRepository
{
  constructor(logger: ILoggerService) {
    super(logger, "spaces");
  }

  async create(
    input: CreateSpaceInput & { autoName?: boolean },
    ownerId: string,
    tx?: ITransaction,
  ): Promise<Space> {
    const executor = this.getDbContext(tx);

    try {
      const [created] = await executor
        .insert(spaces)
        .values({
          type: input.type,
          name: input.name,
          autoName: input.autoName ?? false,
          description: input.description ?? null,
        })
        .returning();

      if (!created) {
        throw new DatabaseOperationError("Failed to create space");
      }

      await executor
        .insert(spaceMembers)
        .values({ spaceId: created.id, userId: ownerId, role: "owner" });

      this.logger.debug("Created space", {
        spaceId: created.id,
        type: created.type,
        ownerId,
      });
      // Just made, so an automatic name is the owner's current one.
      return toSpace({ ...created, autoName: false }, null);
    } catch (err) {
      this.handleError(err, "create", { ownerId, type: input.type });
    }
  }

  async getById(
    spaceId: string,
    tx?: ITransaction,
  ): Promise<Space | undefined> {
    try {
      const [row] = await this.getDbContext(tx)
        .select({ space: spaces, ownerName: OWNER_NAME })
        .from(spaces)
        .where(eq(spaces.id, spaceId));
      return row && toSpace(row.space, row.ownerName);
    } catch (err) {
      this.handleError(err, "getById", { spaceId });
    }
  }

  async getAccess(
    spaceId: string,
    userId: string,
    tx?: ITransaction,
  ): Promise<SpaceAccess | undefined> {
    const executor = this.getDbContext(tx);

    try {
      const [row] = await executor
        .select({ type: spaces.type, role: spaceMembers.role })
        .from(spaces)
        .leftJoin(
          spaceMembers,
          and(
            eq(spaceMembers.spaceId, spaces.id),
            eq(spaceMembers.userId, userId),
          ),
        )
        .where(eq(spaces.id, spaceId));

      return row;
    } catch (err) {
      this.handleError(err, "getAccess", { spaceId, userId });
    }
  }

  async findOwned(
    userId: string,
    type: SpaceType,
    tx?: ITransaction,
  ): Promise<Space | undefined> {
    const executor = this.getDbContext(tx);

    try {
      const [row] = await executor
        .select({ space: spaces, ownerName: OWNER_NAME })
        .from(spaces)
        .innerJoin(spaceMembers, eq(spaceMembers.spaceId, spaces.id))
        .where(
          and(
            eq(spaceMembers.userId, userId),
            eq(spaceMembers.role, "owner"),
            eq(spaces.type, type),
          ),
        )
        .orderBy(asc(spaces.createdAt))
        .limit(1);

      return row && toSpace(row.space, row.ownerName);
    } catch (err) {
      this.handleError(err, "findOwned", { userId, type });
    }
  }

  async listForUser(userId: string, type: SpaceType): Promise<SpaceWithRole[]> {
    try {
      const rows = await this.getDbContext()
        .select({
          space: spaces,
          ownerName: OWNER_NAME,
          role: spaceMembers.role,
          defaultId: userSettings[DEFAULT_COLUMN[type]],
        })
        .from(spaces)
        .innerJoin(spaceMembers, eq(spaceMembers.spaceId, spaces.id))
        .leftJoin(userSettings, eq(userSettings.userId, spaceMembers.userId))
        .where(and(eq(spaceMembers.userId, userId), eq(spaces.type, type)))
        .orderBy(asc(spaces.createdAt));

      return rows.map((row) => ({
        ...toSpace(row.space, row.ownerName),
        role: row.role,
        isDefault: row.defaultId === row.space.id,
      }));
    } catch (err) {
      this.handleError(err, "listForUser", { userId, type });
    }
  }

  async setDefault(
    userId: string,
    type: SpaceType,
    spaceId: string | null,
    tx?: ITransaction,
  ): Promise<void> {
    const choice = { [DEFAULT_COLUMN[type]]: spaceId, updatedAt: new Date() };
    try {
      await this.getDbContext(tx)
        .insert(userSettings)
        .values({ userId, ...choice })
        .onConflictDoUpdate({ target: userSettings.userId, set: choice });
    } catch (err) {
      this.handleError(err, "setDefault", { userId, type });
    }
  }

  async rename(
    spaceId: string,
    name: string,
    tx?: ITransaction,
  ): Promise<void> {
    try {
      await this.getDbContext(tx)
        .update(spaces)
        .set({ name, autoName: false, updatedAt: new Date() })
        .where(eq(spaces.id, spaceId));
    } catch (err) {
      this.handleError(err, "rename", { spaceId });
    }
  }

  async delete(spaceId: string, tx?: ITransaction): Promise<void> {
    try {
      await this.getDbContext(tx).delete(spaces).where(eq(spaces.id, spaceId));
      this.logger.info("Deleted space", { spaceId });
    } catch (err) {
      this.handleError(err, "delete", { spaceId });
    }
  }

  async lockOwnerScope(
    userId: string,
    type: SpaceType,
    tx: ITransaction,
  ): Promise<void> {
    const executor = this.getDbContext(tx);

    try {
      await executor.execute(
        sql`select pg_advisory_xact_lock(hashtext(${`${userId}:${type}`}))`,
      );
    } catch (err) {
      this.handleError(err, "lockOwnerScope", { userId, type });
    }
  }

  async listMembers(
    spaceId: string,
    tx?: ITransaction,
  ): Promise<SpaceMember[]> {
    try {
      return await this.getDbContext(tx)
        .select({
          userId: spaceMembers.userId,
          role: spaceMembers.role,
          name: neonAuthUsers.name,
          email: neonAuthUsers.email,
          image: neonAuthUsers.image,
        })
        .from(spaceMembers)
        .leftJoin(neonAuthUsers, eq(neonAuthUsers.id, spaceMembers.userId))
        .where(eq(spaceMembers.spaceId, spaceId))
        .orderBy(ROLE_ORDER, asc(spaceMembers.addedAt));
    } catch (err) {
      this.handleError(err, "listMembers", { spaceId });
    }
  }

  async getUserName(userId: string, tx?: ITransaction): Promise<string | null> {
    try {
      const [user] = await this.getDbContext(tx)
        .select({ name: neonAuthUsers.name })
        .from(neonAuthUsers)
        .where(eq(neonAuthUsers.id, userId));
      return user?.name ?? null;
    } catch (err) {
      this.handleError(err, "getUserName", { userId });
    }
  }

  async addMember(
    spaceId: string,
    userId: string,
    role: InviteRole,
    tx?: ITransaction,
  ): Promise<void> {
    try {
      await this.getDbContext(tx)
        .insert(spaceMembers)
        .values({ spaceId, userId, role })
        .onConflictDoNothing();
    } catch (err) {
      this.handleError(err, "addMember", { spaceId, userId });
    }
  }

  async updateMemberRole(
    spaceId: string,
    userId: string,
    role: InviteRole,
    tx?: ITransaction,
  ): Promise<void> {
    try {
      await this.getDbContext(tx)
        .update(spaceMembers)
        .set({ role })
        .where(
          and(
            eq(spaceMembers.spaceId, spaceId),
            eq(spaceMembers.userId, userId),
            ne(spaceMembers.role, "owner"),
          ),
        );
    } catch (err) {
      this.handleError(err, "updateMemberRole", { spaceId, userId });
    }
  }

  async removeMember(
    spaceId: string,
    userId: string,
    tx?: ITransaction,
  ): Promise<void> {
    try {
      await this.getDbContext(tx)
        .delete(spaceMembers)
        .where(
          and(
            eq(spaceMembers.spaceId, spaceId),
            eq(spaceMembers.userId, userId),
            ne(spaceMembers.role, "owner"),
          ),
        );
    } catch (err) {
      this.handleError(err, "removeMember", { spaceId, userId });
    }
  }

  async getMemberRole(
    spaceId: string,
    userId: string,
    tx?: ITransaction,
  ): Promise<SpaceRole | undefined> {
    try {
      const [row] = await this.getDbContext(tx)
        .select({ role: spaceMembers.role })
        .from(spaceMembers)
        .where(
          and(
            eq(spaceMembers.spaceId, spaceId),
            eq(spaceMembers.userId, userId),
          ),
        );
      return row?.role;
    } catch (err) {
      this.handleError(err, "getMemberRole", { spaceId, userId });
    }
  }

  async createInvite(
    spaceId: string,
    role: InviteRole,
    createdBy: string,
    tx?: ITransaction,
  ): Promise<SpaceInvite> {
    try {
      const [created] = await this.getDbContext(tx)
        .insert(spaceInvites)
        .values({
          spaceId,
          role,
          createdBy,
          token: randomBytes(18).toString("base64url"),
        })
        .returning(inviteColumns);

      if (!created) {
        throw new DatabaseOperationError("Failed to create invite");
      }
      return created;
    } catch (err) {
      this.handleError(err, "createInvite", { spaceId });
    }
  }

  async listActiveInvites(
    spaceId: string,
    tx?: ITransaction,
  ): Promise<SpaceInvite[]> {
    try {
      return await this.getDbContext(tx)
        .select(inviteColumns)
        .from(spaceInvites)
        .where(
          and(
            eq(spaceInvites.spaceId, spaceId),
            isNull(spaceInvites.revokedAt),
          ),
        )
        .orderBy(desc(spaceInvites.createdAt));
    } catch (err) {
      this.handleError(err, "listActiveInvites", { spaceId });
    }
  }

  async getActiveInviteByToken(
    token: string,
    tx?: ITransaction,
  ): Promise<SpaceInvite | undefined> {
    try {
      const [row] = await this.getDbContext(tx)
        .select(inviteColumns)
        .from(spaceInvites)
        .where(
          and(eq(spaceInvites.token, token), isNull(spaceInvites.revokedAt)),
        );
      return row;
    } catch (err) {
      this.handleError(err, "getActiveInviteByToken");
    }
  }

  async getInviteById(
    inviteId: string,
    tx?: ITransaction,
  ): Promise<SpaceInvite | undefined> {
    try {
      const [row] = await this.getDbContext(tx)
        .select(inviteColumns)
        .from(spaceInvites)
        .where(eq(spaceInvites.id, inviteId));
      return row;
    } catch (err) {
      this.handleError(err, "getInviteById", { inviteId });
    }
  }

  async revokeInvite(inviteId: string, tx?: ITransaction): Promise<void> {
    try {
      await this.getDbContext(tx)
        .update(spaceInvites)
        .set({ revokedAt: new Date() })
        .where(eq(spaceInvites.id, inviteId));
    } catch (err) {
      this.handleError(err, "revokeInvite", { inviteId });
    }
  }
}
