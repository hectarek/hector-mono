import { describe, expect, it, mock } from "bun:test";
import { UnauthenticatedError } from "@/src/entities/errors/common";
import { MockLoggerService } from "@/src/infrastructure/services/mock-logger.service";
import { addGameController } from "@/src/interface-adapters/controllers/suggestions/add-game.controller";
import { answerSuggestionController } from "@/src/interface-adapters/controllers/suggestions/answer-suggestion.controller";
import { findGamesToEditController } from "@/src/interface-adapters/controllers/suggestions/find-games-to-edit.controller";
import { getGameToEditController } from "@/src/interface-adapters/controllers/suggestions/get-game-to-edit.controller";
import { getSuggestionController } from "@/src/interface-adapters/controllers/suggestions/get-suggestion.controller";
import { listSuggestionsController } from "@/src/interface-adapters/controllers/suggestions/list-suggestions.controller";
import { suggestGameController } from "@/src/interface-adapters/controllers/suggestions/suggest-game.controller";
import { updateGameController } from "@/src/interface-adapters/controllers/suggestions/update-game.controller";
import { CAST } from "@/tests/_support/cast";
import { controllerBasics } from "@/tests/_support/controller";

const { you } = CAST.people;
const SUGGESTION = "00000000-0000-4000-8000-000000000a01";
const GAME = CAST.games.harborLights.id;

// A G3 or G4 form as it's sent: strings, empty where nothing was typed.
const form = {
  type: "base-game",
  baseGameId: "",
  title: " Fog Lantern ",
  year: "2024",
  publishers: "Small Hours Press, Tidewater Games",
  designers: "",
  minPlayers: "2",
  maxPlayers: "5",
  bestPlayers: "3, 4",
  minMinutes: "",
  maxMinutes: "45",
  minAge: "10",
  complexity: "light",
  categories: "Family",
  description: "",
  imageUrl: "",
  videoUrl: "https://video.example/fog",
};
const record = {
  type: "base-game",
  baseGameId: null,
  title: "Fog Lantern",
  year: 2024,
  publishers: ["Small Hours Press", "Tidewater Games"],
  designers: null,
  minPlayers: 2,
  maxPlayers: 5,
  bestPlayers: [3, 4],
  minMinutes: null,
  maxMinutes: 45,
  minAge: 10,
  complexity: "light",
  categories: ["Family"],
  description: null,
  imageUrl: null,
  videoUrl: "https://video.example/fog",
};

describe("suggestGameController", () => {
  controllerBasics({
    make: (useCase, logger) => suggestGameController(useCase, logger),
    valid: {
      title: " Fog Lantern ",
      year: "",
      publisher: "",
      sourceUrl: "https://boardgames.example/fog",
      photo: null,
    },
    calledWith: [
      {
        title: "Fog Lantern",
        year: null,
        publisher: null,
        sourceUrl: "https://boardgames.example/fog",
      },
      null,
      you.id,
    ],
    invalid: {
      "no title": {
        title: " ",
        year: "",
        publisher: "",
        sourceUrl: "",
        photo: null,
      },
      "a year that isn't one": {
        title: "Fog",
        year: "next year",
        publisher: "",
        sourceUrl: "",
        photo: null,
      },
      "a link that isn't one": {
        title: "Fog",
        year: "",
        publisher: "",
        sourceUrl: "fog lantern",
        photo: null,
      },
    },
  });
});

describe("answerSuggestionController", () => {
  controllerBasics({
    make: (useCase, logger) => answerSuggestionController(useCase, logger),
    valid: {
      suggestionId: SUGGESTION,
      answer: { status: "declined", declineNote: " A puzzle " },
    },
    calledWith: [
      SUGGESTION,
      { status: "declined", declineNote: "A puzzle" },
      you.id,
    ],
    invalid: {
      "a decline with no reason": {
        suggestionId: SUGGESTION,
        answer: { status: "declined", declineNote: " " },
      },
      "added, which is add-game's": {
        suggestionId: SUGGESTION,
        answer: { status: "added", gameId: GAME },
      },
    },
  });
});

describe("addGameController", () => {
  controllerBasics({
    make: (useCase, logger) => addGameController(useCase, logger),
    valid: { ...form, photo: null, suggestionId: SUGGESTION },
    calledWith: [record, null, SUGGESTION, you.id],
    invalid: {
      "no title": { ...form, title: "", photo: null, suggestionId: "" },
      "a complexity that isn't a word": {
        ...form,
        complexity: "2.4",
        photo: null,
        suggestionId: "",
      },
      "best counts that aren't counts": {
        ...form,
        bestPlayers: "three",
        photo: null,
        suggestionId: "",
      },
    },
  });
});

describe("updateGameController", () => {
  controllerBasics({
    make: (useCase, logger) => updateGameController(useCase, logger),
    valid: { ...form, gameId: GAME, photo: null },
    calledWith: [GAME, record, null, you.id],
    invalid: { "no game": { ...form, gameId: "", photo: null } },
  });
});

describe("the admin's reads", () => {
  controllerBasics({
    make: (useCase, logger) => getSuggestionController(useCase, logger),
    valid: { suggestionId: SUGGESTION },
    calledWith: [SUGGESTION, you.id],
    invalid: { "an id that isn't one": { suggestionId: "fog" } },
  });
  controllerBasics({
    make: (useCase, logger) => getGameToEditController(useCase, logger),
    valid: { gameId: GAME },
    calledWith: [GAME, you.id],
    invalid: { "an id that isn't one": { gameId: "harbor" } },
  });
  controllerBasics({
    make: (useCase, logger) => findGamesToEditController(useCase, logger),
    valid: { q: "harbor" },
    calledWith: ["harbor", you.id],
    invalid: { "far more than a title": { q: "x".repeat(201) } },
  });

  it("turns away a signed-out visitor from the waiting suggestions", async () => {
    const useCase = mock(async () => []);
    const controller = listSuggestionsController(
      useCase as never,
      new MockLoggerService(),
    );
    await expect(controller(undefined)).rejects.toBeInstanceOf(
      UnauthenticatedError,
    );
    await controller(you.id);
    expect(useCase).toHaveBeenCalledWith(you.id);
  });
});
