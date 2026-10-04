import { describe, expect, it } from "bun:test";
import { chosenFilesKind, recipeFileKind } from "@/app/_lib/recipe-file";

describe("recipeFileKind", () => {
  it("reads images as photos", () => {
    expect(recipeFileKind({ name: "page.jpg", type: "image/jpeg" })).toBe(
      "photo",
    );
    expect(recipeFileKind({ name: "IMG_1.HEIC", type: "image/heic" })).toBe(
      "photo",
    );
  });

  it("reads a PDF as a PDF, by type or by extension", () => {
    expect(recipeFileKind({ name: "chili.pdf", type: "application/pdf" })).toBe(
      "pdf",
    );
    expect(recipeFileKind({ name: "Chili.PDF", type: "" })).toBe("pdf");
  });

  it("reads text and Markdown files as text, by type or by extension", () => {
    expect(recipeFileKind({ name: "chili.txt", type: "text/plain" })).toBe(
      "text",
    );
    expect(recipeFileKind({ name: "Chili.MD", type: "" })).toBe("text");
    expect(recipeFileKind({ name: "notes", type: "text/markdown" })).toBe(
      "text",
    );
  });

  it("takes nothing else", () => {
    expect(
      recipeFileKind({
        name: "chili.docx",
        type: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      }),
    ).toBeNull();
    expect(
      recipeFileKind({ name: "chili.html", type: "text/html" }),
    ).toBeNull();
  });
});

// D53: one file of any kind, or up to 3 photos of one recipe.
describe("chosenFilesKind", () => {
  const photo = { name: "page.jpg", type: "image/jpeg" };
  const pdf = { name: "chili.pdf", type: "application/pdf" };

  it("takes one file of any kind it reads, or up to 3 photos", () => {
    expect(chosenFilesKind([pdf])).toBe("pdf");
    expect(chosenFilesKind([photo, photo, photo])).toBe("photo");
  });

  it("refuses a fourth photo, a mix, two PDFs, and nothing at all", () => {
    expect(chosenFilesKind([photo, photo, photo, photo])).toBeNull();
    expect(chosenFilesKind([photo, pdf])).toBeNull();
    expect(chosenFilesKind([pdf, pdf])).toBeNull();
    expect(chosenFilesKind([])).toBeNull();
  });
});
