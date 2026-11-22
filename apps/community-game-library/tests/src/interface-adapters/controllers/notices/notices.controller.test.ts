import { describe, expect, it, mock, setSystemTime } from "bun:test";
import { INBOX_LIMIT } from "@/src/application/repositories/notices.repository.interface";
import { UnauthenticatedError } from "@/src/entities/errors/common";
import { MockLoggerService } from "@/src/infrastructure/services/mock-logger.service";
import { getTabCountsController } from "@/src/interface-adapters/controllers/notices/get-tab-counts.controller";
import { listInboxController } from "@/src/interface-adapters/controllers/notices/list-inbox.controller";
import { markInboxReadController } from "@/src/interface-adapters/controllers/notices/mark-inbox-read.controller";
import { CAST } from "@/tests/_support/cast";
import { controllerBasics, ID } from "@/tests/_support/controller";

const { you } = CAST.people;

describe("markInboxReadController", () => {
  controllerBasics({
    make: (useCase, logger) => markInboxReadController(useCase, logger),
    valid: { noticeIds: [ID] },
    calledWith: [[ID], you.id],
    invalid: {
      "an id that isn't one": { noticeIds: ["the bell"] },
      "more than the inbox lists": {
        noticeIds: Array.from({ length: INBOX_LIMIT + 1 }, () => ID),
      },
      "no list": {},
    },
  });
});

describe("the inbox's reads for the signed-in member", () => {
  it("listInbox turns away a signed-out user, and passes the member's id on", async () => {
    const useCase = mock(async () => []);
    const controller = listInboxController(
      useCase as never,
      new MockLoggerService(),
    );
    await expect(controller(undefined)).rejects.toBeInstanceOf(
      UnauthenticatedError,
    );
    expect(useCase).not.toHaveBeenCalled();
    await controller(you.id);
    expect(useCase).toHaveBeenCalledWith(you.id);
  });

  it("getTabCounts turns away a signed-out user, and counts as of today in Eastern time (KTD9)", async () => {
    // 8:30 PM on Tue Nov 10 in New York, already Wednesday in UTC.
    setSystemTime(new Date("2026-11-11T01:30:00Z"));
    try {
      const useCase = mock(async () => undefined);
      const controller = getTabCountsController(
        useCase as never,
        new MockLoggerService(),
      );
      await expect(controller(undefined)).rejects.toBeInstanceOf(
        UnauthenticatedError,
      );
      expect(useCase).not.toHaveBeenCalled();
      await controller(you.id);
      expect(useCase).toHaveBeenCalledWith(you.id, "2026-11-10");
    } finally {
      setSystemTime();
    }
  });
});
