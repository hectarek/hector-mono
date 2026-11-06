import { describe, expect, it } from "bun:test";
import { DrizzleQueryError } from "drizzle-orm/errors";
import { loggable } from "@/src/entities/errors/loggable";
import "@/src/infrastructure/drizzle-errors";

describe("drizzle's query error", () => {
  it("logs by its name when the production build renames its class", () => {
    // The production build gives the class a short name of its own; a subclass with one
    // stands in for it here.
    class cX extends DrizzleQueryError {}
    const err = new cX(
      "select $1::int",
      ["not a number"],
      new Error("refused"),
    );

    expect(err.constructor.name).toBe("cX");
    expect(loggable(err)).toEqual({ errorClass: "DrizzleQueryError" });
  });
});
