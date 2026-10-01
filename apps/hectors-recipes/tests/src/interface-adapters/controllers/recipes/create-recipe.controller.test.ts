import { describe } from "bun:test";
import { createRecipeController } from "@/src/interface-adapters/controllers/recipes/create-recipe.controller";
import { OWNER } from "@/tests/_support/app";
import { controllerBasics, ID } from "@/tests/_support/controller";

describe("createRecipeController", () => {
  controllerBasics({
    make: (useCase, logger) => createRecipeController(useCase, logger),
    valid: {
      spaceId: ID,
      data: {
        title: " Chili ",
        tags: ["Dinner", " dinner "],
        ingredients: [{ raw: "1 lb beans" }],
      },
    },
    calledWith: [
      {
        title: "Chili",
        tags: ["dinner"],
        ingredients: [{ raw: "1 lb beans" }],
      },
      ID,
      OWNER,
    ],
    invalid: {
      "a missing title": {
        spaceId: ID,
        data: { title: " ", ingredients: [{ raw: "x" }] },
      },
      "no ingredients": { spaceId: ID, data: { title: "x", ingredients: [] } },
      "a source that isn't a URL": {
        spaceId: ID,
        data: { title: "x", sourceUrl: "nytimes", ingredients: [{ raw: "x" }] },
      },
      "zero servings": {
        spaceId: ID,
        data: { title: "x", yieldServings: 0, ingredients: [{ raw: "x" }] },
      },
    },
  });
});
