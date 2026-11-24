import { describe, expect, test } from "bun:test";
import {
  centerOf,
  fitBox,
  panBox,
  zoomBox,
  zoomOf,
} from "../../src/model/view-box";

const ROOM = { widthInches: 720, lengthInches: 480 };
const FIT = fitBox(ROOM);

describe("fitBox", () => {
  test("shows the whole room with 4 feet around it", () => {
    expect(FIT).toEqual({ x: -48, y: -48, w: 816, h: 576 });
    expect(zoomOf(FIT, FIT)).toBe(1);
  });
});

describe("zoomBox", () => {
  test("zooming in about a point keeps that point where it was", () => {
    const at = { x: 100, y: 200 };
    const zoomed = zoomBox(FIT, FIT, 2, at);
    expect(zoomOf(zoomed, FIT)).toBe(2);
    // The point's place in the box, as a fraction of its size, doesn't change.
    expect((at.x - zoomed.x) / zoomed.w).toBeCloseTo((at.x - FIT.x) / FIT.w, 9);
    expect((at.y - zoomed.y) / zoomed.h).toBeCloseTo((at.y - FIT.y) / FIT.h, 9);
  });

  test("stops at 25% and 800%", () => {
    expect(zoomOf(zoomBox(FIT, FIT, 100, centerOf(FIT)), FIT)).toBe(8);
    expect(zoomOf(zoomBox(FIT, FIT, 0.01, centerOf(FIT)), FIT)).toBe(0.25);
  });
});

describe("panBox", () => {
  test("dragging the floor right shows what's to the left", () => {
    expect(panBox(FIT, 24, -12)).toEqual({ x: -72, y: -36, w: 816, h: 576 });
  });
});
