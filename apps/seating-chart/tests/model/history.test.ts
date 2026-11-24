import { describe, expect, test } from "bun:test";
import { createHistory, record, redo, undo } from "../../src/model/history";

describe("history", () => {
  test("undo and redo walk back and forth through recorded steps", () => {
    let h = createHistory("a");
    h = record(h, "b");
    h = record(h, "c");
    h = undo(h);
    expect(h.present).toBe("b");
    h = undo(h);
    expect(h.present).toBe("a");
    h = redo(h);
    expect(h.present).toBe("b");
  });

  test("undo at the start and redo at the end change nothing", () => {
    const start = createHistory("a");
    expect(undo(start)).toBe(start);
    const end = record(start, "b");
    expect(redo(end)).toBe(end);
  });

  test("a new step after an undo clears what could be redone", () => {
    let h = record(createHistory("a"), "b");
    h = undo(h);
    h = record(h, "x");
    expect(h.future).toEqual([]);
    expect(h.past).toEqual(["a"]);
  });

  test("the oldest steps drop off past the limit", () => {
    let h = createHistory(0);
    for (let i = 1; i <= 5; i++) h = record(h, i, 3);
    expect(h.past).toEqual([2, 3, 4]);
    expect(h.present).toBe(5);
  });
});
