import { asc, eq, inArray, sql } from "drizzle-orm";
import { pgSchema, text, uuid } from "drizzle-orm/pg-core";
import type { ISignInsRepository } from "@/src/application/repositories/sign-ins.repository.interface";
import type { ILoggerService } from "@/src/application/services/logger.service.interface";
import type { ITransaction } from "@/src/entities/models/transaction.model";
import { formerMember } from "@/src/entities/models/user-profile.model";
import { WAYS_IN, type WayIn } from "@/src/entities/ways-in";
import { BaseRepository } from "@/src/infrastructure/repositories/base.repository";

// The columns the reads use, as recipes reads Neon Auth's users (neon-auth-users.ts): kept out of
// db/schema.ts, so drizzle-kit never writes a migration for a schema Neon owns.
const neonAuth = pgSchema("neon_auth");
const neonAuthUsers = neonAuth.table("user", {
  id: uuid("id").primaryKey(),
  email: text("email").notNull(),
});
const neonAuthAccounts = neonAuth.table("account", {
  userId: uuid("userId").notNull(),
  providerId: text("providerId").notNull(),
});

// Better Auth's provider id for each way in: an email and password is the "credential" account
// its sign-up makes, and Google's link takes the provider's own id.
const PROVIDER_IDS: Record<WayIn, string> = {
  google: "google",
  password: "credential",
};

// Neon Auth's tables are Neon's (Better Auth's schema, as Neon Auth had it on 2026-11-24): its
// docs offer them to read, not to write, so these writes rest on that shape. The browser flows
// tests/flows/delete-account.flow.ts and getting-in.flow.ts check them against the test
// project's real tables, and tests/_support/database.ts stands them in on PGlite.
export class SignInsRepository
  extends BaseRepository
  implements ISignInsRepository
{
  constructor(logger: ILoggerService) {
    super(logger, "signIns");
  }

  async listEmails(
    userIds: readonly string[],
  ): Promise<{ userId: string; email: string }[]> {
    if (userIds.length === 0) {
      return [];
    }
    try {
      return await this.getDbContext()
        .select({ userId: neonAuthUsers.id, email: neonAuthUsers.email })
        .from(neonAuthUsers)
        .where(inArray(neonAuthUsers.id, [...userIds]))
        .orderBy(asc(neonAuthUsers.id));
    } catch (err) {
      this.handleError(err, "listEmails");
    }
  }

  async listWaysIn(userId: string): Promise<WayIn[]> {
    try {
      const accounts = await this.getDbContext()
        .select({ providerId: neonAuthAccounts.providerId })
        .from(neonAuthAccounts)
        .where(eq(neonAuthAccounts.userId, userId));
      const providers = new Set(accounts.map((account) => account.providerId));
      return WAYS_IN.filter((way) => providers.has(PROVIDER_IDS[way]));
    } catch (err) {
      this.handleError(err, "listWaysIn", { userId });
    }
  }

  async anonymize(userId: string, tx: ITransaction): Promise<void> {
    try {
      const db = this.getDbContext(tx);
      // Codes and links still waiting for it: an email's codes end with the address, and a
      // password reset's carries the user's id. Before the address changes.
      await db.execute(sql`
        delete from neon_auth.verification as v
        using neon_auth."user" as u
        where u.id = ${userId}
          and (v.value = ${userId} or right(v.identifier, length(u.email)) = u.email)`);
      await db.execute(
        sql`delete from neon_auth.session where "userId" = ${userId}`,
      );
      await db.execute(
        sql`delete from neon_auth.account where "userId" = ${userId}`,
      );
      // The address stays unique, as Neon Auth requires, and .invalid never receives mail.
      await db.execute(sql`
        update neon_auth."user"
        set name = ${formerMember(userId).name},
            email = ${`deleted-${userId}@deleted.invalid`},
            image = null,
            "emailVerified" = false,
            "updatedAt" = now()
        where id = ${userId}`);
    } catch (err) {
      this.handleError(err, "anonymize", { userId });
    }
  }
}
