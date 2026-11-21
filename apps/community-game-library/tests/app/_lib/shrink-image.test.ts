import { describe, expect, it } from "bun:test";
import { fitWithin } from "@/app/_lib/shrink-image";

// KTD11: a photo is shrunk on the phone to at most 800px on its long side before it's sent.
describe("fitWithin", () => {
  it("shrinks the long side to 800px and keeps the shape", () => {
    expect(fitWithin(4032, 3024)).toEqual({ width: 800, height: 600 });
    expect(fitWithin(1080, 1920)).toEqual({ width: 450, height: 800 });
  });

  it("leaves a photo that already fits as it is", () => {
    expect(fitWithin(640, 480)).toEqual({ width: 640, height: 480 });
    expect(fitWithin(800, 800)).toEqual({ width: 800, height: 800 });
  });
});
