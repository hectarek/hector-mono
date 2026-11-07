import { describe, expect, it } from "bun:test";
import * as authPage from "@/app/(auth)/auth/[path]/page";
import * as privatePage from "@/app/(auth)/private/page";
import * as welcome from "@/app/(auth)/welcome/page";
import { metadata } from "@/app/(main)/layout";

describe("the signed-in layout's metadata", () => {
  // The shell renders each signed-in page's title (TabTitle), so none comes from metadata, where a
  // second <title> would leave the browser to pick one.
  it("sets no title", () => {
    expect(metadata.title).toBeNull();
  });

  // R23: the signed-out pages keep the root's generic name.
  it("leaves the signed-out pages none of their own", () => {
    for (const page of [welcome, authPage, privatePage]) {
      expect("metadata" in page || "generateMetadata" in page).toBe(false);
    }
  });
});
