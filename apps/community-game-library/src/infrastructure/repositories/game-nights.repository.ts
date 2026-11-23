import { and, asc, eq, gte, inArray, isNull, lt, or } from "drizzle-orm";
import type { Database } from "@/db";
import {
  friendships,
  gameNightAttendees,
  gameNightGames,
  gameNights,
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
  NewGameNightAttendee,
} from "@/src/entities/models/game-night-attendee.model";
import type { GameNightGame } from "@/src/entities/models/game-night-game.model";
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
