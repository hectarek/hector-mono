import type { IGameNightsRepository } from "@/src/application/repositories/game-nights.repository.interface";
import type { INoticesRepository } from "@/src/application/repositories/notices.repository.interface";
import type { GameNight } from "@/src/entities/models/game-night.model";
import type { GameNightAttendee } from "@/src/entities/models/game-night-attendee.model";
import type { ITransaction } from "@/src/entities/models/transaction.model";

// Who a cancelled night tells (data-model.md, night-cancelled; D11): everyone going, invited or
// waiting. Someone who said maybe or can't go isn't.
const TOLD: ReadonlySet<GameNightAttendee["status"]> = new Set([
  "going",
  "invited",
  "waitlisted",
]);

// Cancels a night coming up, inside its change's transaction after the night's lock: cancelled_at
// is set, so it leaves Nights for everyone and shows under past nights as Cancelled, and everyone
// going, invited or waiting is told (night-cancelled), with the host's note. The night keeps its
// list and its table. Its host cancelling it (D11) and its host's account ending (U22) share it.
export async function cancelAndTell(
  gameNightsRepository: IGameNightsRepository,
  noticesRepository: INoticesRepository,
  night: GameNight,
  note: string | null,
  now: Date,
  tx: ITransaction,
): Promise<GameNight> {
  const cancelled = await gameNightsRepository.update(
    night.id,
    { cancelledAt: now },
    tx,
  );
  const list = await gameNightsRepository.listAttendees([night.id], tx);
  for (const one of list) {
    if (one.userId !== night.createdBy && TOLD.has(one.status)) {
      await noticesRepository.add(
        {
          userId: one.userId,
          type: "night-cancelled",
          createdBy: night.createdBy,
          gameNightId: night.id,
          answerNote: note,
        },
        tx,
      );
    }
  }
  return cancelled;
}
