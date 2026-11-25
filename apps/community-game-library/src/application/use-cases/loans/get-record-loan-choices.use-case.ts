import type { IFriendshipsRepository } from "@/src/application/repositories/friendships.repository.interface";
import type { IGamesRepository } from "@/src/application/repositories/games.repository.interface";
import type { ILoansRepository } from "@/src/application/repositories/loans.repository.interface";
import type { IUserGamesRepository } from "@/src/application/repositories/user-games.repository.interface";
import type { IUserProfilesRepository } from "@/src/application/repositories/user-profiles.repository.interface";
import { copyState } from "@/src/entities/loan";
import type { Game } from "@/src/entities/models/game.model";
import type { NameAndPiece } from "@/src/entities/models/user-profile.model";

export type IGetRecordLoanChoicesUseCase = ReturnType<
  typeof getRecordLoanChoicesUseCase
>;

// What Record a loan (C9) offers: the member's copies they lend that are home, by title, each
// with its game (for the cover) and the friend first in its line ("Night Market · Priya asked
// for it"), and their friends by name, for Who's taking it.
export type RecordLoanChoices = {
  copies: {
    userGameId: string;
    game: Game;
    askedBy: NameAndPiece | null;
  }[];
  friends: NameAndPiece[];
};

// Each read waits for the one before (KTD2).
export const getRecordLoanChoicesUseCase = (
  userGamesRepository: IUserGamesRepository,
  loansRepository: ILoansRepository,
  gamesRepository: IGamesRepository,
  friendshipsRepository: IFriendshipsRepository,
  userProfilesRepository: IUserProfilesRepository,
) => {
  return async (userId: string, today: string): Promise<RecordLoanChoices> => {
    const own = (await userGamesRepository.listOwn(userId)).filter(
      (copy) => copy.lendable,
    );
    const loans = await loansRepository.listOpenForCopies(
      own.map((copy) => copy.id),
    );
    const home = own.flatMap((copy) => {
      const state = copyState(
        copy,
        loans.filter((loan) => loan.userGameId === copy.id),
        userId,
        today,
      );
      return state.holder || state.promised
        ? []
        : [{ copy, first: state.line[0] ?? null }];
    });
    const games = new Map(
      (
        await gamesRepository.listByIds([
          ...new Set(home.map(({ copy }) => copy.gameId)),
        ])
      ).map((game) => [game.id, game]),
    );
    const friendIds = await friendshipsRepository.listFriendIds(userId);
    const people = new Map(
      (
        await userProfilesRepository.getManyByUserIds([
          ...new Set([
            ...friendIds,
            ...home.flatMap(({ first }) => first?.borrowerUserId ?? []),
          ]),
        ])
      ).map((person) => [person.userId, person]),
    );
    return {
      copies: home
        .flatMap(({ copy, first }) => {
          const game = games.get(copy.gameId);
          return game
            ? [
                {
                  userGameId: copy.id,
                  game,
                  askedBy: (first && people.get(first.borrowerUserId)) ?? null,
                },
              ]
            : [];
        })
        .sort((a, b) => a.game.title.localeCompare(b.game.title)),
      friends: friendIds
        .flatMap((id) => people.get(id) ?? [])
        .sort((a, b) => a.name.localeCompare(b.name)),
    };
  };
};
