import { describe, expect, it } from "bun:test";
import { SPACE_TYPE_HOME, spaceHref } from "@/app/_lib/space-href";

describe("spaceHref", () => {
  it("links each type to its own tab", () => {
    expect(spaceHref({ id: "b", type: "recipe-book" })).toBe("/?book=b");
    expect(spaceHref({ id: "p", type: "meal-plan" })).toBe("/plan?plan=p");
  });

  it("has a home tab for every type", () => {
    expect(Object.values(SPACE_TYPE_HOME)).toEqual(["/books", "/plan"]);
  });
});
