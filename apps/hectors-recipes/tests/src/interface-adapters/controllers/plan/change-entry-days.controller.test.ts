import { describe } from "bun:test";
import { changeEntryDaysController } from "@/src/interface-adapters/controllers/plan/change-entry-days.controller";
import { OWNER } from "@/tests/_support/app";
import { controllerBasics, ID } from "@/tests/_support/controller";

describe("changeEntryDaysController", () => {
  controllerBasics({
    make: (useCase, logger) => changeEntryDaysController(useCase, logger),
    valid: {
      entryId: ID,
      cookDate: "2026-09-24",
      eatDates: ["2026-09-26", "2026-09-24"],
    },
    calledWith: [
      ID,
      { cookDate: "2026-09-24", eatDates: ["2026-09-24", "2026-09-26"] },
      OWNER,
    ],
    invalid: {
      "a date that doesn't exist": {
        entryId: ID,
        cookDate: "2026-02-30",
        eatDates: ["2026-03-01"],
      },
      "eaten before it's cooked": {
        entryId: ID,
        cookDate: "2026-09-24",
        eatDates: ["2026-09-23"],
      },
      "a malformed id": {
        entryId: "nope",
        cookDate: "2026-09-24",
        eatDates: ["2026-09-24"],
      },
    },
  });
});
