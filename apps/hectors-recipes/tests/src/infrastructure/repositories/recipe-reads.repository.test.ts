import { beforeEach, describe, expect, it } from "bun:test";
import { RecipeReadsRepository } from "@/src/infrastructure/repositories/recipe-reads.repository";
import { MockLoggerService } from "@/src/infrastructure/services/mock-logger.service";
import { OWNER, PARTNER } from "@/tests/_support/app";
import { resetDatabase, sql } from "@/tests/_support/database";

// The daily read limit (D48), on the real table from migration 0012.
describe("RecipeReadsRepository [postgres]", () => {
  const reads = new RecipeReadsRepository(new MockLoggerService());
  const day = () => ({
    since: new Date(Date.now() - 24 * 60 * 60 * 1000),
    limit: 2,
  });

  beforeEach(resetDatabase);

  it("records a person's reads up to the limit for the window, apart from older ones", async () => {
    await sql(
      `insert into recipe_reads (user_id, kind, created_at) values ($1, 'text', now() - interval '25 hours')`,
      [OWNER],
    );
    expect(await reads.record(OWNER, "image", day())).toBeString();
    expect(await reads.record(OWNER, "text", day())).toBeString();
    expect(await reads.record(OWNER, "text", day())).toBeNull();
    // Someone else has their own.
    expect(await reads.record(PARTNER, "text", day())).toBeString();
  });

  it("lets only the limit through when reads come at once", async () => {
    const made = await Promise.all(
      Array.from({ length: 6 }, () => reads.record(OWNER, "text", day())),
    );
    expect(made.filter(Boolean)).toHaveLength(2);
  });

  it("takes back a read", async () => {
    const id = await reads.record(OWNER, "text", day());
    await reads.record(OWNER, "text", day());
    await reads.remove(id ?? "");
    expect(await reads.record(OWNER, "text", day())).toBeString();
  });
});
