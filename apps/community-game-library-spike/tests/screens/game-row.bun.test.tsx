import { describe, expect, test } from "bun:test";
import { render } from "@solidjs/testing-library";
import { GameRow } from "@/src/components/game-row";
import type { Game } from "@/src/entities/game";

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

describe("<GameRow /> under bun:test", () => {
  test("renders the title and facts", () => {
    const { getByText } = render(() => (
      <ul>
        <GameRow game={NIGHT_TIDE} />
      </ul>
    ));
    expect(getByText("Night Tide").textContent).toBe("Night Tide");
    expect(getByText("2–6 · 60–75 min")).toBeTruthy();
  });
});
