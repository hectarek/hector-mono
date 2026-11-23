import { describe, expect, it } from "bun:test";
import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { LINK_PREVIEWS, previewMetadata } from "@/app/_lib/link-previews";

const APP = join(import.meta.dir, "../..");
// A PNG's width and height, from its header.
async function sizeOf(path: string): Promise<[number, number]> {
  const header = new DataView((await readFile(join(APP, path))).buffer);
  return [header.getUint32(16), header.getUint32(20)];
}

describe("link previews and icons (Y2, R39, R36, R43)", () => {
  it("say Y2's words for the app, a friend's link and a night's link, the same for every link", () => {
    expect(
      Object.values(LINK_PREVIEWS).map(({ title, line }) => [title, line]),
    ).toEqual([
      ["Community Game Library", "Your friends’ board games, in one place."],
      ["A friend sent you their link", "A friend sent you their link"],
      ["You’re invited to a game night", "You’re invited to a game night"],
    ]);
  });

  it("point a page's preview at its image, large", () => {
    expect(previewMetadata("night")).toMatchObject({
      openGraph: {
        title: "You’re invited to a game night",
        images: [{ url: "/previews/night.png", width: 1200, height: 630 }],
      },
      twitter: { card: "summary_large_image" },
    });
  });

  it("keep each image at the size its page and the manifest say", async () => {
    for (const kind of Object.keys(LINK_PREVIEWS)) {
      expect(await sizeOf(`public/previews/${kind}.png`)).toEqual([1200, 630]);
    }
    expect(await sizeOf("public/icons/icon-192.png")).toEqual([192, 192]);
    expect(await sizeOf("public/icons/icon-512.png")).toEqual([512, 512]);
    expect(await sizeOf("app/apple-icon.png")).toEqual([180, 180]);
  });
});
