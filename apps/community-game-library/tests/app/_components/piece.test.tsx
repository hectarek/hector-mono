import { describe, expect, it } from "bun:test";
import { render } from "@testing-library/react";
import { OpenSeat, Piece } from "@/app/_components/piece";
import { Seats } from "@/app/_components/seats";
import { PIECE_COLORS, PIECE_SHAPES } from "@/src/entities/piece";

const shapeOf = (svg: Element) => svg.querySelector("path")?.getAttribute("d");

// R51: four shapes in ten colors, each with its navy outline, so every friend can have their own.
describe("Piece", () => {
  it("draws each shape in each color, always with its navy outline", () => {
    const view = render(
      <>
        {PIECE_SHAPES.flatMap((shape) =>
          PIECE_COLORS.map((color) => (
            <Piece key={`${shape}-${color}`} shape={shape} color={color} />
          )),
        )}
      </>,
    );
    const pieces = [...view.container.querySelectorAll("svg")];
    expect(pieces).toHaveLength(PIECE_SHAPES.length * PIECE_COLORS.length);

    for (const [index, svg] of pieces.entries()) {
      const color = PIECE_COLORS[index % PIECE_COLORS.length];
      const path = svg.querySelector("path");
      expect(path?.getAttribute("data-color")).toBe(color ?? "");
      expect(svg.getAttribute("class")).toContain("stroke-foreground");
      expect(path?.getAttribute("stroke-width")).toBe("1.6");
      expect(svg.getAttribute("aria-hidden")).toBe("true");
    }
    // Four different shapes, one path each, in the same 22 by 32 box.
    const shapes = new Set(pieces.map(shapeOf));
    expect(shapes.size).toBe(4);
    expect(
      pieces.every((svg) => svg.getAttribute("viewBox") === "0 0 22 32"),
    ).toBe(true);
  });

  // The outline thickens as the piece shrinks.
  it("comes in the kit's sizes", () => {
    const view = render(
      <>
        <Piece shape="pawn" color="mustard" size={11} />
        <Piece shape="pawn" color="mustard" size={16} />
        <Piece shape="pawn" color="mustard" size={20} />
        <Piece shape="pawn" color="mustard" size={24} />
      </>,
    );
    const outlines = [...view.container.querySelectorAll("path")].map((path) =>
      path.getAttribute("stroke-width"),
    );
    expect(outlines).toEqual(["2.2", "1.8", "1.6", "1.5"]);
    const boxes = [...view.container.querySelectorAll("svg")].map((svg) =>
      svg.getAttribute("class"),
    );
    expect(boxes[0]).toContain("w-2.75");
    expect(boxes[3]).toContain("h-8.75");
  });

  it("draws an open seat as an empty, dashed pawn", () => {
    const view = render(<OpenSeat />);
    const svg = view.container.querySelector("svg");
    const path = svg?.querySelector("path");
    expect(path?.getAttribute("d")).toStartWith("M11 1a6 6");
    expect(path?.hasAttribute("data-color")).toBe(false);
    expect(path?.getAttribute("stroke-dasharray")).toBe("3 2.5");
    expect(svg?.getAttribute("class")).toContain("fill-none");
  });
});

// The design system's Seats: people, each guest a small pawn in their member's color right
// after them, then the open seats.
describe("Seats", () => {
  it("seats people, their guests and the open seats in order", () => {
    const view = render(
      <Seats
        people={[
          { id: "sam", shape: "house", color: "ocean" },
          { id: "ben", shape: "pawn", color: "bone", guests: 1 },
        ]}
        open={2}
      />,
    );
    const seats = [...view.container.querySelectorAll("svg")].map((svg) => ({
      color: svg.querySelector("path")?.getAttribute("data-color") ?? "open",
      size: svg.getAttribute("class")?.includes("w-6") ? 24 : 16,
    }));
    expect(seats).toEqual([
      { color: "ocean", size: 24 },
      { color: "bone", size: 24 },
      { color: "bone", size: 16 },
      { color: "open", size: 24 },
      { color: "open", size: 24 },
    ]);
  });

  it("ends in a count past its most", () => {
    const view = render(
      <Seats
        people={[
          { id: "alice", shape: "house", color: "brick" },
          { id: "sam", shape: "house", color: "ocean" },
        ]}
        open={20}
        max={12}
      />,
    );
    expect(view.container.querySelectorAll("svg")).toHaveLength(12);
    expect(view.getByText("+10")).toBeTruthy();
  });
});
