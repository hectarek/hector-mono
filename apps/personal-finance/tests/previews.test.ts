import { describe, expect, it } from "bun:test";
import { readdirSync } from "node:fs";
import { join } from "node:path";
import { PREVIEW_CARDS } from "@/src/content/pages";
import { PREVIEW_VERSION } from "@/src/site";

const PREVIEWS = join(import.meta.dir, "../public/previews");

// A PNG's width and height sit at bytes 16 and 20 of its header.
async function pngSize(path: string): Promise<[number, number]> {
  const view = new DataView(await Bun.file(path).arrayBuffer());
  return [view.getUint32(16), view.getUint32(20)];
}

describe("link previews", () => {
  it("has a 1200 by 630 preview for the home page, every topic and every page", async () => {
    for (const card of PREVIEW_CARDS) {
      const file = join(PREVIEWS, `${card.slug}-${PREVIEW_VERSION}.png`);
      expect(await pngSize(file)).toEqual([1200, 630]);
    }
  });

  it("holds no leftover previews from an earlier version or a removed page", () => {
    const expected = PREVIEW_CARDS.map(
      (card) => `${card.slug}-${PREVIEW_VERSION}.png`,
    );
    expect(readdirSync(PREVIEWS).sort()).toEqual([...expected].sort());
  });
});
