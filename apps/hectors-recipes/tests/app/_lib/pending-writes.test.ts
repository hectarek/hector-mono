import { describe, expect, it } from "bun:test";
import {
  attempt,
  enqueue,
  type PendingWrite,
  parseQueue,
  settle,
} from "@/app/_lib/pending-writes";

const check = (itemId: string, checked = true): PendingWrite => ({
  kind: "check",
  itemId,
  checked,
});
const remove = (itemId: string): PendingWrite => ({ kind: "remove", itemId });

describe("enqueue", () => {
  it("keeps only the latest write per item", () => {
    const queue = enqueue(enqueue([check("a")], check("b")), check("a", false));
    expect(queue).toEqual([check("b"), check("a", false)]);
    expect(enqueue(queue, remove("a"))).toEqual([check("b"), remove("a")]);
  });
});

describe("settle", () => {
  it("drops a write once it's saved", () => {
    expect(settle([check("a"), check("b")], check("a"))).toEqual([check("b")]);
  });

  // Tapped again while the first retry was in flight: the newer tap still has to go.
  it("keeps a newer write for the same item", () => {
    expect(settle([check("a", false)], check("a", true))).toEqual([
      check("a", false),
    ]);
  });
});

describe("parseQueue", () => {
  it("reads what was saved, and ignores anything else", () => {
    expect(parseQueue(JSON.stringify([check("a"), remove("b")]))).toEqual([
      check("a"),
      remove("b"),
    ]);
    expect(parseQueue(null)).toEqual([]);
    expect(parseQueue("not json")).toEqual([]);
    expect(parseQueue(JSON.stringify([{ kind: "check" }]))).toEqual([]);
  });
});

describe("attempt", () => {
  it("is saved, or passes on the server's error", async () => {
    expect(await attempt(async () => null, true)).toBe("saved");
    expect(await attempt(async () => ({ error: "No access" }), true)).toEqual({
      error: "No access",
    });
  });

  it("is offline when the browser says so, without trying", async () => {
    let tried = false;
    const outcome = await attempt(async () => {
      tried = true;
      return null;
    }, false);
    expect(outcome).toBe("offline");
    expect(tried).toBe(false);
  });

  it("is offline when the request never gets an answer", async () => {
    expect(
      await attempt(async () => {
        throw new TypeError("Failed to fetch");
      }, true),
    ).toBe("offline");
  });
});
