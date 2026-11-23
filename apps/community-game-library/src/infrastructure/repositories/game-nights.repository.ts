import {
  and,
  asc,
  desc,
  eq,
  gte,
  inArray,
  isNotNull,
  isNull,
  lt,
  ne,
  or,
} from "drizzle-orm";
import { alias } from "drizzle-orm/pg-core";
import type { Database } from "@/db";
import {
  friendships,
  gameNightAttendees,
  gameNightGames,
  gameNights,
  gameNightVotes,
} from "@/db/schema";
import type { IGameNightsRepository } from "@/src/application/repositories/game-nights.repository.interface";
import type { ILoggerService } from "@/src/application/services/logger.service.interface";
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
import { BaseRepository } from "@/src/infrastructure/repositories/base.repository";

export class GameNightsRepository
  extends BaseRepository
  implements IGameNightsRepository
{
  constructor(logger: ILoggerService) {
    super(logger, "game-nights");
  }

  // Who may see a night (KTD4): its host, anyone on its list, and the host's friends when it's for
  // friends.
  private visibleTo(db: Database, viewerId: string) {
    return or(
      eq(gameNights.createdBy, viewerId),
      inArray(
        gameNights.id,
        db
          .select({ id: gameNightAttendees.gameNightId })
          .from(gameNightAttendees)
          .where(eq(gameNightAttendees.userId, viewerId)),
      ),
      and(
        eq(gameNights.audience, "friends"),
        inArray(
          gameNights.createdBy,
          db
            .select({ friendUserId: friendships.friendUserId })
            .from(friendships)
            .where(eq(friendships.userId, viewerId)),
        ),
      ),
    );
  }

  async getById(id: string, tx?: ITransaction): Promise<GameNight | undefined> {
    try {
      const [night] = await this.getDbContext(tx)
        .select()
        .from(gameNights)
        .where(eq(gameNights.id, id))
        .limit(1);
      return night;
    } catch (err) {
      this.handleError(err, "getById", { gameNightId: id });
    }
  }

  async lock(id: string, tx: ITransaction): Promise<void> {
    try {
      await this.getDbContext(tx)
        .select({ id: gameNights.id })
        .from(gameNights)
        .where(eq(gameNights.id, id))
        .for("update");
    } catch (err) {
      this.handleError(err, "lock", { gameNightId: id });
    }
  }

  async listVisibleFrom(
    viewerId: string,
    from: Date,
    tx?: ITransaction,
  ): Promise<GameNight[]> {
    try {
      const db = this.getDbContext(tx);
      return await db
        .select()
        .from(gameNights)
        .where(
          and(
            gte(gameNights.startsAt, from),
            isNull(gameNights.cancelledAt),
            this.visibleTo(db, viewerId),
          ),
        )
        .orderBy(asc(gameNights.startsAt), asc(gameNights.id));
    } catch (err) {
      this.handleError(err, "listVisibleFrom");
    }
  }

  async create(night: NewGameNight, tx: ITransaction): Promise<GameNight> {
    try {
      const [row] = await this.getDbContext(tx)
        .insert(gameNights)
        .values(night)
        .returning();
      if (!row) {
        throw new Error("No row returned");
      }
      return row;
    } catch (err) {
      this.handleError(err, "create");
    }
  }

  async update(
    id: string,
    changes: GameNightChanges,
    tx: ITransaction,
  ): Promise<GameNight> {
    try {
      const [row] = await this.getDbContext(tx)
        .update(gameNights)
        .set(changes)
        .where(eq(gameNights.id, id))
        .returning();
      if (!row) {
        throw new Error("No row returned");
      }
      return row;
    } catch (err) {
      this.handleError(err, "update", { gameNightId: id });
    }
  }

  async listAttendees(
    gameNightIds: readonly string[],
    tx?: ITransaction,
  ): Promise<GameNightAttendee[]> {
    if (gameNightIds.length === 0) {
      return [];
    }
    try {
      return await this.getDbContext(tx)
        .select()
        .from(gameNightAttendees)
        .where(inArray(gameNightAttendees.gameNightId, [...gameNightIds]))
        .orderBy(
          asc(gameNightAttendees.createdAt),
          asc(gameNightAttendees.userId),
        );
    } catch (err) {
      this.handleError(err, "listAttendees");
    }
  }

  async getAttendee(
    gameNightId: string,
    userId: string,
    tx?: ITransaction,
  ): Promise<GameNightAttendee | undefined> {
    try {
      const [row] = await this.getDbContext(tx)
        .select()
        .from(gameNightAttendees)
        .where(
          and(
            eq(gameNightAttendees.gameNightId, gameNightId),
            eq(gameNightAttendees.userId, userId),
          ),
        )
        .limit(1);
      return row;
    } catch (err) {
      this.handleError(err, "getAttendee", { gameNightId });
    }
  }

  async addAttendee(
    attendee: NewGameNightAttendee,
    tx: ITransaction,
  ): Promise<GameNightAttendee> {
    try {
      const [row] = await this.getDbContext(tx)
        .insert(gameNightAttendees)
        .values(attendee)
        .returning();
      if (!row) {
        throw new Error("No row returned");
      }
      return row;
    } catch (err) {
      this.handleError(err, "addAttendee", {
        gameNightId: attendee.gameNightId,
      });
    }
  }

  async listGames(
    gameNightIds: readonly string[],
    tx?: ITransaction,
  ): Promise<GameNightGame[]> {
    if (gameNightIds.length === 0) {
      return [];
    }
    try {
      return await this.getDbContext(tx)
        .select()
        .from(gameNightGames)
        .where(inArray(gameNightGames.gameNightId, [...gameNightIds]))
        .orderBy(asc(gameNightGames.createdAt), asc(gameNightGames.userGameId));
    } catch (err) {
      this.handleError(err, "listGames");
    }
  }

  async addGames(
    gameNightId: string,
    userGameIds: readonly string[],
    tx: ITransaction,
  ): Promise<void> {
    if (userGameIds.length === 0) {
      return;
    }
    // A millisecond apart, so the table keeps the order they were picked in: every row in one
    // transaction would otherwise get its start time.
    const now = Date.now();
    try {
      await this.getDbContext(tx)
        .insert(gameNightGames)
        .values(
          userGameIds.map((userGameId, index) => ({
            gameNightId,
            userGameId,
            createdAt: new Date(now + index),
          })),
        )
        .onConflictDoNothing();
    } catch (err) {
      this.handleError(err, "addGames", { gameNightId });
    }
  }

  async getByLinkToken(
    token: string,
    tx?: ITransaction,
  ): Promise<GameNight | undefined> {
    try {
      const [night] = await this.getDbContext(tx)
        .select()
        .from(gameNights)
        .where(eq(gameNights.linkToken, token))
        .limit(1);
      return night;
    } catch (err) {
      this.handleError(err, "getByLinkToken");
    }
  }

  async updateAttendee(
    gameNightId: string,
    userId: string,
    changes: GameNightAttendeeChanges,
    tx: ITransaction,
  ): Promise<GameNightAttendee> {
    try {
      const [row] = await this.getDbContext(tx)
        .update(gameNightAttendees)
        .set(changes)
        .where(
          and(
            eq(gameNightAttendees.gameNightId, gameNightId),
            eq(gameNightAttendees.userId, userId),
          ),
        )
        .returning();
      if (!row) {
        throw new Error("No row returned");
      }
      return row;
    } catch (err) {
      this.handleError(err, "updateAttendee", { gameNightId });
    }
  }

  async removeAttendee(
    gameNightId: string,
    userId: string,
    tx: ITransaction,
  ): Promise<void> {
    try {
      await this.getDbContext(tx)
        .delete(gameNightAttendees)
        .where(
          and(
            eq(gameNightAttendees.gameNightId, gameNightId),
            eq(gameNightAttendees.userId, userId),
          ),
        );
    } catch (err) {
      this.handleError(err, "removeAttendee", { gameNightId });
    }
  }

  async listWaitingInvites(
    userId: string,
    from: Date,
    tx?: ITransaction,
  ): Promise<{ gameNightId: string; startsAt: Date }[]> {
    try {
      return await this.getDbContext(tx)
        .select({ gameNightId: gameNights.id, startsAt: gameNights.startsAt })
        .from(gameNightAttendees)
        .innerJoin(
          gameNights,
          eq(gameNights.id, gameNightAttendees.gameNightId),
        )
        .where(
          and(
            eq(gameNightAttendees.userId, userId),
            eq(gameNightAttendees.status, "invited"),
            isNotNull(gameNightAttendees.invitedBy),
            isNull(gameNights.cancelledAt),
            gte(gameNights.startsAt, from),
          ),
        )
        .orderBy(asc(gameNights.startsAt), asc(gameNights.id));
    } catch (err) {
      this.handleError(err, "listWaitingInvites");
    }
  }

  async listWentWith(
    userId: string,
    before: Date,
    tx?: ITransaction,
  ): Promise<{ userId: string; gameNightId: string; title: string }[]> {
    const mine = alias(gameNightAttendees, "mine");
    try {
      return await this.getDbContext(tx)
        .select({
          userId: gameNightAttendees.userId,
          gameNightId: gameNights.id,
          title: gameNights.title,
        })
        .from(gameNights)
        .innerJoin(
          mine,
          and(
            eq(mine.gameNightId, gameNights.id),
            eq(mine.userId, userId),
            eq(mine.status, "going"),
          ),
        )
        .innerJoin(
          gameNightAttendees,
          and(
            eq(gameNightAttendees.gameNightId, gameNights.id),
            eq(gameNightAttendees.status, "going"),
            ne(gameNightAttendees.userId, userId),
          ),
        )
        .where(
          and(lt(gameNights.startsAt, before), isNull(gameNights.cancelledAt)),
        )
        .orderBy(
          desc(gameNights.startsAt),
          asc(gameNights.id),
          asc(gameNightAttendees.userId),
        );
    } catch (err) {
      this.handleError(err, "listWentWith");
    }
  }

  async removeGames(
    gameNightId: string,
    userGameIds: readonly string[],
    tx: ITransaction,
  ): Promise<void> {
    if (userGameIds.length === 0) {
      return;
    }
    try {
      await this.getDbContext(tx)
        .delete(gameNightGames)
        .where(
          and(
            eq(gameNightGames.gameNightId, gameNightId),
            inArray(gameNightGames.userGameId, [...userGameIds]),
          ),
        );
    } catch (err) {
      this.handleError(err, "removeGames", { gameNightId });
    }
  }

  async listVotes(
    gameNightIds: readonly string[],
    tx?: ITransaction,
  ): Promise<GameNightVote[]> {
    if (gameNightIds.length === 0) {
      return [];
    }
    try {
      return await this.getDbContext(tx)
        .select()
        .from(gameNightVotes)
        .where(inArray(gameNightVotes.gameNightId, [...gameNightIds]))
        .orderBy(asc(gameNightVotes.userGameId), asc(gameNightVotes.userId));
    } catch (err) {
      this.handleError(err, "listVotes");
    }
  }

  async addVote(vote: GameNightVote, tx: ITransaction): Promise<void> {
    try {
      await this.getDbContext(tx)
        .insert(gameNightVotes)
        .values(vote)
        .onConflictDoNothing();
    } catch (err) {
      this.handleError(err, "addVote", { gameNightId: vote.gameNightId });
    }
  }

  async removeVote(vote: GameNightVote, tx: ITransaction): Promise<void> {
    try {
      await this.getDbContext(tx)
        .delete(gameNightVotes)
        .where(
          and(
            eq(gameNightVotes.gameNightId, vote.gameNightId),
            eq(gameNightVotes.userGameId, vote.userGameId),
            eq(gameNightVotes.userId, vote.userId),
          ),
        );
    } catch (err) {
      this.handleError(err, "removeVote", { gameNightId: vote.gameNightId });
    }
  }

  async removeVotesBy(
    gameNightId: string,
    userId: string,
    tx: ITransaction,
  ): Promise<void> {
    try {
      await this.getDbContext(tx)
        .delete(gameNightVotes)
        .where(
          and(
            eq(gameNightVotes.gameNightId, gameNightId),
            eq(gameNightVotes.userId, userId),
          ),
        );
    } catch (err) {
      this.handleError(err, "removeVotesBy", { gameNightId });
    }
  }

  async listGoingToNightsStarting(
    from: Date,
    to: Date,
    tx?: ITransaction,
  ): Promise<{ gameNightId: string; userId: string; startsAt: Date }[]> {
    try {
      return await this.getDbContext(tx)
        .select({
          gameNightId: gameNights.id,
          userId: gameNightAttendees.userId,
          startsAt: gameNights.startsAt,
        })
        .from(gameNights)
        .innerJoin(
          gameNightAttendees,
          eq(gameNightAttendees.gameNightId, gameNights.id),
        )
        .where(
          and(
            gte(gameNights.startsAt, from),
            lt(gameNights.startsAt, to),
            isNull(gameNights.cancelledAt),
            eq(gameNightAttendees.status, "going"),
          ),
        );
    } catch (err) {
      this.handleError(err, "listGoingToNightsStarting");
    }
  }
}
