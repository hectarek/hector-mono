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
  GameNightAttendeeChanges,
  NewGameNightAttendee,
} from "@/src/entities/models/game-night-attendee.model";
import type { GameNightGame } from "@/src/entities/models/game-night-game.model";
import type { GameNightVote } from "@/src/entities/models/game-night-vote.model";

// The SQL's orders: a timestamp, then the id.
const byStart = (a: GameNight, b: GameNight) =>
  a.startsAt.getTime() - b.startsAt.getTime() || a.id.localeCompare(b.id);
const byJoining = (a: GameNightAttendee, b: GameNightAttendee) =>
  a.createdAt.getTime() - b.createdAt.getTime() ||
  a.userId.localeCompare(b.userId);
const byPutting = (a: GameNightGame, b: GameNightGame) =>
  a.createdAt.getTime() - b.createdAt.getTime() ||
  a.userGameId.localeCompare(b.userGameId);

const sameVote = (a: GameNightVote, b: GameNightVote) =>
  a.gameNightId === b.gameNightId &&
  a.userGameId === b.userGameId &&
  a.userId === b.userId;

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
  readonly votes: GameNightVote[] = [];

  // Who's whose friend, as the real repository's join reads it.
  constructor(private readonly friendships: IFriendshipsRepository) {}

  async getById(id: string): Promise<GameNight | undefined> {
    const night = this.nights.find((row) => row.id === id);
    return night && { ...night };
  }

  async getByLinkToken(token: string): Promise<GameNight | undefined> {
    const night = this.nights.find((row) => row.linkToken === token);
    return night && { ...night };
  }

  async lock(): Promise<void> {}

  // Who may see a night (KTD4), as the real repository's visibleTo reads it.
  private async visibleTo(viewerId: string) {
    const friends = new Set(await this.friendships.listFriendIds(viewerId));
    const listed = new Set(
      this.attendees
        .filter((one) => one.userId === viewerId)
        .map((one) => one.gameNightId),
    );
    return (night: GameNight) =>
      night.createdBy === viewerId ||
      listed.has(night.id) ||
      (night.audience === "friends" && friends.has(night.createdBy));
  }

  async listVisibleFrom(viewerId: string, from: Date): Promise<GameNight[]> {
    const visible = await this.visibleTo(viewerId);
    return this.nights
      .filter(
        (night) =>
          night.startsAt >= from &&
          night.cancelledAt === null &&
          visible(night),
      )
      .sort(byStart)
      .map((night) => ({ ...night }));
  }

  async listVisiblePast(viewerId: string, before: Date): Promise<GameNight[]> {
    const visible = await this.visibleTo(viewerId);
    return this.nights
      .filter(
        (night) =>
          (night.startsAt < before || night.cancelledAt !== null) &&
          visible(night),
      )
      .sort((a, b) => byStart(b, a))
      .map((night) => ({ ...night }));
  }

  async create(night: NewGameNight): Promise<GameNight> {
    refuseBadNight(night);
    const now = new Date();
    const row: GameNight = {
      id: crypto.randomUUID(),
      linkToken: null,
      ...night,
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

  async updateAttendee(
    gameNightId: string,
    userId: string,
    changes: GameNightAttendeeChanges,
  ): Promise<GameNightAttendee> {
    const row = this.attendees.find(
      (one) => one.gameNightId === gameNightId && one.userId === userId,
    );
    if (!row || (changes.guestCount ?? 0) < 0) {
      throw new DatabaseOperationError("updateAttendee failed");
    }
    Object.assign(row, changes, { updatedAt: new Date() });
    return { ...row };
  }

  async removeAttendee(gameNightId: string, userId: string): Promise<void> {
    const index = this.attendees.findIndex(
      (one) => one.gameNightId === gameNightId && one.userId === userId,
    );
    if (index >= 0) {
      this.attendees.splice(index, 1);
    }
  }

  async listWaitingInvites(
    userId: string,
    from: Date,
  ): Promise<{ gameNightId: string; startsAt: Date }[]> {
    return this.attendees
      .filter(
        (one) =>
          one.userId === userId &&
          one.status === "invited" &&
          one.invitedBy !== null,
      )
      .flatMap((one) => {
        const night = this.nights.find((row) => row.id === one.gameNightId);
        return night && night.cancelledAt === null && night.startsAt >= from
          ? [night]
          : [];
      })
      .sort(byStart)
      .map((night) => ({ gameNightId: night.id, startsAt: night.startsAt }));
  }

  async listWentWith(
    userId: string,
    before: Date,
  ): Promise<{ userId: string; gameNightId: string; title: string }[]> {
    const went = (nightId: string, who: string) =>
      this.attendees.some(
        (one) =>
          one.gameNightId === nightId &&
          one.userId === who &&
          one.status === "going",
      );
    return this.nights
      .filter(
        (night) =>
          night.startsAt < before &&
          night.cancelledAt === null &&
          went(night.id, userId),
      )
      .sort((a, b) => byStart(b, a))
      .flatMap((night) =>
        this.attendees
          .filter(
            (one) =>
              one.gameNightId === night.id &&
              one.status === "going" &&
              one.userId !== userId,
          )
          .map((one) => one.userId)
          .sort()
          .map((other) => ({
            userId: other,
            gameNightId: night.id,
            title: night.title,
          })),
      );
  }

  async removeGames(
    gameNightId: string,
    userGameIds: readonly string[],
  ): Promise<void> {
    const gone = (row: { gameNightId: string; userGameId: string }) =>
      row.gameNightId === gameNightId && userGameIds.includes(row.userGameId);
    // As the votes' foreign key: a vote goes with its game's place on the table.
    this.games.splice(
      0,
      this.games.length,
      ...this.games.filter((one) => !gone(one)),
    );
    this.votes.splice(
      0,
      this.votes.length,
      ...this.votes.filter((one) => !gone(one)),
    );
  }

  async listVotes(gameNightIds: readonly string[]): Promise<GameNightVote[]> {
    const ids = new Set(gameNightIds);
    return this.votes
      .filter((one) => ids.has(one.gameNightId))
      .sort(
        (a, b) =>
          a.userGameId.localeCompare(b.userGameId) ||
          a.userId.localeCompare(b.userId),
      )
      .map((one) => ({ ...one }));
  }

  async addVote(vote: GameNightVote): Promise<void> {
    // As the votes' foreign key: only a game on the table takes one.
    if (
      !this.games.some(
        (one) =>
          one.gameNightId === vote.gameNightId &&
          one.userGameId === vote.userGameId,
      )
    ) {
      throw new DatabaseOperationError("addVote failed");
    }
    if (!this.votes.some((one) => sameVote(one, vote))) {
      this.votes.push({ ...vote });
    }
  }

  async removeVote(vote: GameNightVote): Promise<void> {
    this.votes.splice(
      0,
      this.votes.length,
      ...this.votes.filter((one) => !sameVote(one, vote)),
    );
  }

  async removeVotesBy(gameNightId: string, userId: string): Promise<void> {
    this.votes.splice(
      0,
      this.votes.length,
      ...this.votes.filter(
        (one) => !(one.gameNightId === gameNightId && one.userId === userId),
      ),
    );
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

  async removePlacesOf(userId: string): Promise<void> {
    const hosted = new Set(
      this.nights
        .filter((night) => night.createdBy === userId)
        .map((night) => night.id),
    );
    this.votes.splice(
      0,
      this.votes.length,
      ...this.votes.filter((one) => one.userId !== userId),
    );
    this.attendees.splice(
      0,
      this.attendees.length,
      ...this.attendees.filter(
        (one) => one.userId !== userId || hosted.has(one.gameNightId),
      ),
    );
  }
}
