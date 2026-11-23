import type {
  GameNight,
  GameNightChanges,
  NewGameNight,
} from "@/src/entities/models/game-night.model";
import type {
  GameNightAttendee,
  NewGameNightAttendee,
} from "@/src/entities/models/game-night-attendee.model";
import type { GameNightGame } from "@/src/entities/models/game-night-game.model";
import type { ITransaction } from "@/src/entities/models/transaction.model";

// Game nights (docs/data-model.md, game_nights, game_night_attendees and game_night_games).
// U17's daily run reads who's going to a night that starts soon; U18 makes, edits and reads the
// nights, their lists and the games on their tables.
export interface IGameNightsRepository {
  getById(id: string, tx?: ITransaction): Promise<GameNight | undefined>;
  // Holds the night's row until the transaction ends, so two changes to it can't both land.
  lock(id: string, tx: ITransaction): Promise<void>;
  // The nights a member can see (KTD4) that aren't cancelled and start from `from` on, soonest
  // first: their own, the ones they're on the list of, and their friends' that are for friends.
  listVisibleFrom(
    viewerId: string,
    from: Date,
    tx?: ITransaction,
  ): Promise<GameNight[]>;
  create(night: NewGameNight, tx: ITransaction): Promise<GameNight>;
  update(
    id: string,
    changes: GameNightChanges,
    tx: ITransaction,
  ): Promise<GameNight>;

  // The nights' lists, each in the order its people joined it, the host first.
  listAttendees(
    gameNightIds: readonly string[],
    tx?: ITransaction,
  ): Promise<GameNightAttendee[]>;
  getAttendee(
    gameNightId: string,
    userId: string,
    tx?: ITransaction,
  ): Promise<GameNightAttendee | undefined>;
  addAttendee(
    attendee: NewGameNightAttendee,
    tx: ITransaction,
  ): Promise<GameNightAttendee>;

  // The games on the nights' tables, in the order they were put there.
  listGames(
    gameNightIds: readonly string[],
    tx?: ITransaction,
  ): Promise<GameNightGame[]>;
  addGames(
    gameNightId: string,
    userGameIds: readonly string[],
    tx: ITransaction,
  ): Promise<void>;

  // Everyone going to a night that isn't cancelled and starts from `from` until before `to`.
  listGoingToNightsStarting(
    from: Date,
    to: Date,
    tx?: ITransaction,
  ): Promise<{ gameNightId: string; userId: string; startsAt: Date }[]>;
}
