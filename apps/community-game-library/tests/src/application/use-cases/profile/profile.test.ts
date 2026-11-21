import { beforeEach, expect, it } from "bun:test";
import { NotFoundError } from "@/src/entities/errors/common";
import type { ProfileForm } from "@/src/entities/models/user-profile.model";
import { describeEachBackend, makeApp } from "@/tests/_support/app";
import { CAST } from "@/tests/_support/cast";

const { you, alice, dev, sam } = CAST.people;
const NEWCOMER = "00000000-0000-4000-8000-0000000000b1";
const FORM: ProfileForm = {
  name: "Quinn Sample",
  pieceShape: "ship",
  pieceColor: "teal",
  phone: null,
};
const jpeg = (size = 10) => ({
  bytes: new Uint8Array(size),
  contentType: "image/jpeg" as const,
});

describeEachBackend("the account after sign-in", () => {
  let app: ReturnType<typeof makeApp>;
  beforeEach(async () => {
    app = makeApp();
    await app.makeCast();
  });

  it("sends an account with no profile to set one up", async () => {
    expect(await app.getAccountState(NEWCOMER)).toEqual({
      state: "needs-profile",
    });
  });

  it("gives a removed account only that, even with a profile", async () => {
    await app.addRemovedUser(alice.id);
    await app.addRemovedUser(NEWCOMER);
    expect(await app.getAccountState(alice.id)).toEqual({ state: "removed" });
    expect(await app.getAccountState(NEWCOMER)).toEqual({ state: "removed" });
  });

  it("gives everyone else the app, with their own piece", async () => {
    expect(await app.getAccountState(you.id)).toEqual({
      state: "ready",
      me: {
        userId: you.id,
        name: you.name,
        pieceShape: you.pieceShape,
        pieceColor: you.pieceColor,
      },
    });
  });
});

describeEachBackend("creating a profile", () => {
  let app: ReturnType<typeof makeApp>;
  beforeEach(() => {
    app = makeApp();
  });

  it("makes the profile and the settings together", async () => {
    await app.createProfile(FORM, NEWCOMER);
    expect(await app.repos.userProfiles.getByUserId(NEWCOMER)).toMatchObject({
      name: "Quinn Sample",
      pieceShape: "ship",
      pieceColor: "teal",
      phone: null,
      photoKey: null,
    });
    expect(await app.repos.userSettings.getByUserId(NEWCOMER)).toMatchObject({
      defaultPassAlong: false,
    });
    expect(await app.getAccountState(NEWCOMER)).toMatchObject({
      state: "ready",
    });
  });

  it("keeps the phone it was given", async () => {
    await app.createProfile({ ...FORM, phone: "555 0100" }, NEWCOMER);
    expect((await app.repos.userProfiles.getByUserId(NEWCOMER))?.phone).toBe(
      "555 0100",
    );
  });

  it("updates the profile when a second send finds it there", async () => {
    await app.createProfile(FORM, NEWCOMER);
    await app.createProfile({ ...FORM, name: "Quinn Again" }, NEWCOMER);
    expect((await app.repos.userProfiles.getByUserId(NEWCOMER))?.name).toBe(
      "Quinn Again",
    );
    expect(await app.repos.userSettings.getByUserId(NEWCOMER)).toMatchObject({
      defaultPassAlong: false,
    });
  });
});

describeEachBackend("editing a profile", () => {
  let app: ReturnType<typeof makeApp>;
  beforeEach(async () => {
    app = makeApp();
    await app.makeCast();
  });

  it("saves the name, piece and phone, and clears a phone left empty", async () => {
    await app.updateProfile(FORM, you.id);
    expect(await app.repos.userProfiles.getByUserId(you.id)).toMatchObject({
      name: "Quinn Sample",
      pieceShape: "ship",
      pieceColor: "teal",
      phone: null,
    });
  });

  it("refuses an account with no profile", async () => {
    await expect(app.updateProfile(FORM, NEWCOMER)).rejects.toBeInstanceOf(
      NotFoundError,
    );
  });
});

describeEachBackend("reading a profile", () => {
  let app: ReturnType<typeof makeApp>;
  beforeEach(async () => {
    app = makeApp();
    await app.makeCast();
  });

  it("gives the member their own, phone included", async () => {
    const view = await app.getProfile(you.id, you.id);
    expect(view.profile.phone).toBe(you.phone ?? null);
    expect(view.photoUrl).toBeNull();
  });

  it("gives a signed address that lasts an hour for a photo", async () => {
    await app.setPhoto(jpeg(), you.id);
    const { profile, photoUrl } = await app.getProfile(you.id, you.id);
    expect(photoUrl).toBe(
      `https://storage.test/profile-photos/${profile.photoKey}?expires-in=3600`,
    );
  });

  it("gives a friend theirs, and a stranger the Not found of no account", async () => {
    expect((await app.getProfile(alice.id, you.id)).profile.name).toBe(
      alice.name,
    );
    await expect(app.getProfile(dev.id, you.id)).rejects.toBeInstanceOf(
      NotFoundError,
    );
  });

  it("lists the pieces friends took, by name", async () => {
    const taken = await app.listTakenPieces(you.id);
    expect(taken.map((one) => one.name)).toEqual([
      "Alice",
      "Ben",
      "Jo",
      "Priya",
      "Sam",
    ]);
    expect(taken.find((one) => one.userId === sam.id)).toMatchObject({
      pieceShape: sam.pieceShape,
      pieceColor: sam.pieceColor,
    });
    expect(Object.keys(taken[0] ?? {}).sort()).toEqual([
      "name",
      "pieceColor",
      "pieceShape",
      "userId",
    ]);
  });
});

describeEachBackend("a profile photo", () => {
  let app: ReturnType<typeof makeApp>;
  beforeEach(async () => {
    app = makeApp();
    await app.makeCast();
  });

  const key = async (userId: string) =>
    (await app.repos.userProfiles.getByUserId(userId))?.photoKey;

  it("is stored in the private bucket, with its key on the row", async () => {
    await app.setPhoto(jpeg(), you.id);
    const stored = await key(you.id);
    expect(stored).toMatch(new RegExp(`^${you.id}/[0-9a-f-]+\\.jpg$`));
    expect([...app.files.keys()]).toEqual([`profile-photos/${stored}`]);
  });

  it("is replaced by a new one, which removes the old picture", async () => {
    await app.setPhoto(jpeg(), you.id);
    const first = await key(you.id);
    await app.setPhoto(jpeg(20), you.id);
    const second = await key(you.id);
    expect(second).not.toBe(first);
    expect([...app.files.keys()]).toEqual([`profile-photos/${second}`]);
  });

  it("is taken away, and the file with it", async () => {
    await app.setPhoto(jpeg(), you.id);
    await app.removePhoto(you.id);
    expect(await key(you.id)).toBeNull();
    expect(app.files.size).toBe(0);
    // Again, with none: nothing to do.
    await app.removePhoto(you.id);
  });

  it("needs a profile", async () => {
    await expect(app.setPhoto(jpeg(), NEWCOMER)).rejects.toBeInstanceOf(
      NotFoundError,
    );
    expect(app.files.size).toBe(0);
  });

  it("is never kept unused when the row can't take its key", async () => {
    const failing = makeApp({
      ...app.repos,
      transactions: {
        startTransaction: async () => {
          throw new Error("down");
        },
      },
    });
    await expect(failing.setPhoto(jpeg(), you.id)).rejects.toThrow("down");
    expect(failing.files.size).toBe(0);
  });
});
