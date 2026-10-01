import { describe, expect, it } from "bun:test";
import { readRecipeUseCase } from "@/src/application/use-cases/recipes/read-recipe.use-case";
import { RecipeReadError } from "@/src/entities/errors/common";
import type { RecipeSource } from "@/src/entities/models/recipe-draft.model";
import { DAILY_RECIPE_READS } from "@/src/entities/models/recipe-draft.model";
import { MockRecipeReadsRepository } from "@/src/infrastructure/repositories/recipe-reads.repository.mock";
import { MockLoggerService } from "@/src/infrastructure/services/mock-logger.service";
import { MockRecipeReaderService } from "@/src/infrastructure/services/mock-recipe-reader.service";
import { OWNER, PARTNER, STRANGER } from "@/tests/_support/app";

describe("readRecipe", () => {
  const setup = () => {
    const reader = new MockRecipeReaderService();
    const reads = new MockRecipeReadsRepository();
    const readAs = readRecipeUseCase(reader, reads, new MockLoggerService());
    const read = (from: RecipeSource, userId = OWNER) => readAs(from, userId);
    return { reader, reads, read };
  };
  const source = { kind: "text" as const, text: "Chili\n1 lb beans" };

  it("returns the reader's draft held to its own words (D30)", async () => {
    const { reader, read } = setup();
    reader.draft = {
      ...reader.draft,
      ingredients: [
        ...reader.draft.ingredients,
        {
          raw: "1 onion, diced",
          section: null,
          quantity: 2,
          unit: null,
          name: "shallot",
          note: null,
          optional: false,
          catalogName: "shallot",
          aisle: "produce",
        },
      ],
      steps: [{ text: "Serve.", timerMinutes: 45, section: null }],
    };

    const draft = await read(source);

    expect(reader.sources).toEqual([source]);
    expect(draft.ingredients.map(({ name, aisle }) => [name, aisle])).toEqual([
      ["beans", "canned-and-jarred"],
      ["onion", null],
    ]);
    expect(draft.flagged).toEqual(["1 onion, diced"]);
    expect(draft.steps).toEqual([
      { text: "Serve.", timerMinutes: null, section: null },
    ]);
  });

  // D30 (P14.8): the text is the source, so a read can't change a line or add one.
  it("notes a line that isn't in the text it read", async () => {
    const { reader, read } = setup();
    reader.draft = {
      ...reader.draft,
      ingredients: [
        {
          ...(reader.draft.ingredients[0] ?? never()),
          raw: "1 lb black beans",
        },
      ],
    };
    const draft = await read(source);
    expect(draft.unsure).toEqual([
      "\"1 lb black beans\" isn't in the recipe's text. Check it against the source.",
      "\"Simmer.\" isn't in the recipe's text. Check it against the source.",
    ]);
  });

  it("holds a photo's read to nothing but its own words", async () => {
    const { read } = setup();
    const draft = await read({
      kind: "image" as const,
      images: [{ data: new Uint8Array(), mediaType: "image/jpeg" }],
    });
    expect(draft.unsure).toEqual([]);
  });

  // D48: one account can't spend the month's reading budget.
  it("stops after the day's reads, per person, counting only the last 24 hours", async () => {
    const { reader, reads, read } = setup();
    for (let n = 0; n < DAILY_RECIPE_READS; n++) {
      await read(source);
    }
    const failure = await read(source).catch((err: unknown) => err);
    expect(failure).toMatchObject({ reason: "daily-limit" });
    expect(reader.sources).toHaveLength(DAILY_RECIPE_READS);

    // Someone else still can; and reads from yesterday don't count.
    await read(source, PARTNER);
    for (const old of reads.reads) {
      old.createdAt = new Date(Date.now() - 25 * 60 * 60 * 1000);
    }
    await read(source);
    expect(reader.sources).toHaveLength(DAILY_RECIPE_READS + 2);
  });

  it("lets only the day's reads through when they come at once", async () => {
    const { reader, read } = setup();
    const atOnce = await Promise.all(
      Array.from({ length: DAILY_RECIPE_READS + 5 }, () =>
        read(source, STRANGER).catch(() => null),
      ),
    );
    expect(atOnce.filter(Boolean)).toHaveLength(DAILY_RECIPE_READS);
    expect(reader.sources).toHaveLength(DAILY_RECIPE_READS);
  });

  it("doesn't count a read refused because the month's budget is spent", async () => {
    const { reader, reads, read } = setup();
    reader.failWith = "budget-paused";
    await read(source).catch(() => null);
    expect(reads.reads).toEqual([]);
    reader.failWith = "no-recipe-found";
    await read(source).catch(() => null);
    expect(reads.reads).toHaveLength(1);
  });

  it("passes a failure on, so the person hears why", async () => {
    const { reader, read } = setup();
    reader.failWith = "budget-paused";
    const failure = await read(source).catch((err: unknown) => err);
    expect(failure).toBeInstanceOf(RecipeReadError);
    expect(failure).toMatchObject({ reason: "budget-paused" });
  });
});

function never(): never {
  throw new Error("The mock reader has a line");
}
