import { createModule } from "@evyweb/ioctopus";
import { DI_SYMBOLS } from "@/di/types";
import { getTabCountsUseCase } from "@/src/application/use-cases/notices/get-tab-counts.use-case";
import { listInboxUseCase } from "@/src/application/use-cases/notices/list-inbox.use-case";
import { markInboxReadUseCase } from "@/src/application/use-cases/notices/mark-inbox-read.use-case";
import { NoticesRepository } from "@/src/infrastructure/repositories/notices.repository";
import { MockNoticesRepository } from "@/src/infrastructure/repositories/notices.repository.mock";
import { getTabCountsController } from "@/src/interface-adapters/controllers/notices/get-tab-counts.controller";
import { listInboxController } from "@/src/interface-adapters/controllers/notices/list-inbox.controller";
import { markInboxReadController } from "@/src/interface-adapters/controllers/notices/mark-inbox-read.controller";

// Notices (KTD7): written by each change, read by the inbox (F1), and the tabs' counts (U11).
export function createNoticesModule() {
  const noticesModule = createModule();

  if (process.env.NODE_ENV === "test") {
    noticesModule
      .bind(DI_SYMBOLS.INoticesRepository)
      .toClass(MockNoticesRepository);
  } else {
    noticesModule
      .bind(DI_SYMBOLS.INoticesRepository)
      .toClass(NoticesRepository, [DI_SYMBOLS.ILoggerService]);
  }

  const {
    IFriendRequestsRepository: requests,
    IGameSuggestionsRepository: suggestions,
    IGamesRepository: games,
    ILoansRepository: loans,
    ILoggerService: log,
    INoticesRepository: notices,
    ITransactionManagerService: transactions,
    IUserGamesRepository: userGames,
    IUserProfilesRepository: profiles,
    IUserSettingsRepository: settings,
  } = DI_SYMBOLS;

  noticesModule
    .bind(DI_SYMBOLS.IListInboxUseCase)
    .toHigherOrderFunction(listInboxUseCase, [
      notices,
      settings,
      loans,
      userGames,
      games,
      suggestions,
      profiles,
    ]);
  noticesModule
    .bind(DI_SYMBOLS.IMarkInboxReadUseCase)
    .toHigherOrderFunction(markInboxReadUseCase, [notices, transactions]);
  noticesModule
    .bind(DI_SYMBOLS.IGetTabCountsUseCase)
    .toHigherOrderFunction(getTabCountsUseCase, [
      notices,
      settings,
      userGames,
      loans,
      requests,
      DI_SYMBOLS.IGameNightsRepository,
    ]);
  noticesModule
    .bind(DI_SYMBOLS.IListInboxController)
    .toHigherOrderFunction(listInboxController, [
      DI_SYMBOLS.IListInboxUseCase,
      log,
    ]);
  noticesModule
    .bind(DI_SYMBOLS.IMarkInboxReadController)
    .toHigherOrderFunction(markInboxReadController, [
      DI_SYMBOLS.IMarkInboxReadUseCase,
      log,
    ]);
  noticesModule
    .bind(DI_SYMBOLS.IGetTabCountsController)
    .toHigherOrderFunction(getTabCountsController, [
      DI_SYMBOLS.IGetTabCountsUseCase,
      log,
    ]);

  return noticesModule;
}
