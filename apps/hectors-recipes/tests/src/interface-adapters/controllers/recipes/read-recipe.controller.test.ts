import { describe } from "bun:test";
import {
  MAX_PHOTO_PIECES,
  MAX_RECIPE_TEXT,
} from "@/src/entities/models/recipe-draft.model";
import {
  MAX_RECIPE_IMAGE_BYTES,
  readRecipeController,
} from "@/src/interface-adapters/controllers/recipes/read-recipe.controller";
import { OWNER } from "@/tests/_support/app";
import { controllerBasics } from "@/tests/_support/controller";

const piece = (bytes: number, mediaType = "image/jpeg") => ({
  data: new Uint8Array(bytes),
  mediaType,
});
const photo = (bytes: number, mediaType = "image/jpeg") => ({
  kind: "image",
  images: [piece(bytes, mediaType)],
});

describe("readRecipeController", () => {
  controllerBasics({
    make: (useCase, logger) => readRecipeController(useCase, logger),
    valid: { kind: "text", text: "  Chili\n1 lb beans  " },
    calledWith: [{ kind: "text", text: "Chili\n1 lb beans" }, OWNER],
    invalid: {
      "blank text": { kind: "text", text: "   " },
      "text past the cap": {
        kind: "text",
        text: "x".repeat(MAX_RECIPE_TEXT + 1),
      },
      "an empty photo": photo(0),
      "a photo past the cap": photo(MAX_RECIPE_IMAGE_BYTES + 1),
      "a file that isn't an image": photo(10, "application/pdf"),
      "no photo": { kind: "image", images: [] },
      "pieces past the cap in all": {
        kind: "image",
        images: [
          piece(MAX_RECIPE_IMAGE_BYTES / 2 + 1),
          piece(MAX_RECIPE_IMAGE_BYTES / 2),
        ],
      },
      "more pieces than a screenshot is cut into": {
        kind: "image",
        images: Array.from({ length: MAX_PHOTO_PIECES + 1 }, () => piece(10)),
      },
      "a link (read by the page fetcher, not here)": {
        kind: "link",
        url: "https://example.com",
      },
    },
  });
});
