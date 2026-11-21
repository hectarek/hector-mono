import { beforeEach, expect, it } from "bun:test";
import { NotFoundError } from "@/src/entities/errors/common";
import { describeEachBackend, makeApp } from "@/tests/_support/app";
import { CAST } from "@/tests/_support/cast";

const { you, alice, dev } = CAST.people;
const NO_ACCOUNT = "00000000-0000-4000-8000-0000000000a1";

// How a refusal looks to whoever asked: the same for a stranger as for no one at all.
async function refusal(check: Promise<void>): Promise<unknown> {
  try {
    await check;
  } catch (err) {
    return err instanceof Error
      ? { class: err.constructor, name: err.name, message: err.message }
      : err;
  }
  throw new Error("It let them through");
}

// The check before reading another member's things (KTD4), on the cast.
describeEachBackend("requireFriend", () => {
  let app: ReturnType<typeof makeApp>;

  beforeEach(async () => {
    app = makeApp();
    await app.makeCast();
  });

  it("lets a friend through, either way round", async () => {
    expect(await app.requireFriend(you.id, alice.id)).toBeUndefined();
    expect(await app.requireFriend(alice.id, you.id)).toBeUndefined();
  });

  // AE8's rule: Dev has an account and is Alice's friend, but not yours, so for you his account
  // might as well not exist.
  it("answers a stranger with Not found, as for an id with no account", async () => {
    const stranger = await refusal(app.requireFriend(you.id, dev.id));

    expect(stranger).toEqual({
      class: NotFoundError,
      name: "NotFoundError",
      message: "Resource not found",
    });
    expect(await refusal(app.requireFriend(you.id, NO_ACCOUNT))).toEqual(
      stranger,
    );
  });

  it("refuses a friend once they've unfriended", async () => {
    await app.repos.friendships.remove(alice.id, you.id);

    await expect(app.requireFriend(you.id, alice.id)).rejects.toBeInstanceOf(
      NotFoundError,
    );
  });

  it("refuses the member themself: nobody is their own friend", async () => {
    await expect(app.requireFriend(you.id, you.id)).rejects.toBeInstanceOf(
      NotFoundError,
    );
  });
});
