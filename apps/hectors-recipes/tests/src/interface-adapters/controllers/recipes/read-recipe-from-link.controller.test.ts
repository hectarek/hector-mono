import { describe } from "bun:test";
import { readRecipeFromLinkController } from "@/src/interface-adapters/controllers/recipes/read-recipe-from-link.controller";
import { OWNER } from "@/tests/_support/app";
import { controllerBasics } from "@/tests/_support/controller";

describe("readRecipeFromLinkController", () => {
  controllerBasics({
    make: (useCase, logger) => readRecipeFromLinkController(useCase, logger),
    // Typed without https://, as people do.
    valid: { url: "  budgetbytes.com/sweet-and-spicy-glazed-chicken-thighs/ " },
    calledWith: [
      "https://budgetbytes.com/sweet-and-spicy-glazed-chicken-thighs/",
      OWNER,
    ],
    invalid: {
      "no link": { url: "  " },
      "not a web link": { url: "ftp://example.com/recipe" },
      "not a link at all": { url: "my nana's toast" },
      "a word, not a site": { url: "toast" },
    },
  });
});
