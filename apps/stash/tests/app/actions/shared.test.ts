import { describe, expect, it } from "bun:test";
import { text, toActionError } from "@/app/actions/shared";
import type { ILoggerService } from "@/src/application/services/logger.service.interface";
import {
  DatabaseOperationError,
  InputParseError,
  NotFoundError,
  UnauthenticatedError,
  UnauthorizedError,
} from "@/src/entities/errors/common";

const FALLBACK = "Failed to add item. Please try again.";

// What toActionError returns for an error, and each line it logged ("level: message").
function mapped(err: unknown) {
  const logged: string[] = [];
  const record = (level: string) => (message: string) => {
    logged.push(`${level}: ${message}`);
  };
  const logger: ILoggerService = {
    debug: record("debug"),
    info: record("info"),
    warn: record("warn"),
    error: record("error"),
    child: () => logger,
  };
  return { state: toActionError(err, logger, FALLBACK), logged };
}

describe("text", () => {
  it("trims, and treats blank, missing or a file as undefined", () => {
    const data = new FormData();
    data.append("title", "  Watch later ");
    data.append("blank", "   ");
    data.append("file", new File(["x"], "x.txt"));
    expect(text(data, "title")).toBe("Watch later");
    expect(text(data, "blank")).toBeUndefined();
    expect(text(data, "missing")).toBeUndefined();
    expect(text(data, "file")).toBeUndefined();
  });
});

describe("toActionError", () => {
  it("shows a validation error's message, logged as a warning", () => {
    expect(mapped(new InputParseError("Invalid input"))).toEqual({
      state: { error: "Invalid input" },
      logged: ["warn: Input validation failed"],
    });
  });

  it("shows the controller's sign-in message", () => {
    expect(
      mapped(new UnauthenticatedError("Must be logged in to add items")),
    ).toEqual({
      state: { error: "Must be logged in to add items" },
      logged: ["warn: Unauthenticated attempt"],
    });
  });

  it("passes a denial's or a missing item's message through", () => {
    expect(mapped(new UnauthorizedError("Cannot modify this item"))).toEqual({
      state: { error: "Cannot modify this item" },
      logged: ["warn: Operation denied"],
    });
    expect(mapped(new NotFoundError("Stash item not found"))).toEqual({
      state: { error: "Stash item not found" },
      logged: ["warn: Operation denied"],
    });
  });

  it("hides unexpected errors behind the fallback, logged as errors", () => {
    expect(mapped(new DatabaseOperationError("create failed"))).toEqual({
      state: { error: FALLBACK },
      logged: ["error: Unexpected failure"],
    });
    expect(mapped(new Error("oops"))).toEqual({
      state: { error: FALLBACK },
      logged: ["error: Unexpected failure"],
    });
  });
});
