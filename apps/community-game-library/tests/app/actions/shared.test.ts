import { describe, expect, it, spyOn } from "bun:test";
import { z } from "zod";
import { actionLogger, text, toActionError } from "@/app/actions/shared";
import {
  DatabaseOperationError,
  InputParseError,
  NotFoundError,
  UnauthenticatedError,
  UnauthorizedError,
} from "@/src/entities/errors/common";
import { MockLoggerService } from "@/src/infrastructure/services/mock-logger.service";
import { form } from "@/tests/_support/form";
import { RecordingLogger } from "@/tests/_support/logger";

// A value as a form would carry it: a friend's phone number. Fictional, and never logged.
const VALUE = "555-0142";
const FALLBACK = "Couldn't save it.";

// What a controller attaches: the Zod error, as the cause.
const parseError = (schema: z.ZodType, input: unknown) =>
  new InputParseError("Invalid", { cause: schema.safeParse(input).error });

describe("text", () => {
  it("trims, and treats blank or missing as undefined", () => {
    const data = form({ name: "  Alice ", blank: "   " });
    expect(text(data, "name")).toBe("Alice");
    expect(text(data, "blank")).toBeUndefined();
    expect(text(data, "missing")).toBeUndefined();
  });
});

describe("actionLogger", () => {
  it("scopes an action's lines to the action", () => {
    const child = spyOn(MockLoggerService.prototype, "child");
    try {
      actionLogger("save-profile");
      expect(child).toHaveBeenCalledWith({
        layer: "action",
        op: "save-profile",
      });
    } finally {
      child.mockRestore();
    }
  });
});

describe("toActionError", () => {
  const logger = new MockLoggerService();

  it("says what's wrong with the input, by its first issue", () => {
    const schema = z.object({
      phone: z.string().min(7, "Enter the whole number"),
    });
    expect(
      toActionError(parseError(schema, { phone: "1" }), logger, FALLBACK),
    ).toEqual({ error: "Enter the whole number" });
  });

  // FIELD_LABELS is empty until the first form (U5), so no field is named yet, and hidden ones
  // never are.
  it("never names a field the form doesn't show", () => {
    const schema = z.object({ userGameId: z.uuid("Pick a game") });
    const answer = toActionError(
      parseError(schema, { userGameId: "not-an-id" }),
      logger,
      FALLBACK,
    );
    expect(answer).toEqual({ error: "Pick a game" });
  });

  it("has no field messages when the error isn't about a form field", () => {
    expect(
      toActionError(new InputParseError("Nothing to add"), logger, FALLBACK),
    ).toEqual({ error: "Nothing to add" });
  });

  it("maps each domain error to a message the person can act on", () => {
    expect(toActionError(new UnauthenticatedError(), logger, FALLBACK)).toEqual(
      { error: "Your session expired. Sign in again." },
    );
    expect(
      toActionError(
        new UnauthorizedError("Only the admin can do this"),
        logger,
        FALLBACK,
      ),
    ).toEqual({ error: "Only the admin can do this" });
    expect(toActionError(new NotFoundError("Gone"), logger, FALLBACK)).toEqual({
      error: "Gone",
    });
  });

  it("hides unexpected errors behind the fallback", () => {
    expect(
      toActionError(new DatabaseOperationError("pg: boom"), logger, FALLBACK),
    ).toEqual({ error: FALLBACK });
    expect(toActionError(new Error("oops"), logger, FALLBACK)).toEqual({
      error: FALLBACK,
    });
  });

  // KTD1: an error's message can carry a field's value, so only its class and code are logged.
  it("logs each error by its class, never its message", () => {
    const recording = new RecordingLogger();
    for (const err of [
      new InputParseError(`Invalid phone ${VALUE}`),
      new UnauthenticatedError(`No session for ${VALUE}`),
      new UnauthorizedError(`Not ${VALUE}'s copy`),
      new NotFoundError(`No friend with ${VALUE}`),
      new Error(`Query failed with ${VALUE}`),
    ]) {
      toActionError(err, recording, FALLBACK);
    }

    expect(recording.text).not.toContain(VALUE);
    expect(
      recording.lines.map(({ level, context }) => [level, context]),
    ).toEqual([
      ["warn", { errorClass: "InputParseError" }],
      ["warn", { errorClass: "UnauthenticatedError" }],
      ["warn", { errorClass: "UnauthorizedError" }],
      ["warn", { errorClass: "NotFoundError" }],
      ["error", { errorClass: "Error" }],
    ]);
  });
});
