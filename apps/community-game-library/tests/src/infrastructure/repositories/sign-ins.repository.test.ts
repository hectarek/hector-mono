import { beforeEach, describe, expect, it } from "bun:test";
import { SignInsRepository } from "@/src/infrastructure/repositories/sign-ins.repository";
import { MockLoggerService } from "@/src/infrastructure/services/mock-logger.service";
import { TransactionManagerService } from "@/src/infrastructure/services/transaction-manager.service";
import { CAST } from "@/tests/_support/cast";
import { resetDatabase, sql } from "@/tests/_support/database";

const { priya, sam, noor } = CAST.people;

// A sign-in as Neon Auth keeps one: the user, a Google link and a password, and a session.
async function signIn(userId: string, name: string, email: string) {
  await sql(
    `insert into neon_auth."user" (id, name, email, "emailVerified", image) values ($1, $2, $3, true, $4)`,
    [userId, name, email, `https://pictures.example/${userId}.png`],
  );
  await sql(
    `insert into neon_auth.account ("accountId", "providerId", "userId") values ($1, 'google', $2)`,
    [`google-${userId}`, userId],
  );
  await sql(
    `insert into neon_auth.account ("accountId", "providerId", "userId", password) values ($1, 'credential', $2, 'a hash')`,
    [userId, userId],
  );
  await sql(
    `insert into neon_auth.session (token, "userId", "ipAddress", "userAgent") values ($1, $2, '203.0.113.7', 'A phone')`,
    [`token-${userId}`, userId],
  );
}

const count = async (table: string, userId: string) =>
  (
    await sql<{ n: number }>(
      `select count(*)::int as n from neon_auth.${table} where "userId" = $1`,
      [userId],
    )
  )[0]?.n;

// Deleting an account and the admin's removal leave its sign-in anonymized, in Neon Auth's own
// tables (U22, Hector, 2026-11-24): the stand-ins in tests/_support/database.ts.
describe("SignInsRepository", () => {
  beforeEach(async () => {
    await resetDatabase();
  });

  it("leaves a sign-in with placeholders and no way in, sessions or waiting codes, and others as they were", async () => {
    await signIn(priya.id, "Priya", "priya@example.com");
    await signIn(sam.id, "Sam", "sam@example.com");
    await sql(
      `insert into neon_auth.verification (identifier, value) values ($1, '482910'), ($2, $3), ($4, '771234')`,
      [
        "email-verification-otp-priya@example.com",
        "reset-password:a-token",
        priya.id,
        "email-verification-otp-sam@example.com",
      ],
    );

    const log = new MockLoggerService();
    await new TransactionManagerService(log).startTransaction((tx) =>
      new SignInsRepository(log).anonymize(priya.id, tx),
    );

    expect(
      await sql(
        `select name, email, image, "emailVerified" from neon_auth."user" where id = $1`,
        [priya.id],
      ),
    ).toEqual([
      {
        name: "A former member",
        email: `deleted-${priya.id}@deleted.invalid`,
        image: null,
        emailVerified: false,
      },
    ]);
    expect(await count("account", priya.id)).toBe(0);
    expect(await count("session", priya.id)).toBe(0);

    // Sam's sign-in, and the code waiting for his email, are untouched.
    expect(
      await sql(`select email from neon_auth."user" where id = $1`, [sam.id]),
    ).toEqual([{ email: "sam@example.com" }]);
    expect(await count("account", sam.id)).toBe(2);
    expect(await count("session", sam.id)).toBe(1);
    expect(await sql("select identifier from neon_auth.verification")).toEqual([
      { identifier: "email-verification-otp-sam@example.com" },
    ]);
  });

  // E5 and G8 read what the app shows of a sign-in (Hector, 2026-11-25).
  it("reads the emails asked for in id order, and a sign-in's ways in, leaving out a provider the app doesn't offer", async () => {
    await signIn(sam.id, "Sam", "sam@example.com");
    await signIn(priya.id, "Priya", "priya@example.com");
    await signIn(noor.id, "Noor", "noor@example.com");
    // Noor signs in through a provider the app doesn't show, and has no password.
    await sql(
      `delete from neon_auth.account where "userId" = $1 and "providerId" = 'credential'`,
      [noor.id],
    );
    await sql(
      `insert into neon_auth.account ("accountId", "providerId", "userId") values ($1, 'github', $2)`,
      [`github-${noor.id}`, noor.id],
    );

    const signIns = new SignInsRepository(new MockLoggerService());
    expect(await signIns.listEmails([sam.id, priya.id])).toEqual([
      { userId: sam.id, email: "sam@example.com" },
      { userId: priya.id, email: "priya@example.com" },
    ]);
    expect(await signIns.listEmails([])).toEqual([]);
    expect(await signIns.listWaysIn(sam.id)).toEqual(["google", "password"]);
    expect(await signIns.listWaysIn(noor.id)).toEqual(["google"]);
  });
});
