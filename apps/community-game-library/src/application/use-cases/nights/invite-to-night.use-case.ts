import type { IFriendshipsRepository } from "@/src/application/repositories/friendships.repository.interface";
import type { IGameNightsRepository } from "@/src/application/repositories/game-nights.repository.interface";
import type { INoticesRepository } from "@/src/application/repositories/notices.repository.interface";
import type { ILoggerService } from "@/src/application/services/logger.service.interface";
import type { ITransactionManagerService } from "@/src/application/services/transaction-manager.service.interface";
import { requireFriend } from "@/src/application/use-cases/friends/require-friend";
import { nightToSee } from "@/src/application/use-cases/nights/can-see-night";
import { UnauthorizedError } from "@/src/entities/errors/common";
import type { GameNight } from "@/src/entities/models/game-night.model";
import type { GameNightAttendee } from "@/src/entities/models/game-night-attendee.model";

export type IInviteToNightUseCase = ReturnType<typeof inviteToNightUseCase>;

// Who may invite people by name (R30): the host, and anyone going once the host lets people
// going invite others.
export function mayInvite(
  night: GameNight,
  list: readonly Pick<GameNightAttendee, "userId" | "status">[],
  userId: string,
): boolean {
  return (
    night.createdBy === userId ||
    (night.attendeesCanInvite &&
      list.some((one) => one.userId === userId && one.status === "going"))
  );
}

// Invite people (D10, R30): each friend of the inviter's not on the list yet goes on it as
// invited by name, and is told (night-invite); the Nights tab counts it until they answer (R33).
// Someone on the list already is left as they are. Answers who was invited.
export const inviteToNightUseCase = (
  friendshipsRepository: IFriendshipsRepository,
  gameNightsRepository: IGameNightsRepository,
  noticesRepository: INoticesRepository,
  transactionManagerService: ITransactionManagerService,
  loggerService: ILoggerService,
) => {
  const logger = loggerService.child({
    layer: "use-case",
    op: "inviteToNight",
  });
  const readers = {
    friendships: friendshipsRepository,
    gameNights: gameNightsRepository,
  };

  return async (
    gameNightId: string,
    userIds: readonly string[],
    userId: string,
  ): Promise<string[]> =>
    transactionManagerService.startTransaction(async (tx) => {
      await gameNightsRepository.lock(gameNightId, tx);
      const night = await nightToSee(readers, gameNightId, userId, tx);
      const list = await gameNightsRepository.listAttendees([night.id], tx);
      if (!mayInvite(night, list, userId)) {
        throw new UnauthorizedError("Only the host invites people.");
      }
      const invited: string[] = [];
      for (const friendId of new Set(userIds)) {
        await requireFriend(friendshipsRepository, userId, friendId, tx);
        if (list.some((one) => one.userId === friendId)) {
          continue;
        }
        await gameNightsRepository.addAttendee(
          {
            gameNightId: night.id,
            userId: friendId,
            status: "invited",
            invitedBy: userId,
          },
          tx,
        );
        await noticesRepository.add(
          {
            userId: friendId,
            type: "night-invite",
            createdBy: userId,
            gameNightId: night.id,
          },
          tx,
        );
        invited.push(friendId);
      }
      logger.debug("Invited", {
        gameNightId: night.id,
        invited: invited.length,
      });
      return invited;
    });
};
