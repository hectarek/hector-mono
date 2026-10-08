import { describe, expect, it } from "bun:test";
import { getReadsLeftUseCase } from "@/src/application/use-cases/recipes/get-reads-left.use-case";
import { DAILY_RECIPE_READS } from "@/src/entities/models/recipe-draft.model";
import { MockRecipeReadsRepository } from "@/src/infrastructure/repositories/recipe-reads.repository.mock";
import { MockLoggerService } from "@/src/infrastructure/services/mock-logger.service";
import { OWNER, PARTNER } from "@/tests/_support/app";

// P25.1, fix 8: the reads left today (D48), so the import screens can say so before a read.
describe("getReadsLeft", () => {
  const window = () => ({
    since: new Date(Date.now() - 24 * 60 * 60 * 1000),
    limit: DAILY_RECIPE_READS,
  });

  it("counts down a person's own reads in the last 24 hours, to none", async () => {
    const reads = new MockRecipeReadsRepository();
    const readsLeft = getReadsLeftUseCase(reads, new MockLoggerService());
    expect(await readsLeft(OWNER)).toBe(DAILY_RECIPE_READS);

    await reads.record(OWNER, "image", window());
    await reads.record(PARTNER, "text", window());
    expect(await readsLeft(OWNER)).toBe(DAILY_RECIPE_READS - 1);

    for (const read of reads.reads) {
      read.createdAt = new Date(Date.now() - 25 * 60 * 60 * 1000);
    }
    expect(await readsLeft(OWNER)).toBe(DAILY_RECIPE_READS);

    for (let n = 0; n < DAILY_RECIPE_READS; n++) {
      await reads.record(OWNER, "text", window());
    }
    expect(await readsLeft(OWNER)).toBe(0);
  });
});
