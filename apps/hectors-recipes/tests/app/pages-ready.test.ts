import { describe, expect, test } from "bun:test";
import path from "node:path";

// D104: every page marks itself ready to tap from inside its own content (`ReadyMark`), which
// hides the produce row. A page without one would leave the row hopping until the next page,
// and the root layout's mark is only the shell's.
const APP = path.join(import.meta.dir, "..", "..", "app");

const pages = () =>
  [
    ...new Bun.Glob("**/{page,error,not-found}.tsx").scanSync({ cwd: APP }),
  ].sort();

describe("every page", () => {
  test("renders its own ReadyMark", async () => {
    const without: string[] = [];
    for (const page of pages()) {
      const source = await Bun.file(path.join(APP, page)).text();
      if (!/<ReadyMark \/>/.test(source)) without.push(page);
    }
    expect(without).toEqual([]);
  });

  test("is found by the walk", () => {
    // Guards the walk itself.
    expect(pages()).toContain("(main)/(library)/page.tsx");
    expect(pages().length).toBeGreaterThan(15);
  });
});

describe("the root layout", () => {
  test("marks only the shell", async () => {
    const source = await Bun.file(path.join(APP, "layout.tsx")).text();
    expect(source).toContain('<ReadyMark of="shell" />');
    expect(source).not.toContain("<ReadyMark />");
  });
});
