import { describe, expect, it } from "bun:test";
import { fireEvent, render, waitFor, within } from "@testing-library/react";
import { useState } from "react";
import { CoverThumb } from "@/app/_components/cover-thumb";
import { IconCombobox, type IconOption } from "@/app/_components/icon-combobox";
import { Piece } from "@/app/_components/piece";

// The canvas's cast (KTD13), Priya first as the friend who asked for the game.
const FRIENDS: IconOption[] = [
  {
    value: "priya",
    label: "Priya",
    icon: <Piece shape="cone" color="moss" size={16} />,
    note: "asked for it",
  },
  {
    value: "alice",
    label: "Alice",
    icon: <Piece shape="house" color="brick" size={16} />,
  },
  {
    value: "ben",
    label: "Ben",
    icon: <Piece shape="pawn" color="bone" size={16} />,
  },
  {
    value: "jo",
    label: "Jo",
    icon: <Piece shape="cone" color="plum" size={16} />,
  },
];

function Picker({ start = "" }: { start?: string }) {
  const [value, setValue] = useState(start);
  return (
    <form aria-label="Record a loan">
      <IconCombobox
        id="taker"
        label="Who’s taking it"
        name="borrowerUserId"
        noun="friend"
        options={FRIENDS}
        value={value}
        onChange={setValue}
      />
    </form>
  );
}

const sent = (view: ReturnType<typeof render>) =>
  new FormData(
    view.getByRole("form", { name: "Record a loan" }) as HTMLFormElement,
  ).get("borrowerUserId");

// The list opens over the page, outside the form, so it's found in the whole document.
const open = (view: ReturnType<typeof render>, field: HTMLElement) => {
  fireEvent.click(field);
  return view.findByRole("listbox");
};

const names = (list: HTMLElement) =>
  within(list)
    .getAllByRole("option")
    .map((option) => option.textContent);

describe("IconCombobox", () => {
  it("is a field named by its label that reads Pick a friend until one is picked", () => {
    const view = render(<Picker />);
    const field = within(view.container).getByRole("combobox", {
      name: "Who’s taking it",
    });
    expect(field.textContent).toBe("Pick a friend");
    expect(field.getAttribute("aria-expanded")).toBe("false");
    expect(sent(view)).toBe("");
  });

  it("lists each friend by piece and name, the note after the name, and picks one", async () => {
    const view = render(<Picker />);
    const field = within(view.container).getByRole("combobox", {
      name: "Who’s taking it",
    });
    const list = await open(view, field);
    expect(names(list)).toEqual(["Priya · asked for it", "Alice", "Ben", "Jo"]);
    // Each choice draws its piece before its name.
    const alice = within(list).getByRole("option", { name: "Alice" });
    expect(alice.querySelector('[data-color="brick"]')).toBeTruthy();

    fireEvent.click(alice);
    await waitFor(() =>
      expect(view.queryByRole("listbox") === null).toBe(true),
    );
    expect(field.textContent).toBe("Alice");
    expect(field.querySelector('[data-color="brick"]')).toBeTruthy();
    expect(sent(view)).toBe("alice");

    // Opened again, Alice is the one ticked.
    const again = within(await open(view, field));
    expect(
      again
        .getByRole("option", { name: "Alice" })
        .getAttribute("aria-selected"),
    ).toBe("true");
    expect(
      again
        .getByRole("option", { name: "Priya · asked for it" })
        .getAttribute("aria-selected"),
    ).toBe("false");
  });

  it("is picked from the keyboard: the arrows open the list and move, Enter picks", async () => {
    const view = render(<Picker />);
    const field = within(view.container).getByRole("combobox", {
      name: "Who’s taking it",
    });
    field.focus();
    fireEvent.keyDown(field, { key: "ArrowDown" });
    const list = await view.findByRole("listbox");
    const search = view.getByRole("combobox", { name: "Find a friend" });
    await waitFor(() => expect(document.activeElement === search).toBe(true));

    // Down the list to Alice, second in it.
    const alice = within(list).getByRole("option", { name: "Alice" });
    let presses = 0;
    while (!alice.hasAttribute("data-highlighted") && presses < 4) {
      fireEvent.keyDown(search, { key: "ArrowDown" });
      presses += 1;
    }
    expect(alice.hasAttribute("data-highlighted")).toBe(true);
    fireEvent.keyDown(search, { key: "Enter" });
    await waitFor(() =>
      expect(view.queryByRole("listbox") === null).toBe(true),
    );
    expect(field.textContent).toBe("Alice");
    expect(sent(view)).toBe("alice");
  });

  it("filters by name as it's typed, never by the note", async () => {
    const view = render(<Picker />);
    const list = await open(
      view,
      within(view.container).getByRole("combobox", { name: "Who’s taking it" }),
    );
    const search = view.getByRole("combobox", { name: "Find a friend" });

    fireEvent.change(search, { target: { value: "pri" } });
    await waitFor(() => expect(names(list)).toEqual(["Priya · asked for it"]));

    fireEvent.change(search, { target: { value: "asked" } });
    await waitFor(() =>
      expect(within(list).queryAllByRole("option")).toHaveLength(0),
    );

    fireEvent.change(search, { target: { value: "noor" } });
    expect(await view.findByText("No friend called “noor”.")).toBeTruthy();
  });

  it("shows a game's cover with its title once it's chosen", () => {
    const view = render(
      <IconCombobox
        id="game"
        label="Game"
        noun="game"
        options={[
          {
            value: "night-market",
            label: "Night Market",
            icon: <CoverThumb color="plum" size={32} />,
            note: "Priya asked for it",
          },
        ]}
        value="night-market"
        onChange={() => {}}
      />,
    );
    const field = within(view.container).getByRole("combobox", {
      name: "Game",
    });
    // The note is the list's, not the field's.
    expect(field.textContent).toBe("Night Market");
    expect(field.querySelector('[data-color="plum"]')).toBeTruthy();
  });
});
