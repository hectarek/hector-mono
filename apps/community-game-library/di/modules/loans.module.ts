import { createModule } from "@evyweb/ioctopus";
import { DI_SYMBOLS } from "@/di/types";
import { answerMoreTimeUseCase } from "@/src/application/use-cases/loans/answer-more-time.use-case";
import { answerRequestUseCase } from "@/src/application/use-cases/loans/answer-request.use-case";
import { askMoreTimeUseCase } from "@/src/application/use-cases/loans/ask-more-time.use-case";
import { callBackUseCase } from "@/src/application/use-cases/loans/call-back.use-case";
import { cancelLoanUseCase } from "@/src/application/use-cases/loans/cancel-loan.use-case";
import { changeDueDateUseCase } from "@/src/application/use-cases/loans/change-due-date.use-case";
import { confirmPickUpUseCase } from "@/src/application/use-cases/loans/confirm-pick-up.use-case";
import { confirmReturnUseCase } from "@/src/application/use-cases/loans/confirm-return.use-case";
import { getLoanUseCase } from "@/src/application/use-cases/loans/get-loan.use-case";
import { giveBackUseCase } from "@/src/application/use-cases/loans/give-back.use-case";
import { listLoansUseCase } from "@/src/application/use-cases/loans/list-loans.use-case";
import { requestLoanUseCase } from "@/src/application/use-cases/loans/request-loan.use-case";
import { withdrawRequestUseCase } from "@/src/application/use-cases/loans/withdraw-request.use-case";
import { LoansRepository } from "@/src/infrastructure/repositories/loans.repository";
import { MockLoansRepository } from "@/src/infrastructure/repositories/loans.repository.mock";
import { answerMoreTimeController } from "@/src/interface-adapters/controllers/loans/answer-more-time.controller";
import { answerRequestController } from "@/src/interface-adapters/controllers/loans/answer-request.controller";
import { askMoreTimeController } from "@/src/interface-adapters/controllers/loans/ask-more-time.controller";
import { callBackController } from "@/src/interface-adapters/controllers/loans/call-back.controller";
import { cancelLoanController } from "@/src/interface-adapters/controllers/loans/cancel-loan.controller";
import { changeDueDateController } from "@/src/interface-adapters/controllers/loans/change-due-date.controller";
import { confirmPickUpController } from "@/src/interface-adapters/controllers/loans/confirm-pick-up.controller";
import { confirmReturnController } from "@/src/interface-adapters/controllers/loans/confirm-return.controller";
import { getLoanController } from "@/src/interface-adapters/controllers/loans/get-loan.controller";
import { giveBackController } from "@/src/interface-adapters/controllers/loans/give-back.controller";
import { listLoansController } from "@/src/interface-adapters/controllers/loans/list-loans.controller";
import { requestLoanController } from "@/src/interface-adapters/controllers/loans/request-loan.controller";
import { withdrawRequestController } from "@/src/interface-adapters/controllers/loans/withdraw-request.controller";

// Loans (R16 to R24, R48; U4's reads, then Batch 4's moves).
export function createLoansModule() {
  const loansModule = createModule();

  if (process.env.NODE_ENV === "test") {
    loansModule.bind(DI_SYMBOLS.ILoansRepository).toClass(MockLoansRepository);
  } else {
    loansModule
      .bind(DI_SYMBOLS.ILoansRepository)
      .toClass(LoansRepository, [DI_SYMBOLS.ILoggerService]);
  }

  const {
    IFriendshipsRepository: friendships,
    IGamesRepository: games,
    ILoansRepository: loans,
    ILoggerService: log,
    INoticesRepository: notices,
    ITransactionManagerService: transactions,
    IUserGamesRepository: userGames,
    IUserProfilesRepository: profiles,
  } = DI_SYMBOLS;

  loansModule
    .bind(DI_SYMBOLS.IAskMoreTimeUseCase)
    .toHigherOrderFunction(askMoreTimeUseCase, [
      userGames,
      loans,
      notices,
      transactions,
      log,
    ]);
  loansModule
    .bind(DI_SYMBOLS.IAnswerMoreTimeUseCase)
    .toHigherOrderFunction(answerMoreTimeUseCase, [
      userGames,
      loans,
      notices,
      transactions,
      log,
    ]);
  loansModule
    .bind(DI_SYMBOLS.IChangeDueDateUseCase)
    .toHigherOrderFunction(changeDueDateUseCase, [
      userGames,
      loans,
      notices,
      transactions,
      log,
    ]);
  loansModule
    .bind(DI_SYMBOLS.ICallBackUseCase)
    .toHigherOrderFunction(callBackUseCase, [
      userGames,
      loans,
      notices,
      transactions,
      log,
    ]);
  loansModule
    .bind(DI_SYMBOLS.IAnswerRequestUseCase)
    .toHigherOrderFunction(answerRequestUseCase, [
      userGames,
      loans,
      notices,
      transactions,
      log,
    ]);
  loansModule
    .bind(DI_SYMBOLS.ICancelLoanUseCase)
    .toHigherOrderFunction(cancelLoanUseCase, [
      userGames,
      loans,
      notices,
      transactions,
      log,
    ]);
  loansModule
    .bind(DI_SYMBOLS.IConfirmPickUpUseCase)
    .toHigherOrderFunction(confirmPickUpUseCase, [
      userGames,
      loans,
      transactions,
      log,
    ]);
  loansModule
    .bind(DI_SYMBOLS.IConfirmReturnUseCase)
    .toHigherOrderFunction(confirmReturnUseCase, [
      userGames,
      loans,
      notices,
      transactions,
      log,
    ]);
  loansModule
    .bind(DI_SYMBOLS.IGetLoanUseCase)
    .toHigherOrderFunction(getLoanUseCase, [loans, userGames, games, profiles]);
  loansModule
    .bind(DI_SYMBOLS.IGiveBackUseCase)
    .toHigherOrderFunction(giveBackUseCase, [
      userGames,
      loans,
      notices,
      transactions,
      log,
    ]);
  loansModule
    .bind(DI_SYMBOLS.IListLoansUseCase)
    .toHigherOrderFunction(listLoansUseCase, [
      loans,
      userGames,
      games,
      profiles,
    ]);
  loansModule
    .bind(DI_SYMBOLS.IRequestLoanUseCase)
    .toHigherOrderFunction(requestLoanUseCase, [
      friendships,
      userGames,
      loans,
      notices,
      transactions,
      log,
    ]);
  loansModule
    .bind(DI_SYMBOLS.IWithdrawRequestUseCase)
    .toHigherOrderFunction(withdrawRequestUseCase, [
      userGames,
      loans,
      notices,
      transactions,
      log,
    ]);

  loansModule
    .bind(DI_SYMBOLS.IAskMoreTimeController)
    .toHigherOrderFunction(askMoreTimeController, [
      DI_SYMBOLS.IAskMoreTimeUseCase,
      log,
    ]);
  loansModule
    .bind(DI_SYMBOLS.IAnswerMoreTimeController)
    .toHigherOrderFunction(answerMoreTimeController, [
      DI_SYMBOLS.IAnswerMoreTimeUseCase,
      log,
    ]);
  loansModule
    .bind(DI_SYMBOLS.IChangeDueDateController)
    .toHigherOrderFunction(changeDueDateController, [
      DI_SYMBOLS.IChangeDueDateUseCase,
      log,
    ]);
  loansModule
    .bind(DI_SYMBOLS.ICallBackController)
    .toHigherOrderFunction(callBackController, [
      DI_SYMBOLS.ICallBackUseCase,
      log,
    ]);
  loansModule
    .bind(DI_SYMBOLS.IAnswerRequestController)
    .toHigherOrderFunction(answerRequestController, [
      DI_SYMBOLS.IAnswerRequestUseCase,
      log,
    ]);
  loansModule
    .bind(DI_SYMBOLS.ICancelLoanController)
    .toHigherOrderFunction(cancelLoanController, [
      DI_SYMBOLS.ICancelLoanUseCase,
      log,
    ]);
  loansModule
    .bind(DI_SYMBOLS.IConfirmPickUpController)
    .toHigherOrderFunction(confirmPickUpController, [
      DI_SYMBOLS.IConfirmPickUpUseCase,
      log,
    ]);
  loansModule
    .bind(DI_SYMBOLS.IConfirmReturnController)
    .toHigherOrderFunction(confirmReturnController, [
      DI_SYMBOLS.IConfirmReturnUseCase,
      log,
    ]);
  loansModule
    .bind(DI_SYMBOLS.IGetLoanController)
    .toHigherOrderFunction(getLoanController, [
      DI_SYMBOLS.IGetLoanUseCase,
      log,
    ]);
  loansModule
    .bind(DI_SYMBOLS.IGiveBackController)
    .toHigherOrderFunction(giveBackController, [
      DI_SYMBOLS.IGiveBackUseCase,
      log,
    ]);
  loansModule
    .bind(DI_SYMBOLS.IListLoansController)
    .toHigherOrderFunction(listLoansController, [
      DI_SYMBOLS.IListLoansUseCase,
      log,
    ]);
  loansModule
    .bind(DI_SYMBOLS.IRequestLoanController)
    .toHigherOrderFunction(requestLoanController, [
      DI_SYMBOLS.IRequestLoanUseCase,
      log,
    ]);
  loansModule
    .bind(DI_SYMBOLS.IWithdrawRequestController)
    .toHigherOrderFunction(withdrawRequestController, [
      DI_SYMBOLS.IWithdrawRequestUseCase,
      log,
    ]);

  return loansModule;
}
