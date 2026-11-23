import { beforeEach, expect, it } from "bun:test";
import { NotFoundError } from "@/src/entities/errors/common";
import { splitTables } from "@/src/entities/tables";
import { whatToPlay } from "@/src/entities/what-to-play";
import { describeEachBackend, makeApp } from "@/tests/_support/app";
import { CAST } from "@/tests/_support/cast";

const { you, alice } = CAST.people;
const { heavyGamesAtMine, saturdayGameNight } = CAST.nights;

describeEachBackend("What should we play? and tables (U20)", () => {
  let app: ReturnType<typeof makeApp>;

  beforeEach(async () => {
    app = makeApp();
    await app.makeCast();
  });

  it("starts D8 from the night: 6 going with Ben's guest, 3 hours, and the games on its table with their votes", async () => {
    const choices = await app.whatToPlay(heavyGamesAtMine.id, you.id);
    expect(choices).toMatchObject({ people: 6, minutes: 180 });
    expect(
      choices.onTable.map((one) => [
        one.title,
        one.votes,
        one.owners.map((owner) => owner.name),
      ]),
    ).toEqual([
      ["Night Market", 3, ["Robin Vale"]],
      ["Salt & Signal", 0, ["Robin Vale"]],
      ["Quarry Lane", 4, ["Sam"]],
      ["Harbor Lights", 1, ["Sam"]],
    ]);
  });

  it("finds D8's fits among all friends' games, Quarry Lane first, with the rest left out and why", async () => {
    const { allGames } = await app.whatToPlay(heavyGamesAtMine.id, you.id);
    // Each game once: Harbor Lights on the table, though Alice has one too.
    expect(
      allGames.filter((one) => one.title === "Harbor Lights"),
    ).toHaveLength(1);
    const { fits, leftOut } = whatToPlay(allGames, {
      people: 6,
      minutes: 180,
      complexity: "medium",
    });
    expect(
      fits.map(({ game, players, facts }) => [
        game.title,
        players,
        facts,
        game.onTable,
      ]),
    ).toEqual([
      ["Quarry Lane", "Plays 6, best at 5", "90 min · medium", true],
      ["Night Market", "Plays 6, best at 5", "60–90 min · medium", true],
    ]);
    expect(leftOut.map((one) => one.reason)).toContain(
      "Harbor Lights seats 5 at most.",
    );
    expect(leftOut.map((one) => one.reason)).toContain(
      "Salt & Signal seats 2.",
    );
    expect(leftOut.map((one) => one.reason)).toContain(
      "Tin Kettle Derby is light.",
    );
  });

  it("gives D9 the people going in order, the host first and Ben's guest with Ben", async () => {
    const choices = await app.splitTables(heavyGamesAtMine.id, you.id);
    expect(
      choices.parties.map(({ member, guests }) => [member.name, guests]),
    ).toEqual([
      ["Robin Vale", 0],
      ["Sam", 0],
      ["Priya", 0],
      ["Jo", 0],
      ["Ben", 1],
    ]);
    const { splits, oneTable, fromTable } = splitTables(
      choices.parties,
      choices.onTable,
      choices.allGames,
      choices.minutes,
    );
    expect(fromTable).toBe(true);
    expect(
      splits[0]?.map((table) => [
        table.fit.game.title,
        table.parties.map(({ member }) => member.name),
      ]),
    ).toEqual([
      ["Quarry Lane", ["Robin Vale", "Sam", "Priya"]],
      ["Night Market", ["Jo", "Ben"]],
    ]);
    expect(oneTable?.game.title).toBe("Quarry Lane");
  });

  it("is Not found for someone who can't see the night (KTD4)", async () => {
    await expect(
      app.whatToPlay(heavyGamesAtMine.id, alice.id),
    ).rejects.toBeInstanceOf(NotFoundError);
    await expect(
      app.splitTables(heavyGamesAtMine.id, alice.id),
    ).rejects.toBeInstanceOf(NotFoundError);
    expect((await app.whatToPlay(saturdayGameNight.id, you.id)).people).toBe(4);
  });
});
