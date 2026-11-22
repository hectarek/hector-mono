import { beforeEach, expect, it } from "bun:test";
import { DatabaseOperationError } from "@/src/entities/errors/common";
import { userProfileSchema } from "@/src/entities/models/user-profile.model";
import { describeEachBackend, makeApp } from "@/tests/_support/app";
import { CAST } from "@/tests/_support/cast";

const { you, sam, noor } = CAST.people;
const NEWCOMER = "00000000-0000-4000-8000-0000000000a1";

describeEachBackend("IUserProfilesRepository", () => {
  let app: ReturnType<typeof makeApp>;

  beforeEach(async () => {
    app = makeApp();
    await app.makeCast();
  });

  it("reads a member's whole profile by their id", async () => {
    const profile = await app.repos.userProfiles.getByUserId(sam.id);

    expect(userProfileSchema.parse(profile)).toMatchObject({
      userId: sam.id,
      name: "Sam",
      pieceShape: "house",
      pieceColor: "ocean",
      phone: "555 0142",
      photoKey: null,
    });
  });

  it("reads nothing for someone with no profile", async () => {
    expect(await app.repos.userProfiles.getByUserId(NEWCOMER)).toBeUndefined();
  });

  // KTD4: a list of people may hold people who aren't the viewer's friends (two borrowers in a
  // pass-along, people at one night), so it never loads a phone or a photo.
  it("lists names and pieces only, in user-id order, leaving out anyone without a profile", async () => {
    expect(
      await app.repos.userProfiles.getManyByUserIds([
        noor.id,
        NEWCOMER,
        you.id,
        noor.id,
      ]),
    ).toEqual([
      {
        userId: you.id,
        name: "Robin Vale",
        pieceShape: "pawn",
        pieceColor: "mustard",
      },
      { userId: noor.id, name: "Noor", pieceShape: "ship", pieceColor: "teal" },
    ]);
    expect(await app.repos.userProfiles.getManyByUserIds([])).toEqual([]);
  });

  it("creates a profile with no photo, and refuses a second for the same member", async () => {
    const created = await app.repos.userProfiles.create({
      userId: NEWCOMER,
      name: "Quinn",
      pieceShape: "cone",
      pieceColor: "pumpkin",
    });

    expect(created).toMatchObject({ phone: null, photoKey: null });
    expect(await app.repos.userProfiles.getByUserId(NEWCOMER)).toEqual(created);
    await expect(
      app.repos.userProfiles.create({
        userId: NEWCOMER,
        name: "Quinn again",
        pieceShape: "pawn",
        pieceColor: "bone",
      }),
    ).rejects.toBeInstanceOf(DatabaseOperationError);
  });

  it("changes only what it's given, for that member only", async () => {
    await app.repos.userProfiles.update(sam.id, {
      name: "Samuel",
      phone: null,
      photoKey: "profile-photos/sam.jpg",
      pieceColor: undefined,
    });

    expect(await app.repos.userProfiles.getByUserId(sam.id)).toMatchObject({
      name: "Samuel",
      pieceShape: "house",
      pieceColor: "ocean",
      phone: null,
      photoKey: "profile-photos/sam.jpg",
    });
    expect(await app.repos.userProfiles.getByUserId(you.id)).toMatchObject({
      name: "Robin Vale",
      phone: "555 0199",
    });
  });
});
