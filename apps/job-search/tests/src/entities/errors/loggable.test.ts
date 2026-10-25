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

  // The code is the one thing from the error that reaches the log line (KTD20).
  it("leaves out a code that isn't a short identifier, since it could carry a value", () => {
    for (const code of ["Key (name)=(Fictional Co)", "A".repeat(41)]) {
      const err = Object.assign(new Error("add failed"), { code });
      expect(loggable(err)).toEqual({ errorClass: "Error" });
    }
  });

  it("stops at a cause that points back at its error", () => {
    const looped = new Error("add failed");
    // Without the depth cap the walk would never end, and in a loop rather than a stack
    // overflow (Bun's engine makes tail calls without growing the stack), so the cause gives
    // out after 100 reads: the test fails instead of hanging.
    let reads = 0;
    Object.defineProperty(looped, "cause", {
      get: () => {
        reads += 1;
        if (reads > 100) {
          throw new Error("The cause chain never ended");
        }
        return looped;
      },
    });
    expect(loggable(looped)).toEqual({ errorClass: "Error" });
  });

  it("looks no more than five causes down", () => {
    // An error with a valid code, wrapped `depth` times.
    const wrapped = (depth: number) => {
      let err: Error = Object.assign(new Error("driver failed"), {
        code: "23505",
      });
      for (let i = 0; i < depth; i += 1) {
        err = new Error("add failed", { cause: err });
      }
      return err;
    };
    expect(loggable(wrapped(5)).errorCode).toBe("23505");
    expect(loggable(wrapped(6))).toEqual({ errorClass: "Error" });
  });
});
