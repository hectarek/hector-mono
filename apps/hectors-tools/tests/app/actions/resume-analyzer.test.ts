import { beforeEach, describe, expect, it } from "bun:test";
import { analyzeResume } from "@/app/actions/resume-analyzer";
import { getInjection } from "@/di/container";
import type { MockAiService } from "@/src/infrastructure/services/mock-ai.service";

const ai = () => getInjection("IAiService") as MockAiService;

function resumeForm(): FormData {
  const data = new FormData();
  data.set("jobDescription", "Senior TypeScript engineer");
  data.set("resumeText", "Five years of TypeScript and React.");
  return data;
}

describe("analyzeResume", () => {
  beforeEach(() => {
    ai().failWith = null;
  });

  it("returns the analysis", async () => {
    expect(await analyzeResume(null, resumeForm())).toMatchObject({
      result: { matchScore: 72 },
    });
  });

  it.each([
    {
      reason: "unusable-answer",
      error: "The analysis came back incomplete. Try again.",
    },
    {
      reason: "budget-paused",
      error: "The analyzer is paused: its AI budget is used up.",
    },
    {
      reason: "service-unavailable",
      error: "The analyzer isn't answering. Try again in a minute.",
    },
  ] as const)(
    "says why when the AI fails ($reason)",
    async ({ reason, error }) => {
      ai().failWith = reason;
      expect(await analyzeResume(null, resumeForm())).toEqual({ error });
    },
  );
});
