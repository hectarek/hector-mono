import { describe, expect, it } from "bun:test";
import { fireEvent, render, within } from "@testing-library/react";
import { type ComponentProps, useState } from "react";
import { PeoplePicker } from "@/app/_components/people-picker";

// The canvas's cast (KTD13).
const CAST: ComponentProps<typeof PeoplePicker>["people"] = [
  { id: "alice", name: "Alice", shape: "house", color: "brick" },
  { id: "sam", name: "Sam", shape: "house", color: "ocean" },
  { id: "priya", name: "Priya", shape: "cone", color: "moss" },
  { id: "jo", name: "Jo", shape: "cone", color: "plum" },
  { id: "ben", name: "Ben", shape: "pawn", color: "bone" },
  { id: "mei", name: "Mei", shape: "ship", color: "teal" },
  { id: "dev", name: "Dev", shape: "pawn", color: "rose" },
];

function Picker({
  people,
  multiple = false,
}: {
  people: ComponentProps<typeof PeoplePicker>["people"];
  multiple?: boolean;
}) {
  const [value, setValue] = useState<string[]>([]);
  return (
    <form aria-label="Record a loan">
      <PeoplePicker
        label="Who’s taking it"
        name="borrower"
        people={people}
        value={value}
        onChange={setValue}
        multiple={multiple}
      />
    </form>
  );
}

const chosen = (view: ReturnType<typeof render>) =>
  [
    ...view.container.querySelectorAll<HTMLInputElement>(
      'input[type="hidden"][name="borrower"]',
    ),
  ].map((input) => input.value);

// screens.md's limits: any "who" choice with more than six people is a searchable list.
describe("PeoplePicker", () => {
  it("is a button per person for six or fewer, and picks one", () => {
    const view = render(<Picker people={CAST.slice(0, 6)} />);
    const group = within(view.getByRole("group", { name: "Who’s taking it" }));

    expect(view.queryByRole("searchbox") === null).toBe(true);
    expect(
      group.getAllByRole("button").map((button) => button.textContent),
    ).toEqual(["Alice", "Sam", "Priya", "Jo", "Ben", "Mei"]);

    fireEvent.click(group.getByRole("button", { name: "Priya" }));
    fireEvent.click(group.getByRole("button", { name: "Jo" }));
    expect(
      group.getByRole("button", { name: "Jo" }).getAttribute("aria-pressed"),
    ).toBe("true");
    expect(
      group.getByRole("button", { name: "Priya" }).getAttribute("aria-pressed"),
    ).toBe("false");
    expect(chosen(view)).toEqual(["jo"]);
  });

  it("is searched once there are more than six", () => {
    const view = render(<Picker people={CAST} />);
    const search = view.getByRole("searchbox", { name: "Find a friend" });
    const group = within(view.getByRole("group", { name: "Who’s taking it" }));
    expect(group.getAllByRole("button")).toHaveLength(7);

    fireEvent.change(search, { target: { value: "pri" } });
    expect(
      group.getAllByRole("button").map((button) => button.textContent),
    ).toEqual(["Priya"]);

    fireEvent.change(search, { target: { value: "noor" } });
    expect(group.queryAllByRole("button")).toHaveLength(0);
    expect(group.getByText("No friend called “noor”.")).toBeTruthy();
  });

  it("picks several when it may", () => {
    const view = render(<Picker people={CAST} multiple />);
    const group = within(view.getByRole("group", { name: "Who’s taking it" }));
    fireEvent.click(group.getByRole("button", { name: "Alice" }));
    fireEvent.click(group.getByRole("button", { name: "Dev" }));
    expect(chosen(view)).toEqual(["alice", "dev"]);

    fireEvent.click(group.getByRole("button", { name: "Alice" }));
    expect(chosen(view)).toEqual(["dev"]);
  });
});
