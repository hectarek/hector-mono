import { describe, expect, it } from "bun:test";
import { readRecipeUseCase } from "@/src/application/use-cases/recipes/read-recipe.use-case";
import { readRecipeFromLinkUseCase } from "@/src/application/use-cases/recipes/read-recipe-from-link.use-case";
import { PageFetchError, RecipeReadError } from "@/src/entities/errors/common";
import { MockRecipeReadsRepository } from "@/src/infrastructure/repositories/recipe-reads.repository.mock";
import { MockLoggerService } from "@/src/infrastructure/services/mock-logger.service";
import { MockRecipePageFetcherService } from "@/src/infrastructure/services/mock-recipe-page-fetcher.service";
import { MockRecipeReaderService } from "@/src/infrastructure/services/mock-recipe-reader.service";
import { OWNER } from "@/tests/_support/app";

const withData = `<html><head><script type="application/ld+json">${JSON.stringify(
  {
    "@type": "Recipe",
    name: "Toast",
    image: "https://example.com/toast.jpg",
    recipeCategory: "Breakfast",
    keywords: "easy, vegetarian",
    recipeIngredient: ["2 slices bread"],
    recipeInstructions: [{ "@type": "HowToStep", text: "Toast the bread." }],
  },
)}</script></head><body>Toast</body></html>`;
const withoutData =
  "<html><body><h1>Nana's Toast</h1><p>2 slices bread</p><p>Toast it.</p></body></html>";

describe("readRecipeFromLink", () => {
  const setup = () => {
    const logger = new MockLoggerService();
    const fetcher = new MockRecipePageFetcherService();
    const reader = new MockRecipeReaderService();
    const reads = new MockRecipeReadsRepository();
    const readLink = readRecipeFromLinkUseCase(
      fetcher,
      readRecipeUseCase(reader, reads, logger),
      logger,
    );
    const read = (url: string, tags?: string[]) => readLink(url, OWNER, tags);
    return { fetcher, reader, reads, read };
  };

  // D97: tags from the page's own words, held to the ones the form offers.
  it("suggests the offered tags the page's recipe data names", async () => {
    const { fetcher, read } = setup();
    fetcher.pages.set("https://example.com/toast", withData);
    const offered = ["breakfast", "dinner", "vegetarian"];
    const result = await read("https://example.com/toast", offered);
    expect(result.draft.tags).toEqual(["breakfast", "vegetarian"]);
    expect((await read("https://example.com/toast")).draft.tags).toEqual([]);
  });

  it("gives the AI reader the offered tags when the page has no recipe data", async () => {
    const { fetcher, reader, read } = setup();
    fetcher.pages.set("https://example.com/nana", withoutData);
    reader.draft = { ...reader.draft, tags: ["breakfast", "brunch"] };
    const result = await read("https://example.com/nana", ["breakfast"]);
    expect(reader.offered).toEqual([["breakfast"]]);
    expect(result.draft.tags).toEqual(["breakfast"]);
  });

  it("reads a page's own recipe data without the AI reader", async () => {
    const { fetcher, reader, read } = setup();
    fetcher.pages.set("https://example.com/toast", withData);
    const result = await read("https://example.com/toast");
    expect(result).toMatchObject({
      sourceUrl: "https://example.com/toast",
      imageUrl: "https://example.com/toast.jpg",
      readBy: "page-data",
      draft: { title: "Toast" },
    });
    expect(reader.sources).toEqual([]);
  });

  // Only an AI read counts toward the daily limit (D48).
  it("gives the AI reader the page's text when it has no recipe data, counting that read", async () => {
    const { fetcher, reader, reads, read } = setup();
    fetcher.pages.set("https://example.com/nana", withoutData);
    fetcher.pages.set("https://example.com/toast", withData);
    const result = await read("https://example.com/nana");
    expect(result).toMatchObject({ readBy: "reader", imageUrl: null });
    expect(reader.sources).toEqual([
      { kind: "text", text: "Nana's Toast\n2 slices bread\nToast it." },
    ]);
    await read("https://example.com/toast");
    expect(reads.reads.map(({ userId, kind }) => [userId, kind])).toEqual([
      [OWNER, "text"],
    ]);
  });

  it("says there's no recipe on a page with no text, without a read", async () => {
    const { fetcher, reader, read } = setup();
    fetcher.pages.set(
      "https://example.com/app",
      "<html><body><div id=root></div></body></html>",
    );
    const failure = await read("https://example.com/app").catch(
      (err: unknown) => err,
    );
    expect(failure).toBeInstanceOf(RecipeReadError);
    expect(failure).toMatchObject({ reason: "no-recipe-found" });
    expect(reader.sources).toEqual([]);
  });

  it("passes on why a page couldn't be fetched", async () => {
    const { fetcher, read } = setup();
    fetcher.failWith = "blocked";
    const failure = await read("https://example.com/x").catch(
      (err: unknown) => err,
    );
    expect(failure).toBeInstanceOf(PageFetchError);
    expect(failure).toMatchObject({ reason: "blocked" });
  });
});
