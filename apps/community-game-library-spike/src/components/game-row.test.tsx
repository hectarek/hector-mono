import { render } from "@solidjs/testing-library";
import { describe, expect, test } from "vitest";
import type { Game } from "@/src/entities/game";
import { GameRow, gameFacts } from "./game-row";

const NIGHT_TIDE: Game = {
  id: "0f859789-2f69-44a0-8986-e65ce94235f9",
  type: "expansion",
  title: "Night Tide",
  year: 2024,
  publishers: null,
  minPlayers: 2,
  maxPlayers: 6,
  bestPlayers: null,
  minMinutes: 60,
  maxMinutes: 75,
  minAge: 10,
  complexity: "medium",
  description: null,
  popularity: 300,
};

describe("<GameRow />", () => {
  test("links to the game and shows its title, facts and an expansion stamp", () => {
    const { getByRole, getByText } = render(() => (
      <ul>
        <GameRow game={NIGHT_TIDE} />
      </ul>
    ));
    expect(getByRole("link")).toHaveAttribute(
      "href",
      `/games/${NIGHT_TIDE.id}`,
    );
    expect(getByText("Night Tide")).toBeInTheDocument();
    expect(getByText("2–6 · 60–75 min")).toBeInTheDocument();
    expect(getByText("Expansion")).toBeInTheDocument();
  });

  test("leaves out the facts a game doesn't have", () => {
    expect(
      gameFacts({
        minPlayers: null,
        maxPlayers: null,
        minMinutes: 30,
        maxMinutes: 30,
      }),
    ).toBe("30 min");
  });
});
