// The catalog's reads as server functions: plain calls on the server, typed fetches to
// /_server in the browser. They play the controllers' part, calling the use cases from DI.
import { query } from "@solidjs/router";
import { getInjection } from "@/di/container";

export const searchGames = query(async (text: string) => {
  "use server";
  if (!text.trim()) return [];
  return getInjection("ISearchGamesUseCase")({ query: text });
}, "search-games");

export const getGame = query(async (id: string) => {
  "use server";
  return (await getInjection("IGetGameUseCase")(id)) ?? null;
}, "game");
