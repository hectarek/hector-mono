import { describe, expect, it } from "bun:test";
import FriendLinkPage from "@/app/(main)/friends/link/page";
import { Redirected } from "@/tests/_support/next";

// Your friend link opens as a sheet since 2026-11-25 (E2). Its page's old address, in links and
// bookmarks from before, opens Friends with the sheet open.
describe("/friends/link, from before the sheet", () => {
  it("opens Friends with your friend link's sheet open", () => {
    let sent: unknown;
    try {
      FriendLinkPage();
    } catch (err) {
      sent = err;
    }
    expect(sent).toBeInstanceOf(Redirected);
    expect((sent as Redirected).url).toBe("/friends?show=friend-link");
  });
});
