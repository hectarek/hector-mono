import { describe } from "bun:test";
import {
  MAX_PHOTO_PIECES,
  MAX_PHOTOS,
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
  photos: [[piece(bytes, mediaType)]],
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
      "no photo": { kind: "image", photos: [] },
      "a photo with no images": { kind: "image", photos: [[]] },
      "photos past the cap in all": {
        kind: "image",
        photos: [
          [piece(MAX_RECIPE_IMAGE_BYTES / 2 + 1)],
          [piece(MAX_RECIPE_IMAGE_BYTES / 2)],
        ],
      },
      "more images than a read takes": {
        kind: "image",
        photos: [
          Array.from({ length: MAX_PHOTO_PIECES }, () => piece(10)),
          [piece(10)],
        ],
      },
      "more photos than a read takes": {
        kind: "image",
        photos: Array.from({ length: MAX_PHOTOS + 1 }, () => [piece(10)]),
      },
      "a link (read by the page fetcher, not here)": {
        kind: "link",
        url: "https://example.com",
      },
      "an empty PDF": { kind: "document", pdf: new Uint8Array(0) },
      "a PDF past the cap": {
        kind: "document",
        pdf: new Uint8Array(MAX_RECIPE_IMAGE_BYTES + 1),
      },
    },
  });
});

// D53: up to MAX_PHOTOS photos of one recipe pass through in order, pieces and all.
describe("readRecipeController, photos", () => {
  const photos = [[piece(10)], [piece(20), piece(30)], [piece(40)]];
  controllerBasics({
    make: (useCase, logger) => readRecipeController(useCase, logger),
    valid: { kind: "image", photos },
    calledWith: [{ kind: "image", photos }, OWNER],
    invalid: {
      "a photo that isn't a list of images": {
        kind: "image",
        photos: [piece(10)],
      },
    },
  });
});

// D53: a PDF passes through as it is; its pages are counted when it's read.
describe("readRecipeController, a PDF", () => {
  const pdf = new Uint8Array([0x25, 0x50, 0x44, 0x46]);
  controllerBasics({
    make: (useCase, logger) => readRecipeController(useCase, logger),
    valid: { kind: "document", pdf },
    calledWith: [{ kind: "document", pdf }, OWNER],
    invalid: {
      "a PDF that isn't bytes": { kind: "document", pdf: "%PDF" },
    },
  });
});
