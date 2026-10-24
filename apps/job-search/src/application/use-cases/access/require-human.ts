import type { IActivityRepository } from "@/src/application/repositories/activity.repository.interface";
import type { ITransactionManagerService } from "@/src/application/services/transaction-manager.service.interface";
import { recordChange } from "@/src/application/use-cases/activity/record-change";
import { HumanOnlyError } from "@/src/entities/errors/common";
import type {
  ChangeContext,
  RecordRef,
} from "@/src/entities/models/activity.model";

// What only Hector may do (R21). The account endpoints, also his alone, are kept to his session
// by the auth route.
type HumanOnlyOperation =
  | "accept"
  | "dismiss"
  | "reopen"
  | "delete"
  | "connect-calendar"
  | "disconnect-calendar"
  | "change-settings";

// The first step of a human-only operation's use case, before its own transaction opens
// (docs/build-plan.md KTD3). Anyone but Hector is refused: the refusal is recorded in a
// transaction of its own, so it stays in the log though the operation never runs, and then
// HumanOnlyError, which the action answers as `human-only`, whatever the entry point.
export async function requireHuman(
  activityRepository: IActivityRepository,
  transactionManager: ITransactionManagerService,
  context: ChangeContext,
  attempt: { record: RecordRef; operation: HumanOnlyOperation },
): Promise<void> {
  if (context.actor === "owner") {
    return;
  }
  await transactionManager.startTransaction((tx) =>
    recordChange(activityRepository, tx, context, {
      record: attempt.record,
      action: "refused",
      reason: attempt.operation,
    }),
  );
  throw new HumanOnlyError();
}
