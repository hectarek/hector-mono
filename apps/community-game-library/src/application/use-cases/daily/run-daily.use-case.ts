import type { IGameNightsRepository } from "@/src/application/repositories/game-nights.repository.interface";
import type { ILoansRepository } from "@/src/application/repositories/loans.repository.interface";
import type { INoticesRepository } from "@/src/application/repositories/notices.repository.interface";
import type { IUserGamesRepository } from "@/src/application/repositories/user-games.repository.interface";
import type { ILoggerService } from "@/src/application/services/logger.service.interface";
import type { ITransactionManagerService } from "@/src/application/services/transaction-manager.service.interface";
import { loanReminders, returnClosesToday } from "@/src/entities/reminders";
import { PLAN_TIME_ZONE, todayIn } from "@/src/entities/week";

export type IRunDailyUseCase = ReturnType<typeof runDailyUseCase>;

// What a run did, which its route answers with and its log keeps: how many reminders it wrote, and
// how many returns it closed.
export type DailyRun = { reminders: number; closed: number };

// Nights are read a day and a half either side of the run, and kept when they start today in
// Eastern time.
const NIGHTS_WINDOW_MS = 36 * 60 * 60 * 1000;

// The daily run (KTD8, R25, D15), each morning in Eastern time: the reminders due today on every
// loan that's out (loanReminders), night-today to everyone going to a night that starts today and
// isn't cancelled, and each return its owner left a week closed on the borrower's day, with
// return-closed to the owner. Each loan's and night's writes are a transaction of their own, so
// one failure keeps the rest. A reminder carries the day it's for under a unique index, and a
// return closes only while it's still being returned, so a second run the same day writes nothing.
export const runDailyUseCase = (
  loansRepository: ILoansRepository,
  userGamesRepository: IUserGamesRepository,
  noticesRepository: INoticesRepository,
  gameNightsRepository: IGameNightsRepository,
  transactionManagerService: ITransactionManagerService,
  loggerService: ILoggerService,
) => {
  const logger = loggerService.child({ layer: "use-case", op: "runDaily" });

  return async (now: Date): Promise<DailyRun> => {
    const today = todayIn(PLAN_TIME_ZONE, now);
    let reminders = 0;
    let closed = 0;
    const owners = new Map<string, string>();

    for (const loan of await loansRepository.listInStatuses([
      "out",
      "returning",
    ])) {
      let ownerId = owners.get(loan.userGameId);
      if (ownerId === undefined) {
        const copy = await userGamesRepository.getById(loan.userGameId);
        if (!copy) {
          continue;
        }
        ownerId = copy.userId;
        owners.set(copy.id, ownerId);
      }
      const owner = ownerId;
      const due = loanReminders(loan, owner, today);
      if (due.length > 0) {
        reminders += await transactionManagerService.startTransaction(
          async (tx) => {
            let written = 0;
            for (const reminder of due) {
              const added = await noticesRepository.addReminder(
                { ...reminder, loanId: loan.id, remindedOn: today },
                tx,
              );
              written += added ? 1 : 0;
            }
            return written;
          },
        );
      }
      if (returnClosesToday(loan, today)) {
        closed += await transactionManagerService.startTransaction(
          async (tx) => {
            await userGamesRepository.lock(loan.userGameId, tx);
            const current = await loansRepository.getById(loan.id, tx);
            if (!current || !returnClosesToday(current, today)) {
              return 0;
            }
            await loansRepository.update(
              current.id,
              { status: "returned" },
              tx,
            );
            await noticesRepository.add(
              { userId: owner, type: "return-closed", loanId: current.id },
              tx,
            );
            return 1;
          },
        );
      }
    }

    const going = await gameNightsRepository.listGoingToNightsStarting(
      new Date(now.getTime() - NIGHTS_WINDOW_MS),
      new Date(now.getTime() + NIGHTS_WINDOW_MS),
    );
    for (const one of going) {
      if (todayIn(PLAN_TIME_ZONE, one.startsAt) !== today) {
        continue;
      }
      const added = await transactionManagerService.startTransaction((tx) =>
        noticesRepository.addReminder(
          {
            userId: one.userId,
            type: "night-today",
            gameNightId: one.gameNightId,
            remindedOn: today,
          },
          tx,
        ),
      );
      reminders += added ? 1 : 0;
    }

    logger.info("Daily run", { reminders, closed });
    return { reminders, closed };
  };
};
