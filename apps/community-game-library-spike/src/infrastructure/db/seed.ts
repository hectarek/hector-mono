import { toSearchTitle } from "@/src/entities/search-title";
import type { Database } from "@/src/infrastructure/db/database";
import { games } from "@/src/infrastructure/db/schema";

type SeedGame = Omit<typeof games.$inferInsert, "searchTitle" | "id">;

// Fictional games in the canvas's spirit, plus one real title for the typo test (KTD10).
const SEED: SeedGame[] = [
  {
    title: "Harbor Lights",
    year: 2021,
    publishers: ["Lantern Press"],
    minPlayers: 2,
    maxPlayers: 5,
    bestPlayers: [4],
    minMinutes: 45,
    maxMinutes: 60,
    minAge: 10,
    complexity: "medium",
    description:
      "Light a path home for the fishing fleet before the storm rolls in.",
    popularity: 900,
  },
  {
    title: "Moss & Mortar",
    year: 2023,
    publishers: ["Kiln & Co."],
    minPlayers: 1,
    maxPlayers: 4,
    bestPlayers: [2, 3],
    minMinutes: 30,
    maxMinutes: 45,
    minAge: 8,
    complexity: "light",
    description: "Build a garden wall stone by stone while the moss creeps in.",
    popularity: 640,
  },
  {
    title: "The Salt Road",
    year: 2019,
    publishers: ["Caravan Games"],
    minPlayers: 3,
    maxPlayers: 6,
    bestPlayers: [5],
    minMinutes: 90,
    maxMinutes: 120,
    minAge: 14,
    complexity: "heavy",
    description: "Trade salt across the desert and keep your camels fed.",
    popularity: 410,
  },
  {
    title: "Copper Canals",
    year: 2022,
    publishers: ["Lantern Press"],
    minPlayers: 2,
    maxPlayers: 4,
    bestPlayers: [3],
    minMinutes: 60,
    maxMinutes: 75,
    minAge: 12,
    complexity: "medium",
    description: "Dig canals between mill towns and carry ore downstream.",
    popularity: 520,
  },
  {
    title: "Ticket to Ride",
    year: 2004,
    publishers: ["Days of Wonder"],
    minPlayers: 2,
    maxPlayers: 5,
    bestPlayers: [4],
    minMinutes: 30,
    maxMinutes: 60,
    minAge: 8,
    complexity: "light",
    description: "Claim railway routes across North America.",
    popularity: 990,
  },
];

export async function seedGames(db: Database): Promise<void> {
  const inserted = await db
    .insert(games)
    .values(
      SEED.map((game) => ({ ...game, searchTitle: toSearchTitle(game.title) })),
    )
    .returning({ id: games.id, title: games.title });
  const harbor = inserted.find((row) => row.title === "Harbor Lights");
  if (!harbor) return;
  await db.insert(games).values({
    type: "expansion",
    baseGameId: harbor.id,
    title: "Night Tide",
    searchTitle: toSearchTitle("Night Tide"),
    year: 2024,
    publishers: ["Lantern Press"],
    minPlayers: 2,
    maxPlayers: 6,
    minMinutes: 60,
    maxMinutes: 75,
    minAge: 10,
    complexity: "medium",
    description: "The fleet sails after dark, and a sixth harbor opens.",
    popularity: 300,
  });
}
