import { describe, expect, it } from "bun:test";
import {
  editableSpaces,
  hasRole,
  personalSpaceName,
  pickDefaultSpace,
  type SpaceRole,
} from "@/src/entities/models/space.model";

describe("hasRole", () => {
  it("ranks owner above editor above viewer", () => {
    expect(hasRole("owner", "editor")).toBe(true);
    expect(hasRole("editor", "editor")).toBe(true);
    expect(hasRole("viewer", "editor")).toBe(false);
    expect(hasRole("editor", "owner")).toBe(false);
  });
});

const space = (id: string, role: SpaceRole, isDefault = false) => ({
  id,
  name: id,
  role,
  isDefault,
});

describe("pickDefaultSpace", () => {
  it("prefers a space someone shared with you over your own", () => {
    expect(
      pickDefaultSpace([space("mine", "owner"), space("theirs", "editor")])?.id,
    ).toBe("theirs");
    expect(pickDefaultSpace([space("mine", "owner")])?.id).toBe("mine");
    expect(pickDefaultSpace([])).toBeUndefined();
  });

  it("takes the one they chose as their default over that rule", () => {
    expect(
      pickDefaultSpace([
        space("mine", "owner", true),
        space("theirs", "editor"),
      ])?.id,
    ).toBe("mine");
  });
});

describe("editableSpaces", () => {
  it("leaves out view-only spaces and puts a shared one first", () => {
    expect(
      editableSpaces([
        space("mine", "owner"),
        space("watching", "viewer"),
        space("shared", "editor"),
      ]),
    ).toEqual([
      { id: "shared", name: "shared" },
      { id: "mine", name: "mine" },
    ]);
  });

  it("puts their chosen default first", () => {
    expect(
      editableSpaces([
        space("shared", "editor"),
        space("mine", "owner", true),
      ])[0]?.id,
    ).toBe("mine");
  });

  it("is empty when everything is view-only", () => {
    expect(editableSpaces([space("watching", "viewer")])).toEqual([]);
  });
});

describe("personalSpaceName", () => {
  it("names a book or plan after the first word of its owner's name", () => {
    expect(personalSpaceName("recipe-book", "Hector")).toBe("Hector's Recipes");
    expect(personalSpaceName("meal-plan", "  Hector  Gonzalez ")).toBe(
      "Hector's Plan",
    );
    expect(personalSpaceName("meal-plan", "James")).toBe("James's Plan");
  });

  it("falls back to the plain name when the account has none", () => {
    expect(personalSpaceName("recipe-book", null)).toBe("My Recipes");
    expect(personalSpaceName("meal-plan", "   ")).toBe("My Plan");
  });
});
