import { beforeEach, describe, expect, it } from "bun:test";
import {
  readRecipeFromLink,
  readRecipeFromPhoto,
  readRecipeFromText,
} from "@/app/actions/import";
import { getInjection } from "@/di/container";
import type { MockRecipePageFetcherService } from "@/src/infrastructure/services/mock-recipe-page-fetcher.service";
import type { MockRecipeReaderService } from "@/src/infrastructure/services/mock-recipe-reader.service";
import { form } from "@/tests/_support/form";
import { resetNextState } from "@/tests/_support/next";

const reader = () =>
  getInjection("IRecipeReaderService") as MockRecipeReaderService;
const pages = () =>
  getInjection("IRecipePageFetcherService") as MockRecipePageFetcherService;

const withPhoto = (bytes: number, type = "image/jpeg") => {
  const data = new FormData();
  data.set("photo-1", new File([new Uint8Array(bytes)], "photo.jpg", { type }));
  return data;
};
const jpeg = (bytes: number) =>
  new File([new Uint8Array(bytes)], "piece.jpg", { type: "image/jpeg" });
const sizes = () => {
  const source = reader().sources.at(-1);
  return source?.kind === "image"
    ? source.photos.map((photo) => photo.map((image) => image.data.byteLength))
    : [];
};

describe("readRecipeFromPhoto", () => {
  beforeEach(() => {
    resetNextState();
    reader().failWith = null;
  });

  it("reads the photo into a draft to check", async () => {
    const result = await readRecipeFromPhoto(withPhoto(1000));
    expect(result).toMatchObject({ draft: { title: "Chili", flagged: [] } });
    expect(reader().sources.at(-1)).toMatchObject({
      kind: "image",
      photos: [[{ mediaType: "image/jpeg" }]],
    });
  });

  // A long screenshot arrives as pieces, top to bottom (P14.11).
  it("sends every piece of a long screenshot, in order", async () => {
    const data = withPhoto(1000);
    data.append("photo-1", jpeg(2000));
    await readRecipeFromPhoto(data);
    expect(sizes()).toEqual([[1000, 2000]]);
  });

  // D53: up to 3 photos of one recipe, each in a field of its own.
  it("sends several photos in order, each with its own pieces", async () => {
    const data = withPhoto(1000);
    data.append("photo-2", jpeg(2000));
    data.append("photo-2", jpeg(3000));
    data.append("photo-3", jpeg(4000));
    await readRecipeFromPhoto(data);
    expect(sizes()).toEqual([[1000], [2000, 3000], [4000]]);
  });

  it("says why when the recipe can't be read", async () => {
    reader().failWith = "no-recipe-found";
    expect(await readRecipeFromPhoto(withPhoto(1000))).toEqual({
      error: "No recipe found there. Try another photo or link.",
    });
  });

  it("asks for a photo when it gets anything else", async () => {
    for (const data of [withPhoto(10, "application/pdf"), new FormData()]) {
      expect(await readRecipeFromPhoto(data)).toEqual({
        error: "Choose up to 3 photos: JPEG, PNG or WebP, under 4 MB in all.",
      });
    }
  });
});

describe("readRecipeFromLink", () => {
  beforeEach(() => {
    resetNextState();
    reader().failWith = null;
    pages().failWith = null;
  });

  it("reads the linked page into a draft, with where it came from", async () => {
    pages().pages.set(
      "https://example.com/toast",
      `<script type="application/ld+json">${JSON.stringify({
        "@type": "Recipe",
        name: "Toast",
        image: "https://example.com/toast.jpg",
        recipeIngredient: ["2 slices bread"],
      })}</script>`,
    );
    expect(
      await readRecipeFromLink(form({ url: "example.com/toast" })),
    ).toMatchObject({
      draft: { title: "Toast" },
      sourceUrl: "https://example.com/toast",
      imageUrl: "https://example.com/toast.jpg",
    });
  });

  it("says why a page couldn't be read", async () => {
    pages().failWith = "blocked";
    expect(
      await readRecipeFromLink(form({ url: "https://example.com/x" })),
    ).toEqual({ error: "That site won't let the app read it." });
    expect(await readRecipeFromLink(form({ url: "toast" }))).toEqual({
      error: "That doesn't look like a link to a web page.",
    });
  });
});

describe("readRecipeFromText", () => {
  beforeEach(() => {
    resetNextState();
    reader().failWith = null;
  });

  it("reads pasted text into a draft", async () => {
    expect(
      await readRecipeFromText(form({ text: "Chili\n1 lb beans\nSimmer." })),
    ).toMatchObject({ draft: { title: "Chili" } });
    expect(reader().sources.at(-1)).toEqual({
      kind: "text",
      text: "Chili\n1 lb beans\nSimmer.",
    });
  });

  it("asks for text when there's none", async () => {
    expect(await readRecipeFromText(form({ text: "  " }))).toEqual({
      error: "Paste the recipe's text first.",
    });
  });
});
