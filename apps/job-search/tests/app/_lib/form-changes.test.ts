import { describe, expect, it } from "bun:test";
import { editedFields, rebased } from "@/app/_lib/form-changes";

// A company as a form opened on it, as its fields' text.
const OPENED = { name: "Acme Inc", location: "Springfield", tier: "" };

describe("a form's changes", () => {
  it("are the fields typed differently from how the form opened", () => {
    expect(
      editedFields({ ...OPENED, location: "Shelbyville", tier: "2" }, OPENED),
    ).toEqual(["location", "tier"]);
    expect(editedFields(OPENED, OPENED)).toEqual([]);
  });

  // KTD15: on a conflict, the form stays open on the record as it is now, keeping what was typed.
  it("after a conflict, keep what was typed, take the current value elsewhere, and list what changed meanwhile", () => {
    const typed = { ...OPENED, location: "Shelbyville" };
    const current = { name: "Acme, Inc.", location: "Capital City", tier: "" };

    expect(rebased(typed, OPENED, current)).toEqual({
      fields: { name: "Acme, Inc.", location: "Shelbyville", tier: "" },
      changed: ["name", "location"],
    });
  });
});
