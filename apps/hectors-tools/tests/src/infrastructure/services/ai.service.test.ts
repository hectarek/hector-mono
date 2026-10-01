import { describe, expect, it } from "bun:test";
import { MockLanguageModelV4 } from "ai/test";
import { z } from "zod";
import { AiService } from "@/src/infrastructure/services/ai.service";
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

const schema = z.object({ score: z.number(), verdict: z.string() });
const answer = { score: 72, verdict: "A solid fit." };

const service = (model: MockLanguageModelV4) =>
  new AiService(new MockLoggerService(), model);

describe("AiService", () => {
  it("sends the system prompt as instructions and returns the parsed object", async () => {
    const model = fakeModel({ text: JSON.stringify(answer) });
    const result = await service(model).generateObject({
      schema,
      system: "You are a recruiter.",
      prompt: "Score this resume.",
    });

    expect(result).toEqual(answer);
    const [call] = model.doGenerateCalls;
    expect(call?.prompt).toMatchObject([
      { role: "system", content: "You are a recruiter." },
      { role: "user", content: [{ type: "text", text: "Score this resume." }] },
    ]);
  });

  it("sends files with the prompt as one user message", async () => {
    const model = fakeModel({ text: JSON.stringify(answer) });
    await service(model).generateObject({
      schema,
      prompt: "Score the attached resume.",
      files: [
        {
          data: new Uint8Array([0x25, 0x50, 0x44, 0x46]),
          mediaType: "application/pdf",
        },
      ],
    });

    expect(model.doGenerateCalls[0]?.prompt).toMatchObject([
      {
        role: "user",
        content: [
          { type: "text", text: "Score the attached resume." },
          { type: "file", mediaType: "application/pdf" },
        ],
      },
    ]);
  });
});
