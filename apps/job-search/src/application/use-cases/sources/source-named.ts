import type { IActivityRepository } from "@/src/application/repositories/activity.repository.interface";
import type { ILeadSourcesRepository } from "@/src/application/repositories/lead-sources.repository.interface";
import { recordChange } from "@/src/application/use-cases/activity/record-change";
import type { ChangeContext } from "@/src/entities/models/activity.model";
import type { AddedSource } from "@/src/entities/models/lead-source.model";
import type { ITransaction } from "@/src/entities/models/transaction.model";

// The owner's lead source with this name, compared ignoring case, added and logged when there's
// none, inside the caller's transaction: add_source's step, and a job's when it names its source.
export async function sourceNamed(
  leadSourcesRepository: ILeadSourcesRepository,
  activityRepository: IActivityRepository,
  tx: ITransaction,
  context: ChangeContext,
  name: string,
): Promise<AddedSource> {
  const added = await leadSourcesRepository.add(context.ownerId, name, tx);
  if (added.created) {
    await recordChange(activityRepository, tx, context, {
      record: { kind: "lead-source", id: added.source.id },
      action: "created",
      after: { name: added.source.name },
    });
  }
  return added;
}
