import { describe } from "bun:test";
import { PLAN_TIME_ZONE, todayIn } from "@/src/entities/week";
import { getGameController } from "@/src/interface-adapters/controllers/catalog/get-game.controller";
import { searchGamesController } from "@/src/interface-adapters/controllers/catalog/search-games.controller";
import { CAST } from "@/tests/_support/cast";
import { controllerBasics } from "@/tests/_support/controller";

const { you } = CAST.people;

describe("getGameController", () => {
  controllerBasics({
    make: (useCase, logger) => getGameController(useCase, logger),
    valid: { gameId: CAST.games.harborLights.id },
    calledWith: [CAST.games.harborLights.id, you.id, todayIn(PLAN_TIME_ZONE)],
    invalid: {
      "an id that isn't one": { gameId: "harbor-lights" },
      "no id": {},
    },
  });
});

describe("searchGamesController", () => {
  controllerBasics({
    make: (useCase, logger) => searchGamesController(useCase, logger),
    valid: { q: "harbor" },
    calledWith: ["harbor", you.id, todayIn(PLAN_TIME_ZONE)],
    invalid: {
      "no words": {},
      "far more than a title": { q: "x".repeat(201) },
    },
  });
});
