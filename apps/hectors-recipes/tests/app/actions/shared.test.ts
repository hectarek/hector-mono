import { describe, expect, it } from "bun:test";
import { z } from "zod";
import { text, toActionError } from "@/app/actions/shared";
import {
  DatabaseOperationError,
  InputParseError,
  NotFoundError,
  RecipeReadError,
  UnauthenticatedError,
  UnauthorizedError,
} from "@/src/entities/errors/common";
import {
  addPlanEntrySchema,
  isoDateSchema,
} from "@/src/entities/models/plan-entry.model";
import { createRecipeSchema } from "@/src/entities/models/recipe.model";
import { MockLoggerService } from "@/src/infrastructure/services/mock-logger.service";
import { form } from "@/tests/_support/form";

describe("text", () => {
  it("trims, and treats blank or missing as undefined", () => {
    const data = form({ title: "  Chili ", blank: "   " });
    expect(text(data, "title")).toBe("Chili");
    expect(text(data, "blank")).toBeUndefined();
    expect(text(data, "missing")).toBeUndefined();
  });
});

describe("toActionError", () => {
  const logger = new MockLoggerService();
  const fallback = "Couldn't save it.";

  it("names the field from a validation error", () => {
    const parsed = createRecipeSchema.safeParse({
      title: "x",
      sourceUrl: "nytimes",
      ingredients: [{ raw: "x" }],
    });
    const err = new InputParseError("Invalid", { cause: parsed.error });
    expect(toActionError(err, logger, fallback)?.error).toStartWith(
      "Source link: ",
    );
  });

  it("gives each invalid field its own message, by the form's field names", () => {
    const parsed = createRecipeSchema.safeParse({
      title: "x",
      sourceUrl: "nytimes",
      imageUrl: "photo",
      ingredients: [{ raw: " " }],
    });
    const fields = toActionError(
      new InputParseError("Invalid", { cause: parsed.error }),
      logger,
      fallback,
    )?.fields;
    expect(Object.keys(fields ?? {}).sort()).toEqual([
      "imageUrl",
      "ingredients",
      "sourceUrl",
    ]);
  });

  it("says why a recipe couldn't be read, without the error's own words", () => {
    expect(
      toActionError(
        new RecipeReadError("budget-paused", "AI budget reached"),
        logger,
        fallback,
      ),
    ).toEqual({
      error:
        "Reading recipes with AI is paused: the app has run out of AI credit. Let Hector know so he can add more. You can still add this one by hand.",
    });
  });

  it("has no field messages when the error isn't about a form field", () => {
    expect(
      toActionError(new InputParseError("Nothing to add"), logger, fallback),
    ).toEqual({ error: "Nothing to add" });
  });

  it("names fields the way the form does, and never shows internal names", () => {
    const messageFor = (schemaInput: Record<string, unknown>) => {
      const parsed = createRecipeSchema.safeParse({
        title: "x",
        ingredients: [{ raw: "x" }],
        ...schemaInput,
      });
      return toActionError(
        new InputParseError("Invalid", { cause: parsed.error }),
        logger,
        fallback,
      )?.error;
    };

    expect(messageFor({ yieldServings: 0 })).toStartWith("Servings: ");
    // A bad ingredient line is "Ingredients", not the line's internal `raw` field.
    expect(messageFor({ ingredients: [{ raw: " " }] })).toStartWith(
      "Ingredients: ",
    );
  });

  it("doesn't repeat a field the message already names", () => {
    const planIssue = z
      .object({ date: isoDateSchema })
      .safeParse({ date: "2026-02-30" });
    expect(
      toActionError(
        new InputParseError("Invalid", { cause: planIssue.error }),
        logger,
        fallback,
      ),
    ).toEqual({
      error: "Pick a valid date",
      fields: { date: "Pick a valid date" },
    });
  });

  it("leaves hidden fields (ids) unnamed", () => {
    const idIssue = addPlanEntrySchema.safeParse({
      spaceId: "not-an-id",
      recipeId: "00000000-0000-4000-8000-0000000000bb",
      cookDate: "2026-09-21",
      eatDates: ["2026-09-21"],
    });
    const message = toActionError(
      new InputParseError("Invalid", { cause: idIssue.error }),
      logger,
      fallback,
    )?.error;
    expect(message).not.toContain("spaceId");
  });

  it("maps each domain error to a message the user can act on", () => {
    expect(
      toActionError(new InputParseError("Title is required"), logger, fallback),
    ).toEqual({ error: "Title is required" });
    expect(toActionError(new UnauthenticatedError(), logger, fallback)).toEqual(
      { error: "Your session expired. Sign in again." },
    );
    expect(
      toActionError(new UnauthorizedError("No access"), logger, fallback),
    ).toEqual({ error: "No access" });
    expect(toActionError(new NotFoundError("Gone"), logger, fallback)).toEqual({
      error: "Gone",
    });
  });

  it("hides unexpected errors behind the fallback", () => {
    expect(
      toActionError(new DatabaseOperationError("pg: boom"), logger, fallback),
    ).toEqual({ error: fallback });
    expect(toActionError(new Error("oops"), logger, fallback)).toEqual({
      error: fallback,
    });
  });
});
