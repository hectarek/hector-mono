import type { IGamesRepository } from "@/src/application/repositories/games.repository.interface";
import type { ILoansRepository } from "@/src/application/repositories/loans.repository.interface";
import type { IUserGamesRepository } from "@/src/application/repositories/user-games.repository.interface";
import type { IUserProfilesRepository } from "@/src/application/repositories/user-profiles.repository.interface";
import { type GameCard, gameCard } from "@/src/entities/game-card";
import { copyState } from "@/src/entities/loan";
import type { Game } from "@/src/entities/models/game.model";
import { type SearchOrder, toSearchTitle } from "@/src/entities/search-title";

export type ISearchGamesUseCase = ReturnType<typeof searchGamesUseCase>;

// As many games as a search shows, both groups together.
const SEARCH_LIMIT = 30;

// Search's results in R2's two groups (B10): the games on the shelves you can see, each as its
// library card, then the rest of the catalog, each with its base game when it's an expansion:
// whether you own that base game (B10's "Add Harbor Lights first"), and whether the expansion is
// in one of your boxes already. Listed closest first (B8), every game is in the second group,
// and `yours` says which you own already.
export type SearchResults = {
  onShelves: { game: Game; card: GameCard }[];
  inCatalog: {
    game: Game;
    yours: boolean;
    base: { title: string; yours: boolean; boxed: boolean } | null;
  }[];
};

// Every game in the catalog by its title as it's typed (R2, KTD10). Only your own and your
// friends' copies load (KTD4). Each read waits for the one before (KTD2).
export const searchGamesUseCase = (
  gamesRepository: IGamesRepository,
  userGamesRepository: IUserGamesRepository,
  loansRepository: ILoansRepository,
  userProfilesRepository: IUserProfilesRepository,
) => {
  return async (
    typed: string,
    viewerId: string,
    today: string,
    order: SearchOrder = "shelves-first",
  ): Promise<SearchResults> => {
    const searchTitle = toSearchTitle(typed);
    if (searchTitle === "") {
      return { onShelves: [], inCatalog: [] };
    }
    const visible = await userGamesRepository.listVisible(viewerId);
    const found = await gamesRepository.search(
      searchTitle,
      order === "shelves-first"
        ? [...new Set(visible.map((copy) => copy.gameId))]
        : [],
      SEARCH_LIMIT,
    );

    const shelved = new Set(found.onShelves.map((game) => game.id));
    const copies = visible.filter((copy) => shelved.has(copy.gameId));
    const loans = await loansRepository.listOpenForCopies(
      copies.map((copy) => copy.id),
    );
    const people = Object.fromEntries(
      (
        await userProfilesRepository.getManyByUserIds([
          ...new Set([
            ...copies.map((copy) => copy.userId),
            ...loans.map((loan) => loan.borrowerUserId),
          ]),
        ])
      ).map((person) => [person.userId, person]),
    );
    const bases = new Map(
      (
        await gamesRepository.listByIds([
          ...new Set(found.inCatalog.flatMap((game) => game.baseGameId ?? [])),
        ])
      ).map((base) => [base.id, base]),
    );
    const yourCopies = visible.filter((copy) => copy.userId === viewerId);
    const yours = new Set(yourCopies.map((copy) => copy.gameId));
    // What's in your boxes, read only when an expansion found is one you could put in one.
    const boxable = found.inCatalog.some(
      (game) => game.baseGameId !== null && yours.has(game.baseGameId),
    );
    const boxed = new Set(
      boxable
        ? (
            await userGamesRepository.listExpansionsInBoxes(
              yourCopies.map((copy) => copy.id),
            )
          ).map((row) => row.gameId)
        : [],
    );

    return {
      onShelves: found.onShelves.map((game) => ({
        game,
        card: gameCard(
          copies
            .filter((copy) => copy.gameId === game.id)
            .map((copy) => ({
              copy,
              state: copyState(
                copy,
                loans.filter((loan) => loan.userGameId === copy.id),
                viewerId,
                today,
              ),
            })),
          people,
          viewerId,
        ),
      })),
      inCatalog: found.inCatalog.map((game) => {
        const base = game.baseGameId ? bases.get(game.baseGameId) : undefined;
        return {
          game,
          yours: yours.has(game.id),
          base: base
            ? {
                title: base.title,
                yours: yours.has(base.id),
                boxed: boxed.has(game.id),
              }
            : null,
        };
      }),
    };
  };
};
