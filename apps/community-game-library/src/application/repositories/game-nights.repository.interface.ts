import type {
  GameNight,
  GameNightChanges,
  NewGameNight,
} from "@/src/entities/models/game-night.model";
import type {
  GameNightAttendee,
  GameNightAttendeeChanges,
  NewGameNightAttendee,
} from "@/src/entities/models/game-night-attendee.model";
import type { GameNightGame } from "@/src/entities/models/game-night-game.model";
import type { GameNightVote } from "@/src/entities/models/game-night-vote.model";
import type { ITransaction } from "@/src/entities/models/transaction.model";

// Game nights (docs/data-model.md, game_nights, game_night_attendees, game_night_games and
// game_night_votes). U17's daily run reads who's going to a night that starts soon; U18 makes,
// edits and reads the nights, their lists and the games on their tables; U19 answers, invites,
// the night's link, the waitlist and the votes; U21 cancels them and lists the past ones.
export interface IGameNightsRepository {
  getById(id: string, tx?: ITransaction): Promise<GameNight | undefined>;
  // The night a link's token opens (KTD18), whoever may see it: the link is what lets them.
  getByLinkToken(
    token: string,
    tx?: ITransaction,
  ): Promise<GameNight | undefined>;
  // Holds the night's row until the transaction ends, so two changes to it can't both land.
  lock(id: string, tx: ITransaction): Promise<void>;
  // The nights a member can see (KTD4) that aren't cancelled and start from `from` on, soonest
  // first: their own, the ones they're on the list of, and their friends' that are for friends.
  listVisibleFrom(
    viewerId: string,
    from: Date,
    tx?: ITransaction,
  ): Promise<GameNight[]>;
  // The nights a member can see (KTD4) that started before `before`, or are cancelled, newest
  // first: Past game nights (D12, U21).
  listVisiblePast(
    viewerId: string,
    before: Date,
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
  updateAttendee(
    gameNightId: string,
    userId: string,
    changes: GameNightAttendeeChanges,
    tx: ITransaction,
  ): Promise<GameNightAttendee>;
  removeAttendee(
    gameNightId: string,
    userId: string,
    tx: ITransaction,
  ): Promise<void>;
  // A member's invites by name with no answer yet, on nights not cancelled that start from
  // `from` on: the Nights tab counts them (R33).
  listWaitingInvites(
    userId: string,
    from: Date,
    tx?: ITransaction,
  ): Promise<{ gameNightId: string; startsAt: Date }[]>;
  // The people who went to a night with the member, before `before`, newest night first: People
  // you may know (R49).
  listWentWith(
    userId: string,
    before: Date,
    tx?: ITransaction,
  ): Promise<{ userId: string; gameNightId: string; title: string }[]>;

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
  // Takes games off a table, with their votes.
  removeGames(
    gameNightId: string,
    userGameIds: readonly string[],
    tx: ITransaction,
  ): Promise<void>;

  // Who'd play each game on the nights' tables (R38).
  listVotes(
    gameNightIds: readonly string[],
    tx?: ITransaction,
  ): Promise<GameNightVote[]>;
  addVote(vote: GameNightVote, tx: ITransaction): Promise<void>;
  removeVote(vote: GameNightVote, tx: ITransaction): Promise<void>;
  // A member's votes on a night, when they stop going.
  removeVotesBy(
    gameNightId: string,
    userId: string,
    tx: ITransaction,
  ): Promise<void>;

  // Everyone going to a night that isn't cancelled and starts from `from` until before `to`.
  listGoingToNightsStarting(
    from: Date,
    to: Date,
    tx?: ITransaction,
  ): Promise<{ gameNightId: string; userId: string; startsAt: Date }[]>;
}
