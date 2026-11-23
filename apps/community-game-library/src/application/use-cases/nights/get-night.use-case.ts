import type { IFriendshipsRepository } from "@/src/application/repositories/friendships.repository.interface";
import type { IGameNightsRepository } from "@/src/application/repositories/game-nights.repository.interface";
import type { IGamesRepository } from "@/src/application/repositories/games.repository.interface";
import type { IUserGamesRepository } from "@/src/application/repositories/user-games.repository.interface";
import type { IUserProfilesRepository } from "@/src/application/repositories/user-profiles.repository.interface";
import { nightToSee } from "@/src/application/use-cases/nights/can-see-night";
import { mayInvite } from "@/src/application/use-cases/nights/invite-to-night.use-case";
import {
  type NightCard,
  type NightGoer,
  nightCards,
} from "@/src/application/use-cases/nights/night-cards";
import { NotFoundError } from "@/src/entities/errors/common";
import type { Game } from "@/src/entities/models/game.model";
import type { GameNightAttendee } from "@/src/entities/models/game-night-attendee.model";
import type { NameAndPiece } from "@/src/entities/models/user-profile.model";
import { waitlistOf } from "@/src/entities/night";

export type IGetNightUseCase = ReturnType<typeof getNightUseCase>;

// A game on the night's table, who brings it, and who'd play it (D2, D7, D13: "Sam brings it",
// "3 want to play").
export type GameOnTable = {
  userGameId: string;
  game: Game;
  owner: NameAndPiece;
  // In the order they joined the night's list.
  voters: NameAndPiece[];
};

// Someone on the night's list, with their answer.
export type NightPerson = NameAndPiece &
  Pick<GameNightAttendee, "status" | "guestCount" | "invitedBy">;

// A night's page (D2, D4, D7, D13): its card, with who said maybe, everyone else on its list,
// the waitlist in its order, and the games on its table, most wanted first. The night's link
// reaches only someone who may invite (D7, D10).
export type NightPage = NightCard & {
  maybe: NameAndPiece[];
  // Everyone on the list but the host, in the order they joined it.
  list: NightPerson[];
  waitlist: NightGoer[];
  games: GameOnTable[];
  // Whether the member may invite people by name (R30), and bring games and vote (R32, R38).
  canInvite: boolean;
  canBring: boolean;
};

// One night, for someone who may see it (KTD4), with its place and address (R36); anyone else
// gets Not found (AE5). People at one night see each other's names and pieces, and the games they
// bring and would play, never each other's libraries (R30).
export const getNightUseCase = (
  friendshipsRepository: IFriendshipsRepository,
  gameNightsRepository: IGameNightsRepository,
  userGamesRepository: IUserGamesRepository,
  gamesRepository: IGamesRepository,
  userProfilesRepository: IUserProfilesRepository,
) => {
  const readers = {
    friendships: friendshipsRepository,
    gameNights: gameNightsRepository,
  };

  return async (gameNightId: string, userId: string): Promise<NightPage> => {
    const night = await nightToSee(readers, gameNightId, userId);
    const [card] = await nightCards(
      gameNightsRepository,
      userProfilesRepository,
      [night],
      userId,
    );
    if (!card) {
      throw new NotFoundError();
    }
    const list = await gameNightsRepository.listAttendees([night.id]);
    const onTable = await gameNightsRepository.listGames([night.id]);
    const votes = await gameNightsRepository.listVotes([night.id]);
    const copies = new Map(
      (
        await userGamesRepository.listByIds(
          onTable.map((one) => one.userGameId),
        )
      ).map((copy) => [copy.id, copy]),
    );
    const games = new Map(
      (
        await gamesRepository.listByIds([
          ...new Set([...copies.values()].map((copy) => copy.gameId)),
        ])
      ).map((game) => [game.id, game]),
    );
    const people = new Map(
      (
        await userProfilesRepository.getManyByUserIds([
          ...new Set([
            ...[...copies.values()].map((copy) => copy.userId),
            ...list.map((one) => one.userId),
          ]),
        ])
      ).map((person) => [person.userId, person]),
    );
    const named = (one: { userId: string }) => people.get(one.userId) ?? [];
    const canInvite = mayInvite(night, list, userId);
    const order = list.map((one) => one.userId);
    const putOrder = onTable.map((one) => one.userGameId);
    const tableGames = onTable.flatMap((one): GameOnTable[] => {
      const copy = copies.get(one.userGameId);
      const game = copy && games.get(copy.gameId);
      const owner = copy && people.get(copy.userId);
      return copy && game && owner
        ? [
            {
              userGameId: copy.id,
              game,
              owner,
              voters: votes
                .filter((vote) => vote.userGameId === copy.id)
                .sort(
                  (a, b) => order.indexOf(a.userId) - order.indexOf(b.userId),
                )
                .flatMap(named),
            },
          ]
        : [];
    });
    return {
      ...card,
      night: canInvite ? night : { ...night, linkToken: null },
      maybe: list.filter((one) => one.status === "maybe").flatMap(named),
      list: list
        .filter((one) => one.userId !== night.createdBy)
        .flatMap((one) => {
          const person = people.get(one.userId);
          return person
            ? [
                {
                  ...person,
                  status: one.status,
                  guestCount: one.guestCount,
                  invitedBy: one.invitedBy,
                },
              ]
            : [];
        }),
      waitlist: waitlistOf(list).flatMap((one) => {
        const person = people.get(one.userId);
        return person ? [{ ...person, guestCount: one.guestCount }] : [];
      }),
      // Most wanted first, then in the order they were put on the table (D7).
      games: tableGames.sort(
        (a, b) =>
          b.voters.length - a.voters.length ||
          putOrder.indexOf(a.userGameId) - putOrder.indexOf(b.userGameId),
      ),
      canInvite,
      canBring: card.you === "host" || card.you === "going",
    };
  };
};
