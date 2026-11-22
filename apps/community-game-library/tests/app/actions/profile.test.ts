import { beforeEach, describe, expect, it } from "bun:test";
import {
  createProfile,
  removePhoto,
  updateProfile,
} from "@/app/actions/profile";
import { getInjection } from "@/di/container";
import {
  MAX_PHOTO_BYTES,
  PHOTO_FAILED_LINE,
} from "@/src/entities/profile-photo";
import { form } from "@/tests/_support/form";
import { QUINN, signInAsMember, storedFor } from "@/tests/_support/members";
import { nextState, signInAsNewUser } from "@/tests/_support/next";

const FIELDS = {
  name: "Quinn Sample",
  pieceShape: "ship",
  pieceColor: "moss",
  phone: "",
};

// A photo the way a form carries it.
function withPhoto(
  fields: Record<string, string>,
  bytes = 10,
  type = "image/jpeg",
) {
  const data = form(fields);
  data.append(
    "photo",
    new File([new Uint8Array(bytes)], "photo.jpg", { type }),
  );
  return data;
}

const profileOf = async (userId: string) =>
  (await getInjection("IGetProfileController")({ userId }, userId)).profile;

describe("createProfile (A4)", () => {
  beforeEach(() => {
    signInAsNewUser();
  });

  it("makes the profile and settings, and says it's saved", async () => {
    const userId = nextState.userId ?? "";
    expect(await createProfile(null, form(FIELDS))).toEqual({
      message: "Profile saved.",
    });
    expect(await profileOf(userId)).toMatchObject({
      name: "Quinn Sample",
      pieceShape: "ship",
      pieceColor: "moss",
      phone: null,
    });
    expect(
      await getInjection("IUserSettingsRepository").getByUserId(userId),
    ).toBeDefined();
    // The header's piece shows on every page.
    expect(nextState.revalidated).toContain("/");
  });

  it("needs a name, and says so under the field", async () => {
    const state = await createProfile(null, form({ ...FIELDS, name: "  " }));
    expect(state).toMatchObject({
      error: "Name is required",
      fields: { name: "Name is required" },
    });
    expect(nextState.revalidated).toEqual([]);
  });

  it("takes only the listed shapes and colors", async () => {
    expect(
      (await createProfile(null, form({ ...FIELDS, pieceShape: "castle" })))
        ?.error,
    ).toBeDefined();
    expect(
      (await createProfile(null, form({ ...FIELDS, pieceColor: "magenta" })))
        ?.error,
    ).toBeDefined();
  });

  it("stores a chosen photo, and keeps its key on the profile", async () => {
    const userId = nextState.userId ?? "";
    await createProfile(null, withPhoto(FIELDS));
    expect((await profileOf(userId)).photoKey).toMatch(
      new RegExp(`^${userId}/`),
    );
    expect(storedFor(userId)).toHaveLength(1);
  });

  it("says 'That photo didn't upload' under Photo for one that's too large, and keeps the profile", async () => {
    const userId = nextState.userId ?? "";
    const state = await createProfile(
      null,
      withPhoto(FIELDS, MAX_PHOTO_BYTES + 1),
    );
    expect(state).toMatchObject({ fields: { photo: PHOTO_FAILED_LINE } });
    expect(storedFor(userId)).toEqual([]);
    // The rest was saved; sending it again updates it.
    expect((await profileOf(userId)).name).toBe("Quinn Sample");
    expect(
      await createProfile(null, form({ ...FIELDS, name: "Quinn Again" })),
    ).toEqual({ message: "Profile saved." });
    expect((await profileOf(userId)).name).toBe("Quinn Again");
  });

  it("refuses a file that isn't a picture", async () => {
    const state = await createProfile(
      null,
      withPhoto(FIELDS, 10, "application/pdf"),
    );
    expect(state).toMatchObject({ fields: { photo: PHOTO_FAILED_LINE } });
  });

  it("asks a signed-out visitor to sign in", async () => {
    nextState.userId = undefined;
    expect((await createProfile(null, form(FIELDS)))?.error).toBe(
      "Your session expired. Sign in again.",
    );
  });
});

describe("updateProfile (E6)", () => {
  beforeEach(async () => {
    await signInAsMember();
  });

  it("saves the changes, and says so", async () => {
    const userId = nextState.userId ?? "";
    expect(
      await updateProfile(null, form({ ...FIELDS, phone: "555 0188" })),
    ).toEqual({ message: "Profile saved." });
    expect(await profileOf(userId)).toMatchObject({
      pieceShape: "ship",
      pieceColor: "moss",
      phone: "555 0188",
    });
    expect(nextState.revalidated).toContain("/");
  });

  it("clears a phone left empty", async () => {
    const userId = nextState.userId ?? "";
    await updateProfile(null, form(FIELDS));
    expect((await profileOf(userId)).phone).toBeNull();
  });

  it("stores a new photo and removes the old picture", async () => {
    const userId = nextState.userId ?? "";
    await updateProfile(null, withPhoto(FIELDS));
    const first = (await profileOf(userId)).photoKey;
    await updateProfile(null, withPhoto(FIELDS, 20));
    const second = (await profileOf(userId)).photoKey;
    expect(second).not.toBe(first);
    expect(storedFor(userId)).toEqual([`profile-photos/${second}`]);
  });

  it("keeps the photo when none is chosen", async () => {
    const userId = nextState.userId ?? "";
    await updateProfile(null, withPhoto(FIELDS));
    const key = (await profileOf(userId)).photoKey;
    await updateProfile(null, form({ ...FIELDS, name: QUINN.name }));
    expect((await profileOf(userId)).photoKey).toBe(key);
  });

  it("takes the photo away", async () => {
    const userId = nextState.userId ?? "";
    await updateProfile(null, withPhoto(FIELDS));
    expect(await removePhoto()).toBeNull();
    expect((await profileOf(userId)).photoKey).toBeNull();
    expect(storedFor(userId)).toEqual([]);
  });
});
