import { describe, expect, it } from "bun:test";
import { render, within } from "@testing-library/react";
import {
  List,
  ListItem,
  ListRow,
  RowFacts,
  RowLine,
  RowName,
} from "@/app/_components/list-row";
import { Stamp } from "@/app/_components/stamp";

const rows = (count: number) =>
  [
    "Fenwick Fair",
    "Gull & Anchor",
    "Harbor Lights",
    "Moss & Mortar",
    "Night Market",
  ]
    .slice(0, count)
    .map((title) => (
      <ListRow key={title} href={`#${title}`} stamp={<Stamp>Available</Stamp>}>
        <RowName>{title}</RowName>
      </ListRow>
    ));

// The design system's ListRow: one panel of rows, a row that opens a page one link with its
// chevron after any stamp (D14).
describe("ListRow", () => {
  it("is one link filling the row, its stamp then its chevron", () => {
    const view = render(
      <List>
        <ListRow href="/games/harbor-lights" stamp={<Stamp>Available</Stamp>}>
          <RowName>Harbor Lights</RowName>
          <RowFacts>2–5 · 45–60 min</RowFacts>
          <RowLine>1 of 2 available</RowLine>
        </ListRow>
      </List>,
    );
    const [row, ...more] = within(view.getByRole("list")).getAllByRole("link");
    expect(more).toEqual([]);
    expect(row?.getAttribute("href")).toBe("/games/harbor-lights");
    expect(row?.textContent).toBe(
      "Harbor Lights2–5 · 45–60 min1 of 2 availableAvailable",
    );
    // The chevron comes last, after the stamp.
    expect(row?.lastElementChild?.tagName.toLowerCase()).toBe("svg");
  });

  it("holds a row with no page of its own, with no link", () => {
    const view = render(
      <List>
        <ListItem>
          <RowName>Mei</RowName>
          <button type="button">Accept</button>
        </ListItem>
      </List>,
    );
    expect(view.queryAllByRole("link")).toHaveLength(0);
    expect(view.getByRole("button", { name: "Accept" })).toBeTruthy();
  });

  // A browsed list runs in two columns from 768px and three from 1100px; blank cells finish
  // the last line at each (Wide4 draws one after nine games in two columns).
  it("finishes a browsed list's last line with blank cells", () => {
    const blanks = (count: number) =>
      [
        ...render(<List browse>{rows(count)}</List>).container.querySelectorAll(
          'li[aria-hidden="true"]',
        ),
      ].map((cell) => cell.className);

    // Four rows: even at two columns, two short of six at three.
    expect(blanks(4)).toEqual([
      "hidden min-[68.75rem]:block",
      "hidden min-[68.75rem]:block",
    ]);
    // Five rows: one short at two columns and at three.
    expect(blanks(5)).toEqual(["hidden md:block min-[68.75rem]:block"]);
    // Three rows: one short at two columns, none at three.
    expect(blanks(3)).toEqual(["hidden md:block min-[68.75rem]:hidden"]);
  });

  it("keeps a list someone doesn't browse to one column", () => {
    const view = render(<List>{rows(3)}</List>);
    const list = view.getByRole("list");
    expect(list.className).not.toContain("grid-cols");
    expect(list.querySelectorAll('li[aria-hidden="true"]')).toHaveLength(0);
  });
});
