import { createModule } from "@evyweb/ioctopus";
import { DI_SYMBOLS } from "@/di/types";
import { addGameToNightUseCase } from "@/src/application/use-cases/nights/add-game-to-night.use-case";
import { answerNightUseCase } from "@/src/application/use-cases/nights/answer-night.use-case";
import { checkNightLinkUseCase } from "@/src/application/use-cases/nights/check-night-link.use-case";
import { createNightUseCase } from "@/src/application/use-cases/nights/create-night.use-case";
import { getInviteChoicesUseCase } from "@/src/application/use-cases/nights/get-invite-choices.use-case";
import { getNightUseCase } from "@/src/application/use-cases/nights/get-night.use-case";
import { getNightGameChoicesUseCase } from "@/src/application/use-cases/nights/get-night-game-choices.use-case";
import { inviteToNightUseCase } from "@/src/application/use-cases/nights/invite-to-night.use-case";
import { listNightsUseCase } from "@/src/application/use-cases/nights/list-nights.use-case";
import { makeNightLinkUseCase } from "@/src/application/use-cases/nights/make-night-link.use-case";
import { openNightLinkUseCase } from "@/src/application/use-cases/nights/open-night-link.use-case";
import { removeFromWaitlistUseCase } from "@/src/application/use-cases/nights/remove-from-waitlist.use-case";
import { removeGameFromNightUseCase } from "@/src/application/use-cases/nights/remove-game-from-night.use-case";
import { splitTablesUseCase } from "@/src/application/use-cases/nights/split-tables.use-case";
import { updateNightUseCase } from "@/src/application/use-cases/nights/update-night.use-case";
import { voteUseCase } from "@/src/application/use-cases/nights/vote.use-case";
import { whatToPlayUseCase } from "@/src/application/use-cases/nights/what-to-play.use-case";
import { GameNightsRepository } from "@/src/infrastructure/repositories/game-nights.repository";
import { MockGameNightsRepository } from "@/src/infrastructure/repositories/game-nights.repository.mock";
import { addGameToNightController } from "@/src/interface-adapters/controllers/nights/add-game-to-night.controller";
import { answerNightController } from "@/src/interface-adapters/controllers/nights/answer-night.controller";
import { checkNightLinkController } from "@/src/interface-adapters/controllers/nights/check-night-link.controller";
import { createNightController } from "@/src/interface-adapters/controllers/nights/create-night.controller";
import { getInviteChoicesController } from "@/src/interface-adapters/controllers/nights/get-invite-choices.controller";
import { getNightController } from "@/src/interface-adapters/controllers/nights/get-night.controller";
import { getNightGameChoicesController } from "@/src/interface-adapters/controllers/nights/get-night-game-choices.controller";
import { inviteToNightController } from "@/src/interface-adapters/controllers/nights/invite-to-night.controller";
import { listNightsController } from "@/src/interface-adapters/controllers/nights/list-nights.controller";
import { makeNightLinkController } from "@/src/interface-adapters/controllers/nights/make-night-link.controller";
import { openNightLinkController } from "@/src/interface-adapters/controllers/nights/open-night-link.controller";
import { removeFromWaitlistController } from "@/src/interface-adapters/controllers/nights/remove-from-waitlist.controller";
import { removeGameFromNightController } from "@/src/interface-adapters/controllers/nights/remove-game-from-night.controller";
import { splitTablesController } from "@/src/interface-adapters/controllers/nights/split-tables.controller";
import { updateNightController } from "@/src/interface-adapters/controllers/nights/update-night.controller";
import { voteController } from "@/src/interface-adapters/controllers/nights/vote.controller";
import { whatToPlayController } from "@/src/interface-adapters/controllers/nights/what-to-play.controller";

// Game nights (R29 to R39): U17's daily run reads who's going; U18 makes, edits and reads them;
// U19 answers, invites, the night's link, the waitlist, and the games and votes.
export function createNightsModule() {
  const nightsModule = createModule();

  if (process.env.NODE_ENV === "test") {
    nightsModule
      .bind(DI_SYMBOLS.IGameNightsRepository)
      .toClass(MockGameNightsRepository, [DI_SYMBOLS.IFriendshipsRepository]);
  } else {
    nightsModule
      .bind(DI_SYMBOLS.IGameNightsRepository)
      .toClass(GameNightsRepository, [DI_SYMBOLS.ILoggerService]);
  }

  const {
    IFriendshipsRepository: friendships,
    IGameNightsRepository: gameNights,
    IGamesRepository: games,
    ILoansRepository: loans,
    ILoggerService: log,
    INoticesRepository: notices,
    ITransactionManagerService: transactions,
    IUserGamesRepository: userGames,
    IUserProfilesRepository: profiles,
  } = DI_SYMBOLS;

  nightsModule
    .bind(DI_SYMBOLS.ICreateNightUseCase)
    .toHigherOrderFunction(createNightUseCase, [
      userGames,
      gameNights,
      transactions,
      log,
    ]);
  nightsModule
    .bind(DI_SYMBOLS.ICreateNightController)
    .toHigherOrderFunction(createNightController, [
      DI_SYMBOLS.ICreateNightUseCase,
      log,
    ]);
  nightsModule
    .bind(DI_SYMBOLS.IUpdateNightUseCase)
    .toHigherOrderFunction(updateNightUseCase, [
      friendships,
      gameNights,
      notices,
      transactions,
      log,
    ]);
  nightsModule
    .bind(DI_SYMBOLS.IUpdateNightController)
    .toHigherOrderFunction(updateNightController, [
      DI_SYMBOLS.IUpdateNightUseCase,
      log,
    ]);
  nightsModule
    .bind(DI_SYMBOLS.IListNightsUseCase)
    .toHigherOrderFunction(listNightsUseCase, [gameNights, profiles]);
  nightsModule
    .bind(DI_SYMBOLS.IListNightsController)
    .toHigherOrderFunction(listNightsController, [
      DI_SYMBOLS.IListNightsUseCase,
      log,
    ]);
  nightsModule
    .bind(DI_SYMBOLS.IGetNightUseCase)
    .toHigherOrderFunction(getNightUseCase, [
      friendships,
      gameNights,
      userGames,
      games,
      profiles,
    ]);
  nightsModule
    .bind(DI_SYMBOLS.IGetNightController)
    .toHigherOrderFunction(getNightController, [
      DI_SYMBOLS.IGetNightUseCase,
      log,
    ]);
  nightsModule
    .bind(DI_SYMBOLS.IGetNightGameChoicesUseCase)
    .toHigherOrderFunction(getNightGameChoicesUseCase, [
      userGames,
      games,
      loans,
      profiles,
    ]);
  nightsModule
    .bind(DI_SYMBOLS.IGetNightGameChoicesController)
    .toHigherOrderFunction(getNightGameChoicesController, [
      DI_SYMBOLS.IGetNightGameChoicesUseCase,
      log,
    ]);

  nightsModule
    .bind(DI_SYMBOLS.IAnswerNightUseCase)
    .toHigherOrderFunction(answerNightUseCase, [
      friendships,
      gameNights,
      userGames,
      notices,
      transactions,
      log,
    ]);
  nightsModule
    .bind(DI_SYMBOLS.IAnswerNightController)
    .toHigherOrderFunction(answerNightController, [
      DI_SYMBOLS.IAnswerNightUseCase,
      log,
    ]);
  nightsModule
    .bind(DI_SYMBOLS.IInviteToNightUseCase)
    .toHigherOrderFunction(inviteToNightUseCase, [
      friendships,
      gameNights,
      notices,
      transactions,
      log,
    ]);
  nightsModule
    .bind(DI_SYMBOLS.IInviteToNightController)
    .toHigherOrderFunction(inviteToNightController, [
      DI_SYMBOLS.IInviteToNightUseCase,
      log,
    ]);
  nightsModule
    .bind(DI_SYMBOLS.IGetInviteChoicesUseCase)
    .toHigherOrderFunction(getInviteChoicesUseCase, [
      friendships,
      gameNights,
      profiles,
    ]);
  nightsModule
    .bind(DI_SYMBOLS.IGetInviteChoicesController)
    .toHigherOrderFunction(getInviteChoicesController, [
      DI_SYMBOLS.IGetInviteChoicesUseCase,
      log,
    ]);
  nightsModule
    .bind(DI_SYMBOLS.IMakeNightLinkUseCase)
    .toHigherOrderFunction(makeNightLinkUseCase, [
      friendships,
      gameNights,
      transactions,
      log,
    ]);
  nightsModule
    .bind(DI_SYMBOLS.IMakeNightLinkController)
    .toHigherOrderFunction(makeNightLinkController, [
      DI_SYMBOLS.IMakeNightLinkUseCase,
      log,
    ]);
  nightsModule
    .bind(DI_SYMBOLS.ICheckNightLinkUseCase)
    .toHigherOrderFunction(checkNightLinkUseCase, [gameNights]);
  nightsModule
    .bind(DI_SYMBOLS.ICheckNightLinkController)
    .toHigherOrderFunction(checkNightLinkController, [
      DI_SYMBOLS.ICheckNightLinkUseCase,
      log,
    ]);
  nightsModule
    .bind(DI_SYMBOLS.IOpenNightLinkUseCase)
    .toHigherOrderFunction(openNightLinkUseCase, [
      gameNights,
      transactions,
      log,
    ]);
  nightsModule
    .bind(DI_SYMBOLS.IOpenNightLinkController)
    .toHigherOrderFunction(openNightLinkController, [
      DI_SYMBOLS.IOpenNightLinkUseCase,
      log,
    ]);
  nightsModule
    .bind(DI_SYMBOLS.IRemoveFromWaitlistUseCase)
    .toHigherOrderFunction(removeFromWaitlistUseCase, [
      friendships,
      gameNights,
      notices,
      transactions,
      log,
    ]);
  nightsModule
    .bind(DI_SYMBOLS.IRemoveFromWaitlistController)
    .toHigherOrderFunction(removeFromWaitlistController, [
      DI_SYMBOLS.IRemoveFromWaitlistUseCase,
      log,
    ]);
  nightsModule
    .bind(DI_SYMBOLS.IAddGameToNightUseCase)
    .toHigherOrderFunction(addGameToNightUseCase, [
      friendships,
      gameNights,
      userGames,
      transactions,
      log,
    ]);
  nightsModule
    .bind(DI_SYMBOLS.IAddGameToNightController)
    .toHigherOrderFunction(addGameToNightController, [
      DI_SYMBOLS.IAddGameToNightUseCase,
      log,
    ]);
  nightsModule
    .bind(DI_SYMBOLS.IRemoveGameFromNightUseCase)
    .toHigherOrderFunction(removeGameFromNightUseCase, [
      friendships,
      gameNights,
      userGames,
      transactions,
      log,
    ]);
  nightsModule
    .bind(DI_SYMBOLS.IRemoveGameFromNightController)
    .toHigherOrderFunction(removeGameFromNightController, [
      DI_SYMBOLS.IRemoveGameFromNightUseCase,
      log,
    ]);
  nightsModule
    .bind(DI_SYMBOLS.IVoteUseCase)
    .toHigherOrderFunction(voteUseCase, [
      friendships,
      gameNights,
      transactions,
      log,
    ]);
  nightsModule
    .bind(DI_SYMBOLS.IVoteController)
    .toHigherOrderFunction(voteController, [DI_SYMBOLS.IVoteUseCase, log]);

  nightsModule
    .bind(DI_SYMBOLS.IWhatToPlayUseCase)
    .toHigherOrderFunction(whatToPlayUseCase, [
      friendships,
      gameNights,
      userGames,
      games,
      profiles,
    ]);
  nightsModule
    .bind(DI_SYMBOLS.IWhatToPlayController)
    .toHigherOrderFunction(whatToPlayController, [
      DI_SYMBOLS.IWhatToPlayUseCase,
      log,
    ]);
  nightsModule
    .bind(DI_SYMBOLS.ISplitTablesUseCase)
    .toHigherOrderFunction(splitTablesUseCase, [
      friendships,
      gameNights,
      userGames,
      games,
      profiles,
    ]);
  nightsModule
    .bind(DI_SYMBOLS.ISplitTablesController)
    .toHigherOrderFunction(splitTablesController, [
      DI_SYMBOLS.ISplitTablesUseCase,
      log,
    ]);

  return nightsModule;
}
