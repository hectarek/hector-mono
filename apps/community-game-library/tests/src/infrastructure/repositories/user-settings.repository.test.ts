import { beforeEach, expect, it } from "bun:test";
import { DatabaseOperationError } from "@/src/entities/errors/common";
import { userSettingsSchema } from "@/src/entities/models/user-settings.model";
import { describeEachBackend, makeApp } from "@/tests/_support/app";
import { CAST } from "@/tests/_support/cast";

const { you, sam } = CAST.people;
const NEWCOMER = "00000000-0000-4000-8000-0000000000a1";

describeEachBackend("IUserSettingsRepository", () => {
  let app: ReturnType<typeof makeApp>;

  beforeEach(async () => {
    app = makeApp();
    await app.makeCast();
  });

  // The mock's defaults are the table's: E7 draws every group on but the morning-of-a-night
  // reminder.
  it("starts a new member on pass-along off and only the night-morning notices off", async () => {
    const created = await app.repos.userSettings.create({ userId: NEWCOMER });

    expect(userSettingsSchema.parse(created)).toMatchObject({
      userId: NEWCOMER,
      defaultPassAlong: false,
      noticesOff: ["night-mornings"],
    });
    expect(await app.repos.userSettings.getByUserId(NEWCOMER)).toEqual(created);
  });

  it("refuses a second row of settings for one member", async () => {
    await expect(
      app.repos.userSettings.create({ userId: you.id }),
    ).rejects.toBeInstanceOf(DatabaseOperationError);
  });

  it("holds the cast's switches: Sam lets friends pass his games along, you don't (B6)", async () => {
    expect(await app.repos.userSettings.getByUserId(sam.id)).toMatchObject({
      defaultPassAlong: true,
    });
    expect(await app.repos.userSettings.getByUserId(you.id)).toMatchObject({
      defaultPassAlong: false,
      noticesOff: ["night-mornings"],
    });
  });

  it("changes only what it's given, in the order it's given", async () => {
    await app.repos.userSettings.update(you.id, {
      noticesOff: ["overdue-reminders", "due-date-reminders"],
    });

    expect(await app.repos.userSettings.getByUserId(you.id)).toMatchObject({
      defaultPassAlong: false,
      noticesOff: ["overdue-reminders", "due-date-reminders"],
    });
    expect(await app.repos.userSettings.getByUserId(sam.id)).toMatchObject({
      noticesOff: ["night-mornings"],
    });
  });

  it("reads nothing for someone with no settings", async () => {
    expect(await app.repos.userSettings.getByUserId(NEWCOMER)).toBeUndefined();
  });
});
