import { describe, expect, it } from "bun:test";
import { produceFor } from "@/app/_components/produce-tile";

describe("produceFor", () => {
  it("gives the same recipe the same colour every time", () => {
    const id = "68fd1b27-ce76-4f18-ba9c-a102874a186f";
    expect(produceFor(id)).toBe(produceFor(id));
  });

  it("uses all five produce colours across recipes", () => {
    const seen = new Set(
      Array.from({ length: 200 }, (_, index) => produceFor(`recipe-${index}`)),
    );
    expect([...seen].sort()).toEqual([
      "basil",
      "carrot",
      "lemon",
      "plum",
      "tomato",
    ]);
  });
});
