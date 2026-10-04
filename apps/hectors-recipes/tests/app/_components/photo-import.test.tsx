import { beforeEach, describe, expect, it } from "bun:test";
import { render } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { PhotoImport } from "@/app/_components/photo-import";
import { loadNewRecipe } from "@/app/_lib/new-recipe";
import { getInjection } from "@/di/container";
import { MockRecipeReaderService } from "@/src/infrastructure/services/mock-recipe-reader.service";
import { signInAsNewUser } from "@/tests/_support/next";

// Add by photo or file (docs/ux-plan.md D53), against the test container's stand-in reader.
describe("PhotoImport", () => {
  let reader: MockRecipeReaderService;

  beforeEach(async () => {
    const userId = signInAsNewUser();
    await getInjection("IEnsurePersonalSpaceController")("recipe-book", userId);
    const service = getInjection("IRecipeReaderService");
    if (!(service instanceof MockRecipeReaderService)) {
      throw new Error("The test container should use MockRecipeReaderService");
    }
    reader = service;
    reader.failWith = null;
  });

  const open = async () => {
    const view = render(<PhotoImport {...(await loadNewRecipe(undefined))} />);
    // The picker's input is hidden (its button opens it), and a new one is rendered after
    // each read, so it's found each time.
    const input = () => {
      const element = view.container.querySelector("input[type=file]");
      if (!(element instanceof HTMLInputElement)) {
        throw new Error("No file input");
      }
      return element;
    };
    return { view, input };
  };

  it("reads a Markdown file as its text, into the form to check", async () => {
    const user = userEvent.setup();
    const { view, input } = await open();
    const markdown = "# Chili\n\n- 1 lb beans\n\n1. Simmer.";
    const before = reader.sources.length;

    // A .md from a phone's Files often has no type: its extension is enough.
    await user.upload(input(), new File([markdown], "chili.md", { type: "" }));

    const title = await view.findByRole("textbox", { name: "Title" });
    expect((title as HTMLInputElement).value).toBe("Chili");
    view.getByText("Read from your file. Check it before saving.");
    expect(reader.sources.slice(before)).toEqual([
      { kind: "text", text: markdown },
    ]);
  });

  it("says so for an empty file and for a file it doesn't take, and reads neither", async () => {
    // As a picker might: Choose File can offer anything.
    const user = userEvent.setup({ applyAccept: false });
    const { view, input } = await open();
    const before = reader.sources.length;

    await user.upload(input(), new File(["  \n"], "empty.txt", { type: "" }));
    await view.findByText("That file is empty.");

    await user.upload(
      input(),
      new File(["PK"], "chili.docx", {
        type: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      }),
    );
    await view.findByText("Choose a photo, or a text or Markdown file.");
    expect(reader.sources.length).toBe(before);
  });
});
