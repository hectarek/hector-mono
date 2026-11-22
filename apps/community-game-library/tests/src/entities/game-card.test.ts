import { beforeEach, describe, expect, it } from "bun:test";
import { gameCard } from "@/src/entities/game-card";
import { makeApp } from "@/tests/_support/app";
import { CAST, CAST_TODAY } from "@/tests/_support/cast";

const { you } = CAST.people;
const { games } = CAST;

describe("game-card", () => {
  let app: ReturnType<typeof makeApp>;
  const cardOf = async (gameId: string) => {
    const view = await app.getGame(gameId, you.id, CAST_TODAY);
    const card = gameCard(view.copies, view.people, you.id);
    return {
      owners: card.ownerLine,
      line: card.stateLine,
      stamp: `${card.stamp.word} (${card.stamp.tone})`,
    };
  };

  beforeEach(async () => {
    app = makeApp();
    await app.makeCast();
  });

  it("AE1: of two copies, one out until Nov 20, the card says 1 of 2 available", async () => {
    expect(await cardOf(games.harborLights.id)).toEqual({
      owners: "Sam’s and Alice’s",
      line: "1 of 2 available",
      stamp: "Available (navy)",
    });
  });

  it("gives each of B1's cards for You on the kit's today", async () => {
    const cards = {
      fenwickFair: {
        owners: "Priya’s",
        line: "You’re 1st in line",
        stamp: "Out to Nov 24 (brown)",
      },
      gullAndAnchor: {
        owners: "Yours",
        line: "Jo has it · 1 in line",
        stamp: "Overdue (late)",
      },
      mossAndMortar: {
        owners: "Sam’s",
        line: "You have it",
        stamp: "Due Fri (navy)",
      },
      nightMarket: {
        owners: "Yours",
        line: "Priya asked for it",
        stamp: "Requested (red)",
      },
      paperKites: {
        owners: "Yours",
        line: "Kept at home",
        stamp: "Not lent (brown)",
      },
      quarryLane: {
        owners: "Sam’s",
        line: "No answer yet",
        stamp: "You asked (brown)",
      },
      saltAndSignal: {
        owners: "Yours and Jo’s",
        line: "2 of 2 available",
        stamp: "Available (navy)",
      },
      tinKettleDerby: {
        owners: "Alice’s",
        line: "1 of 1 available",
        stamp: "Available (navy)",
      },
    } as const;

    for (const [game, card] of Object.entries(cards)) {
      expect({
        game,
        ...(await cardOf(games[game as keyof typeof cards].id)),
      }).toEqual({ game, ...card });
    }
  });
});
