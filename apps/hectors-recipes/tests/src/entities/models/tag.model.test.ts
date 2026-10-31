import { describe, expect, it } from "bun:test";
import { offeredOnly } from "@/src/entities/models/tag.model";

// D97: a read suggests tags only from the ones the form offers, and never adds its own.
describe("offeredOnly", () => {
  const offered = [
    "weeknight",
    "dinner",
    "side dish",
    "mexican",
    "gluten-free",
  ];

  it("keeps the offered ones, tidied as saved tags are, once each", () => {
    expect(
      offeredOnly([" Dinner ", "MEXICAN", "dinner", "Weeknight"], offered),
    ).toEqual(["dinner", "mexican", "weeknight"]);
  });

  it("drops anything not offered", () => {
    expect(offeredOnly(["easy", "soup", "instant pot"], offered)).toEqual([]);
    expect(offeredOnly(["dinner"], [])).toEqual([]);
  });

  it("reads a page's words for a meal or a diet as the starting tags'", () => {
    expect(
      offeredOnly(["Main Course", "Sides", "Gluten Free"], offered),
    ).toEqual(["dinner", "side dish", "gluten-free"]);
  });

  it("keeps a tag of their own as written, even one a page word could stand for", () => {
    expect(offeredOnly(["Main Course"], ["main course", "dinner"])).toEqual([
      "main course",
    ]);
  });
});
