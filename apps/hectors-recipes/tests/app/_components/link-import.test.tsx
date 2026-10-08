import { beforeEach, describe, expect, it } from "bun:test";
import { render } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { LinkImport } from "@/app/_components/link-import";
import { loadNewRecipe } from "@/app/_lib/new-recipe";
import { getInjection } from "@/di/container";
import type { MockRecipePageFetcherService } from "@/src/infrastructure/services/mock-recipe-page-fetcher.service";
import type { MockRecipeReaderService } from "@/src/infrastructure/services/mock-recipe-reader.service";
import { signInAsNewUser } from "@/tests/_support/next";

const reader = () =>
  getInjection("IRecipeReaderService") as MockRecipeReaderService;
const pages = () =>
  getInjection("IRecipePageFetcherService") as MockRecipePageFetcherService;

// Add by link or text (D73): one box, read as a page when it holds only a web address.
describe("LinkImport", () => {
  beforeEach(async () => {
    const userId = signInAsNewUser();
    await getInjection("IEnsurePersonalSpaceController")("recipe-book", userId);
    reader().failWith = null;
    pages().failWith = null;
  });

  const open = async () => {
    const user = userEvent.setup();
    const view = render(<LinkImport {...(await loadNewRecipe(undefined))} />);
    // Found each time: the box is replaced while a read is under way.
    const read = async (text: string) => {
      const box = await view.findByRole("textbox", {
        name: "The recipe's link, or its text",
      });
      await user.clear(box);
      await user.click(box);
      await user.paste(text);
      await user.click(view.getByRole("button", { name: "Read recipe" }));
    };
    return { view, read };
  };
  const title = async (view: ReturnType<typeof render>) =>
    (
      (await view.findByRole("textbox", {
        name: "Title",
      })) as HTMLInputElement
    ).value;

  it("reads a lone link as its page", async () => {
    pages().pages.set(
      "https://example.com/toast",
      `<script type="application/ld+json">${JSON.stringify({
        "@type": "Recipe",
        name: "Toast",
        recipeIngredient: ["2 slices bread"],
      })}</script>`,
    );
    const { view, read } = await open();

    await read("example.com/toast");
    expect(await title(view)).toBe("Toast");
    view.getByText("Read from example.com. Check it before saving.");
  });

  it("reads anything else as the recipe's text", async () => {
    const { view, read } = await open();
    const text = "Chili\n\n1 lb beans\n\nSimmer.";
    const before = reader().sources.length;

    await read(text);
    expect(await title(view)).toBe("Chili");
    view.getByText("Read from your text. Check it before saving.");
    expect(reader().sources.slice(before)).toEqual([{ kind: "text", text }]);
  });

  // A page that won't be read: its text pasted in place of the link keeps the link as source.
  it("takes the page's text after its link fails, and keeps the link", async () => {
    pages().failWith = "blocked";
    const { view, read } = await open();

    await read("https://example.com/chili");
    await view.findByText(
      "You can copy the recipe's text from the page and paste it above in place of the link.",
    );

    await read("Chili\n\n1 lb beans\n\nSimmer.");
    expect(await title(view)).toBe("Chili");
    view.getByText("Read from example.com. Check it before saving.");
    expect(
      (view.getByRole("textbox", { name: "Source link" }) as HTMLInputElement)
        .value,
    ).toBe("https://example.com/chili");
  });
});
