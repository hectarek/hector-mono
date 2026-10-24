import { describe, expect, it } from "bun:test";
import {
  ConflictError,
  DatabaseOperationError,
  HumanOnlyError,
  InputParseError,
  NotAllowedError,
  NotFoundError,
  UnauthenticatedError,
} from "@/src/entities/errors/common";
import { loggable } from "@/src/entities/errors/loggable";

describe("loggable", () => {
  // A production build renames classes (`class D extends Error`), so a log line that went by
  // the class's name would read "D".
  it.each([
    ["ConflictError", ConflictError],
    ["DatabaseOperationError", DatabaseOperationError],
    ["HumanOnlyError", HumanOnlyError],
    ["InputParseError", InputParseError],
    ["NotAllowedError", NotAllowedError],
    ["NotFoundError", NotFoundError],
    ["UnauthenticatedError", UnauthenticatedError],
  ] as const)(
    "names %s by its own name once its class is renamed",
    (name, AppError) => {
      const Renamed = class extends AppError {};
      Object.defineProperty(Renamed, "name", { value: "D" });
      expect(loggable(new Renamed(undefined)).errorClass).toBe(name);
    },
  );

  it("finds the code down the cause chain, and nothing else from it", () => {
    const driverError = Object.assign(new Error("Key (name)=(Fictional Co)"), {
      code: "23505",
    });
    expect(
      loggable(
        new DatabaseOperationError("add failed", { cause: driverError }),
      ),
    ).toEqual({ errorClass: "DatabaseOperationError", errorCode: "23505" });
  });
});
