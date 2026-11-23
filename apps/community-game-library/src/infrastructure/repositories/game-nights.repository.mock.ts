import type { IFriendshipsRepository } from "@/src/application/repositories/friendships.repository.interface";
import type { IGameNightsRepository } from "@/src/application/repositories/game-nights.repository.interface";
import { DatabaseOperationError } from "@/src/entities/errors/common";
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

// The SQL's orders: a timestamp, then the id.
const byStart = (a: GameNight, b: GameNight) =>
  a.startsAt.getTime() - b.startsAt.getTime() || a.id.localeCompare(b.id);
const byJoining = (a: GameNightAttendee, b: GameNightAttendee) =>
  a.createdAt.getTime() - b.createdAt.getTime() ||
  a.userId.localeCompare(b.userId);
const byPutting = (a: GameNightGame, b: GameNightGame) =>
  a.createdAt.getTime() - b.createdAt.getTime() ||
  a.userGameId.localeCompare(b.userGameId);

// The table's checks: a capacity above none, and an end after the start.
function refuseBadNight(
  night: Pick<GameNight, "capacity" | "startsAt" | "endsAt">,
) {
  if (night.capacity <= 0 || (night.endsAt && night.endsAt <= night.startsAt)) {
    throw new DatabaseOperationError("write failed");
  }
}

export class MockGameNightsRepository implements IGameNightsRepository {
  // The nights, their lists and the games on their tables. Tests and makeCast put rows here too.
  readonly nights: GameNight[] = [];
  readonly attendees: GameNightAttendee[] = [];
  readonly games: GameNightGame[] = [];

  // Who's whose friend, as the real repository's join reads it.
  constructor(private readonly friendships: IFriendshipsRepository) {}

  async getById(id: string): Promise<GameNight | undefined> {
    const night = this.nights.find((row) => row.id === id);
    return night && { ...night };
  }

  async lock(): Promise<void> {}

  async listVisibleFrom(viewerId: string, from: Date): Promise<GameNight[]> {
    const friends = new Set(await this.friendships.listFriendIds(viewerId));
    const listed = new Set(
      this.attendees
        .filter((one) => one.userId === viewerId)
        .map((one) => one.gameNightId),
    );
    return this.nights
      .filter(
        (night) =>
          night.startsAt >= from &&
          night.cancelledAt === null &&
          (night.createdBy === viewerId ||
            listed.has(night.id) ||
            (night.audience === "friends" && friends.has(night.createdBy))),
      )
      .sort(byStart)
      .map((night) => ({ ...night }));
  }

  async create(night: NewGameNight): Promise<GameNight> {
    refuseBadNight(night);
    const now = new Date();
    const row: GameNight = {
      id: crypto.randomUUID(),
      ...night,
      linkToken: null,
      cancelledAt: null,
      createdAt: now,
      updatedAt: now,
    };
    this.nights.push(row);
    return { ...row };
  }

  async update(id: string, changes: GameNightChanges): Promise<GameNight> {
    const night = this.nights.find((row) => row.id === id);
    if (!night) {
      throw new DatabaseOperationError("update failed");
    }
    refuseBadNight({ ...night, ...changes });
    Object.assign(night, changes, { updatedAt: new Date() });
    return { ...night };
  }

  async listAttendees(
    gameNightIds: readonly string[],
  ): Promise<GameNightAttendee[]> {
    const ids = new Set(gameNightIds);
    return this.attendees
      .filter((one) => ids.has(one.gameNightId))
      .sort(byJoining)
      .map((one) => ({ ...one }));
  }

  async getAttendee(
    gameNightId: string,
    userId: string,
  ): Promise<GameNightAttendee | undefined> {
    const row = this.attendees.find(
      (one) => one.gameNightId === gameNightId && one.userId === userId,
    );
    return row && { ...row };
  }

  async addAttendee(
    attendee: NewGameNightAttendee,
  ): Promise<GameNightAttendee> {
    // As the table's key, the pair, and its check on guests.
    if (
      (attendee.guestCount ?? 0) < 0 ||
      this.attendees.some(
        (one) =>
          one.gameNightId === attendee.gameNightId &&
          one.userId === attendee.userId,
      )
    ) {
      throw new DatabaseOperationError("addAttendee failed");
    }
    const now = new Date();
    const row: GameNightAttendee = {
      guestCount: 0,
      invitedBy: null,
      waitlistedAt: null,
      ...attendee,
      createdAt: now,
      updatedAt: now,
    };
    this.attendees.push(row);
    return { ...row };
  }

  async listGames(gameNightIds: readonly string[]): Promise<GameNightGame[]> {
    const ids = new Set(gameNightIds);
    return this.games
      .filter((one) => ids.has(one.gameNightId))
      .sort(byPutting)
      .map((one) => ({ ...one }));
  }

  async addGames(
    gameNightId: string,
    userGameIds: readonly string[],
  ): Promise<void> {
    const now = Date.now();
    userGameIds.forEach((userGameId, index) => {
      // On a conflict, nothing: a game already on the table stays where it was.
      if (
        !this.games.some(
          (one) =>
            one.gameNightId === gameNightId && one.userGameId === userGameId,
        )
      ) {
        this.games.push({
          gameNightId,
          userGameId,
          createdAt: new Date(now + index),
        });
      }
    });
  }

  async listGoingToNightsStarting(
    from: Date,
    to: Date,
  ): Promise<{ gameNightId: string; userId: string; startsAt: Date }[]> {
    return this.nights
      .filter(
        (night) =>
          night.startsAt >= from &&
          night.startsAt < to &&
          night.cancelledAt === null,
      )
      .flatMap((night) =>
        this.attendees
          .filter(
            (one) => one.gameNightId === night.id && one.status === "going",
          )
          .map((one) => ({
            gameNightId: night.id,
            userId: one.userId,
            startsAt: night.startsAt,
          })),
      );
  }
}
