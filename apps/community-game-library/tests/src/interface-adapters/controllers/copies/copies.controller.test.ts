import { describe, expect, it, mock } from "bun:test";
import { UnauthenticatedError } from "@/src/entities/errors/common";
import { EMPTY_VIEW } from "@/src/entities/library-filters";
import { PLAN_TIME_ZONE, todayIn } from "@/src/entities/week";
import { MockLoggerService } from "@/src/infrastructure/services/mock-logger.service";
import { addUserGameController } from "@/src/interface-adapters/controllers/copies/add-user-game.controller";
import { getUserGameController } from "@/src/interface-adapters/controllers/copies/get-user-game.controller";
import { listLibraryController } from "@/src/interface-adapters/controllers/copies/list-library.controller";
import { listMyLibraryController } from "@/src/interface-adapters/controllers/copies/list-my-library.controller";
import { putInBoxController } from "@/src/interface-adapters/controllers/copies/put-in-box.controller";
import { removeUserGameController } from "@/src/interface-adapters/controllers/copies/remove-user-game.controller";
import { setLendingController } from "@/src/interface-adapters/controllers/copies/set-lending.controller";
import { setPassAlongForAllController } from "@/src/interface-adapters/controllers/copies/set-pass-along-for-all.controller";
import { updateUserGameController } from "@/src/interface-adapters/controllers/copies/update-user-game.controller";
import { CAST } from "@/tests/_support/cast";
import { controllerBasics } from "@/tests/_support/controller";

const { you } = CAST.people;
const COPY = CAST.copies.yourGullAndAnchor.id;

describe("addUserGameController", () => {
  controllerBasics({
    make: (useCase, logger) => addUserGameController(useCase, logger),
    valid: { gameId: CAST.games.harborMaster.id },
    calledWith: [CAST.games.harborMaster.id, you.id],
    invalid: { "an id that isn't one": { gameId: "harbor-master" } },
  });
});

describe("updateUserGameController", () => {
  controllerBasics({
    make: (useCase, logger) => updateUserGameController(useCase, logger),
    valid: {
      userGameId: COPY,
      condition: "worn",
      conditionNote: "  Lid torn ",
      expansionIds: [CAST.games.lowTide.id],
    },
    calledWith: [
      COPY,
      {
        condition: "worn",
        conditionNote: "Lid torn",
        expansionIds: [CAST.games.lowTide.id],
      },
      you.id,
    ],
    invalid: {
      "a condition that isn't listed": {
        userGameId: COPY,
        condition: "mint",
        conditionNote: "",
        expansionIds: [],
      },
      "an expansion id that isn't one": {
        userGameId: COPY,
        condition: "good",
        conditionNote: "",
        expansionIds: ["low-tide"],
      },
    },
  });
});

describe("setLendingController", () => {
  controllerBasics({
    make: (useCase, logger) => setLendingController(useCase, logger),
    valid: { userGameId: COPY, lendable: false },
    calledWith: [COPY, { lendable: false, passAlong: undefined }, you.id],
    invalid: { "neither switch": { userGameId: COPY } },
  });
});

describe("setPassAlongForAllController", () => {
  controllerBasics({
    make: (useCase, logger) => setPassAlongForAllController(useCase, logger),
    valid: { passAlong: true },
    calledWith: [true, you.id],
    invalid: { "not on or off": { passAlong: "yes" } },
  });
});

describe("putInBoxController", () => {
  controllerBasics({
    make: (useCase, logger) => putInBoxController(useCase, logger),
    valid: { gameId: CAST.games.nightTide.id },
    calledWith: [CAST.games.nightTide.id, you.id],
    invalid: { "an id that isn't one": { gameId: "night-tide" } },
  });
});

describe("removeUserGameController", () => {
  controllerBasics({
    make: (useCase, logger) => removeUserGameController(useCase, logger),
    valid: { userGameId: COPY },
    calledWith: [COPY, you.id],
    invalid: { "no copy": {} },
  });
});

describe("getUserGameController", () => {
  controllerBasics({
    make: (useCase, logger) => getUserGameController(useCase, logger),
    valid: { userGameId: COPY },
    calledWith: [COPY, you.id, todayIn(PLAN_TIME_ZONE)],
    invalid: { "an id that isn't one": { userGameId: "gull" } },
  });
});

describe("listMyLibraryController", () => {
  it("turns away a signed-out visitor, and reads the member's own library", async () => {
    const useCase = mock(async () => undefined);
    const controller = listMyLibraryController(
      useCase as never,
      new MockLoggerService(),
    );

    await expect(controller({}, undefined)).rejects.toBeInstanceOf(
      UnauthenticatedError,
    );
    await controller({ sort: "recently-added" }, you.id);
    expect(useCase).toHaveBeenCalledWith(you.id, todayIn(PLAN_TIME_ZONE), {
      ...EMPTY_VIEW,
      sort: "recently-added",
    });
  });
});

describe("listLibraryController", () => {
  it("turns away a signed-out visitor, and reads the address's view (R13)", async () => {
    const useCase = mock(async () => undefined);
    const controller = listLibraryController(
      useCase as never,
      new MockLoggerService(),
    );

    await expect(controller({}, undefined)).rejects.toBeInstanceOf(
      UnauthenticatedError,
    );
    await controller(
      { available: "now", sort: "year", time: "forever" },
      you.id,
    );
    expect(useCase).toHaveBeenCalledWith(you.id, todayIn(PLAN_TIME_ZONE), {
      ...EMPTY_VIEW,
      available: true,
      sort: "year",
    });
  });
});
