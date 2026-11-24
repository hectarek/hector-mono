import { sql } from "drizzle-orm";
import type { ISignInsRepository } from "@/src/application/repositories/sign-ins.repository.interface";
import type { ILoggerService } from "@/src/application/services/logger.service.interface";
import type { ITransaction } from "@/src/entities/models/transaction.model";
import { formerMember } from "@/src/entities/models/user-profile.model";
import { BaseRepository } from "@/src/infrastructure/repositories/base.repository";

// Neon Auth's tables are Neon's (Better Auth's schema, as Neon Auth had it on 2026-11-24): its
// docs offer them to read, not to write, so these writes rest on that shape. The browser flow
// tests/flows/delete-account.flow.ts checks them against the test project's real tables, and
// tests/_support/database.ts stands them in on PGlite.
export class SignInsRepository
  extends BaseRepository
  implements ISignInsRepository
{
  constructor(logger: ILoggerService) {
    super(logger, "signIns");
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
