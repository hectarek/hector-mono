import { describe, expect, it } from "bun:test";
import manifest from "@/app/manifest";

describe("the manifest (R43, Y2)", () => {
  it("puts the app on a home screen as Game Library, full screen, on kraft", () => {
    expect(manifest()).toMatchObject({
      name: "Community Game Library",
      short_name: "Game Library",
      start_url: "/",
      display: "standalone",
      background_color: "#d9bc8c",
      theme_color: "#d9bc8c",
    });
  });

  it("has the icon at 192 and 512, and one a phone may mask", () => {
    expect(
      manifest().icons?.map((icon) => [icon.src, icon.sizes, icon.purpose]),
    ).toEqual([
      ["/icons/icon-192.png", "192x192", "any"],
      ["/icons/icon-512.png", "512x512", "any"],
      ["/icons/icon-512.png", "512x512", "maskable"],
    ]);
  });
});
