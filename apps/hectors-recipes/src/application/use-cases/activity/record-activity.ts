import type { IActivityEventsRepository } from "@/src/application/repositories/activity-events.repository.interface";
import {
  isRepeat,
  type NewActivity,
} from "@/src/entities/models/activity-event.model";
import type { ITransaction } from "@/src/entities/models/transaction.model";

// Records what someone did (docs/ux-plan.md D106), unless it repeats their latest event of
// its kind (`isRepeat`). The way every activity is written: call it from the use case that does
// the thing, after its access checks and inside its transaction, so the event is kept only if
// the thing happened. Returns whether it was recorded.
export async function recordActivity(
  activityEventsRepository: IActivityEventsRepository,
  event: NewActivity,
  tx: ITransaction,
  now = new Date(),
): Promise<boolean> {
  const last = await activityEventsRepository.latest(
    event.userId,
    event.type,
    tx,
  );
  if (isRepeat(last, event, now)) return false;
  await activityEventsRepository.add(event, tx);
  return true;
}
