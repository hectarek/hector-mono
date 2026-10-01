import { describe, expect, it } from "bun:test";
import { GatewayInternalServerError } from "@ai-sdk/gateway";
import { MockLanguageModelV4 } from "ai/test";
import type { ILoggerService } from "@/src/application/services/logger.service.interface";
import { RecipeReadError } from "@/src/entities/errors/common";
import { AiGatewayRecipeReaderService } from "@/src/infrastructure/services/ai-gateway-recipe-reader.service";
import { MockLoggerService } from "@/src/infrastructure/services/mock-logger.service";

// A stand-in model: answers with `text`, or throws `error`, and records what it was sent.
function fakeModel(answer: { text: string } | { error: unknown }) {
  return new MockLanguageModelV4({
    doGenerate: async () => {
      if ("error" in answer) throw answer.error;
      return {
        content: [{ type: "text", text: answer.text }],
        finishReason: { unified: "stop", raw: undefined },
        usage: {
          inputTokens: {
            total: 10,
            noCache: 10,
            cacheRead: undefined,
            cacheWrite: undefined,
          },
          outputTokens: { total: 20, text: 20, reasoning: undefined },
        },
        warnings: [],
      };
    },
  });
}

const reading = {
  recipeFound: true,
  title: " Tomato Soup ",
  description: "",
  timeMinutes: 42.4,
  yieldServings: 0,
  ingredients: [
    {
      raw: "1 can (14 ounces) crushed tomatoes",
      section: null,
      quantity: 1,
      unit: "can",
      name: "crushed tomatoes (14 ounces)",
      note: null,
      optional: false,
      catalogName: "Crushed Tomatoes",
      aisle: "canned-and-jarred",
    },
    {
      raw: "Basil, to serve",
      section: "To serve",
      quantity: 0,
      unit: null,
      name: "Basil",
      note: "to serve",
      optional: true,
      catalogName: "basil",
      aisle: "produce",
    },
    {
      raw: "  ",
      section: null,
      quantity: null,
      unit: null,
      name: "",
      note: null,
      optional: false,
      catalogName: null,
      aisle: null,
    },
  ],
  steps: [
    { text: "Simmer for 20 to 25 minutes.", timerMinutes: 19.6 },
    { text: " ", timerMinutes: null },
  ],
  unsure: ["The yield is smudged.", ""],
};

const reader = (model: MockLanguageModelV4) =>
  new AiGatewayRecipeReaderService(new MockLoggerService(), model);

// Keeps every log line, as the text it would print.
function recordingLogger() {
  const lines: string[] = [];
  const logger: ILoggerService = {
    debug: (message, context) => lines.push(message + JSON.stringify(context)),
    info: (message, context) => lines.push(message + JSON.stringify(context)),
    warn: (message, context) => lines.push(message + JSON.stringify(context)),
    error: (message, context) => lines.push(message + JSON.stringify(context)),
    child: () => logger,
  };
  return { logger, lines };
}

describe("AiGatewayRecipeReaderService", () => {
  it("sends the pasted text with the instructions, and tidies the answer into a draft", async () => {
    const model = fakeModel({ text: JSON.stringify(reading) });
    const draft = await reader(model).read({
      kind: "text",
      text: "Tomato soup…",
    });

    const [call] = model.doGenerateCalls;
    expect(call?.prompt[0]).toMatchObject({ role: "system" });
    expect(call?.prompt[1]).toMatchObject({
      role: "user",
      content: [
        {
          type: "text",
          text: "<recipe_source>\nTomato soup…\n</recipe_source>",
        },
      ],
    });
    expect(draft).toEqual({
      title: "Tomato Soup",
      description: null,
      timeMinutes: 42,
      yieldServings: null,
      ingredients: [
        {
          raw: "1 can (14 ounces) crushed tomatoes",
          section: null,
          quantity: 1,
          unit: "can",
          name: "crushed tomatoes (14 ounces)",
          note: null,
          optional: false,
          catalogName: "Crushed Tomatoes",
          aisle: "canned-and-jarred",
        },
        {
          raw: "Basil, to serve",
          section: "To serve",
          quantity: null,
          unit: null,
          name: "Basil",
          note: "to serve",
          optional: true,
          catalogName: "basil",
          aisle: "produce",
        },
      ],
      steps: [
        {
          text: "Simmer for 20 to 25 minutes.",
          timerMinutes: 20,
          section: null,
        },
      ],
      unsure: ["The yield is smudged."],
    });
  });

  it("sends a photo as an image file", async () => {
    const model = fakeModel({ text: JSON.stringify(reading) });
    await reader(model).read({
      kind: "image",
      images: [
        { data: new Uint8Array([0xff, 0xd8, 0xff]), mediaType: "image/jpeg" },
      ],
    });

    expect(model.doGenerateCalls[0]?.prompt[1]).toMatchObject({
      role: "user",
      content: [{ type: "file", mediaType: "image/jpeg" }],
    });
  });

  // The note is the app's, so it goes with the instructions, not beside the source.
  it("says a long screenshot's pieces are one screenshot, then sends them in order", async () => {
    const model = fakeModel({ text: JSON.stringify(reading) });
    const piece = {
      data: new Uint8Array([0xff, 0xd8, 0xff]),
      mediaType: "image/jpeg",
    };
    await reader(model).read({ kind: "image", images: [piece, piece] });

    const [system, user] = model.doGenerateCalls[0]?.prompt ?? [];
    expect(JSON.stringify(system)).toContain("one long screenshot");
    expect(user).toMatchObject({
      role: "user",
      content: [
        { type: "file", mediaType: "image/jpeg" },
        { type: "file", mediaType: "image/jpeg" },
      ],
    });
  });

  it("logs a failure without the recipe it was sent", async () => {
    const { logger, lines } = recordingLogger();
    const error = new GatewayInternalServerError({
      message: "Free tier users do not have access to this model.",
      statusCode: 403,
      cause: { requestBodyValues: { prompt: "SECRET FAMILY RECIPE" } },
    });
    await expect(
      new AiGatewayRecipeReaderService(logger, fakeModel({ error })).read({
        kind: "text",
        text: "SECRET FAMILY RECIPE",
      }),
    ).rejects.toMatchObject({ reason: "service-unavailable" });

    expect(lines.join("\n")).toContain("Free tier users");
    expect(lines.join("\n")).not.toContain("SECRET FAMILY RECIPE");
  });

  it.each([
    {
      when: "no recipe in the source",
      answer: { text: JSON.stringify({ ...reading, recipeFound: false }) },
      reason: "no-recipe-found",
    },
    {
      when: "an answer that isn't the expected shape",
      answer: { text: "Sorry, I can't help with that." },
      reason: "no-recipe-found",
    },
    {
      when: "the Gateway budget is spent (402)",
      answer: {
        error: new GatewayInternalServerError({
          message: "Quota exceeded",
          statusCode: 402,
        }),
      },
      reason: "budget-paused",
    },
    {
      when: "any other failure",
      answer: { error: new Error("socket hang up") },
      reason: "service-unavailable",
    },
  ])(
    "$when fails with a reason the person can act on",
    async ({ answer, reason }) => {
      const failed = reader(fakeModel(answer)).read({
        kind: "text",
        text: "x",
      });
      await expect(failed).rejects.toBeInstanceOf(RecipeReadError);
      await expect(failed).rejects.toMatchObject({ reason });
    },
  );
});
