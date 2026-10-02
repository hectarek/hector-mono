import { afterEach, beforeEach, describe, expect, it } from "bun:test";
import { render, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { SpaceHeader } from "@/app/_components/space-header";
import { getInjection } from "@/di/container";
import type { SpaceRole } from "@/src/entities/models/space.model";
import { signInAsNewUser } from "@/tests/_support/next";

type Book = { id: string; name: string; type: "recipe-book"; role: SpaceRole };

// A tab's title and its ⋯ sheet (D42): Invite for an owner (D20), then Members.
describe("SpaceHeader", () => {
  let userId: string;
  // What Invite handed the phone's share sheet.
  let shared: string[];

  beforeEach(() => {
    userId = signInAsNewUser();
    shared = [];
    Object.defineProperty(navigator, "share", {
      configurable: true,
      value: async ({ url }: { url: string }) => {
        shared.push(url);
      },
    });
  });

  afterEach(() => {
    Reflect.deleteProperty(navigator, "share");
  });

  const newBook = async (name: string): Promise<Book> => {
    const { id } = await getInjection("ICreateSpaceController")(
      { type: "recipe-book", name },
      userId,
    );
    return { id, name, type: "recipe-book", role: "owner" };
  };
  const editorLink = async (book: Book) => {
    const links = await getInjection("IEnsureInviteLinksController")(
      { spaceId: book.id },
      userId,
    );
    return `http://localhost:3000/join/${links.editor.token}`;
  };

  // Opens the ⋯ sheet, then Invite, and shares the Can edit link once it's there.
  const shareEditorLink = async (
    view: ReturnType<typeof render>,
    book: Book,
  ) => {
    const user = userEvent.setup();
    await user.click(
      view.getByRole("button", { name: `More for ${book.name}` }),
    );
    await user.click(await view.findByRole("button", { name: "Invite" }));
    const canEdit = await view.findByRole("button", { name: "Can edit" });
    await waitFor(() => expect(canEdit.hasAttribute("disabled")).toBe(false));
    await user.click(canEdit);
  };

  // P14.2: Next keeps a page's state across ?book= and ?plan=, so a menu that kept its
  // links shared the first space's link for the second.
  it("shares the link of the space on screen, after switching to another", async () => {
    const soups = await newBook("Soups");
    const bakes = await newBook("Bakes");
    const view = render(<SpaceHeader space={soups} />);

    await shareEditorLink(view, soups);
    view.rerender(<SpaceHeader space={bakes} />);
    await shareEditorLink(view, bakes);

    expect(shared).toEqual([await editorLink(soups), await editorLink(bakes)]);
  });

  it("offers Invite only to the owner, and Members to everyone", async () => {
    const user = userEvent.setup();
    const book = { ...(await newBook("Soups")), role: "editor" as const };
    const view = render(<SpaceHeader space={book} />);

    await user.click(view.getByRole("button", { name: "More for Soups" }));
    expect(
      (await view.findByText("Members")).closest("a")?.getAttribute("href"),
    ).toBe(`/spaces/${book.id}/settings`);
    expect(view.queryByRole("button", { name: "Invite" })).toBe(null);
  });
});
