import { describe, expect, it, mock } from "bun:test";
import { InputParseError } from "@/src/entities/errors/common";
import type { ChangeContext } from "@/src/entities/models/activity.model";
import type { CurrentActor } from "@/src/entities/models/actor.model";
import { MockLoggerService } from "@/src/infrastructure/services/mock-logger.service";
import { getWeekController } from "@/src/interface-adapters/controllers/week/get-week.controller";
import { saveWeeklyReviewController } from "@/src/interface-adapters/controllers/week/save-weekly-review.controller";
import { OWNER } from "@/tests/_support/app";

const CLAUDE: ChangeContext = { actor: "agent", ownerId: OWNER };
const CLAUDE_READING: CurrentActor = { actor: "agent", ownerId: OWNER };

const unreached = () =>
  mock(async (): Promise<never> => {
    throw new Error("not reached");
  });

describe("getWeekController", () => {
  it("hands the use case the owner's id and the week's Monday", async () => {
    const useCase = unreached();
    await getWeekController(useCase, new MockLoggerService())(
      { week: "2026-10-19" },
      CLAUDE_READING,
    ).catch(() => {});
    expect(useCase).toHaveBeenCalledWith(OWNER, { week: "2026-10-19" });
  });

  it("rejects a day that isn't a Monday before the use case runs", async () => {
    const useCase = unreached();
    await expect(
      getWeekController(useCase, new MockLoggerService())(
        { week: "2026-10-21" },
        CLAUDE_READING,
      ),
    ).rejects.toBeInstanceOf(InputParseError);
    expect(useCase).not.toHaveBeenCalled();
  });
});

describe("saveWeeklyReviewController", () => {
  it("hands the use case who's saving and the review as read", async () => {
    const useCase = unreached();
    await saveWeeklyReviewController(useCase, new MockLoggerService())(
      { week: "2026-10-19", milestone: "  Shipped  ", updatedAt: null },
      CLAUDE,
    ).catch(() => {});
    expect(useCase).toHaveBeenCalledWith(CLAUDE, {
      week: "2026-10-19",
      milestone: "Shipped",
      updatedAt: null,
    });
  });

  it("rejects a review with no updatedAt before the use case runs", async () => {
    const useCase = unreached();
    await expect(
      saveWeeklyReviewController(useCase, new MockLoggerService())(
        { week: "2026-10-19" },
        CLAUDE,
      ),
    ).rejects.toBeInstanceOf(InputParseError);
    expect(useCase).not.toHaveBeenCalled();
  });
});
