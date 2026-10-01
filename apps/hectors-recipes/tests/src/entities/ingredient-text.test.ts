import { describe, expect, it } from "bun:test";
import { linesFromText } from "@/src/entities/ingredient-text";

describe("linesFromText", () => {
  it("splits lines, skips blanks, and applies sections", () => {
    const text = [
      "1 1/2 cups unsalted butter",
      "",
      "Cream Cheese Frosting:",
      "1/4 cup unsalted butter, softened",
      "6 ounces cream cheese, softened",
    ].join("\n");

    expect(linesFromText(text)).toEqual([
      { raw: "1 1/2 cups unsalted butter" },
      {
        raw: "1/4 cup unsalted butter, softened",
        section: "Cream Cheese Frosting",
      },
      {
        raw: "6 ounces cream cheese, softened",
        section: "Cream Cheese Frosting",
      },
    ]);
  });

  it("accepts a list pasted straight from Obsidian", () => {
    const text =
      "- [ ]  1 tablespoon olive oil\n- [x] 1 onion, finely chopped\n* 2 cloves garlic";
    expect(linesFromText(text).map((line) => line.raw)).toEqual([
      "1 tablespoon olive oil",
      "1 onion, finely chopped",
      "2 cloves garlic",
    ]);
  });

  it("treats a bold heading as a section", () => {
    expect(linesFromText("**To Serve:**\n1 lime")).toEqual([
      { raw: "1 lime", section: "To Serve" },
    ]);
  });
});
