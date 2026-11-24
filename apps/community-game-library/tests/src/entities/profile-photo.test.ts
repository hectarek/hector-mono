import { describe, expect, it } from "bun:test";
import { startingPhotoOf } from "@/src/entities/profile-photo";

// A4's photo starts from the picture a Google sign-up came with (Hector, 2026-11-24).
describe("startingPhotoOf", () => {
  it("asks Google for its picture at 400px, not the 96 a sign-in gives", () => {
    expect(
      startingPhotoOf("https://lh3.googleusercontent.com/a/robin-vale=s96-c"),
    ).toBe("https://lh3.googleusercontent.com/a/robin-vale=s400-c");
  });

  it("keeps an https address with no size in it as it is", () => {
    expect(startingPhotoOf("https://pictures.example/robin.png")).toBe(
      "https://pictures.example/robin.png",
    );
  });

  it("has none for an email sign-up, an address that isn't https, or one that isn't an address", () => {
    for (const image of [
      null,
      undefined,
      "",
      "http://pictures.example/robin.png",
      "robin.png",
    ]) {
      expect(startingPhotoOf(image)).toBeNull();
    }
  });
});
