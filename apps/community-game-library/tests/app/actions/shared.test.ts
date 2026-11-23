import { describe, expect, it, spyOn } from "bun:test";
import { z } from "zod";
import { actionLogger, text, toActionError } from "@/app/actions/shared";
import {
  ChangedError,
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
    const schema = z.object({ count: z.number("Enter the whole number") });
    expect(
      toActionError(parseError(schema, { count: "x" }), logger, FALLBACK),
    ).toEqual({ error: "Enter the whole number" });
  });

  // A4 and E6's fields are named in the form's words, each under its own field: a message that
  // doesn't name its field gets the label, and one that does keeps it.
  it("names a form's field, and shows its message under it", () => {
    const schema = z.object({
      phone: z.string().min(7, "Enter the whole number"),
      name: z.string().min(1, "Name is required"),
    });
    expect(
      toActionError(
        parseError(schema, { phone: "1", name: "" }),
        logger,
        FALLBACK,
      ),
    ).toEqual({
      error: "Phone: Enter the whole number",
      fields: { phone: "Enter the whole number", name: "Name is required" },
    });
    expect(
      toActionError(
        parseError(schema, { phone: "5550123", name: "" }),
        logger,
        FALLBACK,
      ),
    ).toEqual({
      error: "Name is required",
      fields: { name: "Name is required" },
    });
  });

  // B7's This copy names its parts field in the board's words.
  it("names B7's missing parts field", () => {
    const schema = z.object({ conditionNote: z.string().max(5, "Too long") });
    expect(
      toActionError(
        parseError(schema, { conditionNote: "A torn lid" }),
        logger,
        FALLBACK,
      ),
    ).toEqual({
      error: "Missing or damaged parts: Too long",
      fields: { conditionNote: "Too long" },
    });
  });

  // D5's New game night names its seats in the board's words.
  it("names D5's seats field", () => {
    const schema = z.object({ capacity: z.number().max(99, "Too many") });
    expect(
      toActionError(parseError(schema, { capacity: 120 }), logger, FALLBACK),
    ).toEqual({
      error: "Seats: Too many",
      fields: { capacity: "Too many" },
    });
  });

  // Hidden fields are never named.
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

  // KTD16: something changed underneath; the sheet says what in one line and sends nothing.
  it("says in one line what changed underneath, and which change it was", () => {
    expect(
      toActionError(new ChangedError("copy-lent"), logger, FALLBACK),
    ).toEqual({
      error: "It was just lent to someone else.",
      changed: "copy-lent",
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
