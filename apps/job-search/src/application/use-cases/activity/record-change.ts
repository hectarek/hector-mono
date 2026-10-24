import type { IActivityRepository } from "@/src/application/repositories/activity.repository.interface";
import type {
  ActivityAction,
  ChangeContext,
  FieldChange,
  RecordRef,
} from "@/src/entities/models/activity.model";
import type { ITransaction } from "@/src/entities/models/transaction.model";

// Records who changed a record, how, and each field before and after (R19, docs/build-plan.md
// KTD7). It takes the write's own transaction, so the change and its history commit or roll
// back together. Give `before` and `after` the fields the change touched (a new record has no
// `before`, a deleted one no `after`): only those whose values differ are kept.
export async function recordChange(
  activityRepository: IActivityRepository,
  tx: ITransaction,
  context: ChangeContext,
  change: {
    record: RecordRef;
    action: ActivityAction;
    before?: Record<string, unknown>;
    after?: Record<string, unknown>;
    reason?: string;
  },
): Promise<void> {
  await activityRepository.add(
    {
      ownerId: context.ownerId,
      actor: context.actor,
      tool: context.tool ?? null,
      record: change.record,
      action: change.action,
      changes: changedFields(change.before ?? {}, change.after ?? {}),
      reason: change.reason ?? null,
    },
    tx,
  );
}

function changedFields(
  before: Record<string, unknown>,
  after: Record<string, unknown>,
): FieldChange[] {
  const fields = new Set([...Object.keys(before), ...Object.keys(after)]);
  return [...fields].flatMap((field) => {
    const was = asStored(before[field]);
    const is = asStored(after[field]);
    return JSON.stringify(was) === JSON.stringify(is)
      ? []
      : [{ field, before: was, after: is }];
  });
}

// A value as the log stores it, as JSON (a date becomes its ISO text), with no value as null.
function asStored(value: unknown): unknown {
  return value === undefined ? null : JSON.parse(JSON.stringify(value));
}
