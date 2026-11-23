import { createModule } from "@evyweb/ioctopus";
import { DI_SYMBOLS } from "@/di/types";
import { answerFriendRequestUseCase } from "@/src/application/use-cases/friends/answer-friend-request.use-case";
import { cancelFriendRequestUseCase } from "@/src/application/use-cases/friends/cancel-friend-request.use-case";
import { checkFriendLinkUseCase } from "@/src/application/use-cases/friends/check-friend-link.use-case";
import { getFriendUseCase } from "@/src/application/use-cases/friends/get-friend.use-case";
import { getFriendLinkUseCase } from "@/src/application/use-cases/friends/get-friend-link.use-case";
import { listFriendsUseCase } from "@/src/application/use-cases/friends/list-friends.use-case";
import { listPeopleYouMayKnowUseCase } from "@/src/application/use-cases/friends/list-people-you-may-know.use-case";
import { makeFriendLinkUseCase } from "@/src/application/use-cases/friends/make-friend-link.use-case";
import { openFriendLinkUseCase } from "@/src/application/use-cases/friends/open-friend-link.use-case";
import { sendFriendRequestUseCase } from "@/src/application/use-cases/friends/send-friend-request.use-case";
import { unfriendUseCase } from "@/src/application/use-cases/friends/unfriend.use-case";
import { FriendLinksRepository } from "@/src/infrastructure/repositories/friend-links.repository";
import { MockFriendLinksRepository } from "@/src/infrastructure/repositories/friend-links.repository.mock";
import { FriendRequestsRepository } from "@/src/infrastructure/repositories/friend-requests.repository";
import { MockFriendRequestsRepository } from "@/src/infrastructure/repositories/friend-requests.repository.mock";
import { FriendshipsRepository } from "@/src/infrastructure/repositories/friendships.repository";
import { MockFriendshipsRepository } from "@/src/infrastructure/repositories/friendships.repository.mock";
import { answerFriendRequestController } from "@/src/interface-adapters/controllers/friends/answer-friend-request.controller";
import { cancelFriendRequestController } from "@/src/interface-adapters/controllers/friends/cancel-friend-request.controller";
import { checkFriendLinkController } from "@/src/interface-adapters/controllers/friends/check-friend-link.controller";
import { getFriendController } from "@/src/interface-adapters/controllers/friends/get-friend.controller";
import { getFriendLinkController } from "@/src/interface-adapters/controllers/friends/get-friend-link.controller";
import { listFriendsController } from "@/src/interface-adapters/controllers/friends/list-friends.controller";
import { listPeopleYouMayKnowController } from "@/src/interface-adapters/controllers/friends/list-people-you-may-know.controller";
import { makeFriendLinkController } from "@/src/interface-adapters/controllers/friends/make-friend-link.controller";
import { openFriendLinkController } from "@/src/interface-adapters/controllers/friends/open-friend-link.controller";
import { sendFriendRequestController } from "@/src/interface-adapters/controllers/friends/send-friend-request.controller";
import { unfriendController } from "@/src/interface-adapters/controllers/friends/unfriend.controller";

// Friendships, friend requests and friend links (R49, R50; U4, U10).
export function createFriendsModule() {
  const friendsModule = createModule();

  if (process.env.NODE_ENV === "test") {
    friendsModule
      .bind(DI_SYMBOLS.IFriendshipsRepository)
      .toClass(MockFriendshipsRepository);
    friendsModule
      .bind(DI_SYMBOLS.IFriendRequestsRepository)
      .toClass(MockFriendRequestsRepository);
    friendsModule
      .bind(DI_SYMBOLS.IFriendLinksRepository)
      .toClass(MockFriendLinksRepository);
  } else {
    friendsModule
      .bind(DI_SYMBOLS.IFriendshipsRepository)
      .toClass(FriendshipsRepository, [DI_SYMBOLS.ILoggerService]);
    friendsModule
      .bind(DI_SYMBOLS.IFriendRequestsRepository)
      .toClass(FriendRequestsRepository, [DI_SYMBOLS.ILoggerService]);
    friendsModule
      .bind(DI_SYMBOLS.IFriendLinksRepository)
      .toClass(FriendLinksRepository, [DI_SYMBOLS.ILoggerService]);
  }

  const {
    IFileStorage: files,
    IFriendLinksRepository: links,
    IFriendRequestsRepository: requests,
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

  friendsModule
    .bind(DI_SYMBOLS.IAnswerFriendRequestUseCase)
    .toHigherOrderFunction(answerFriendRequestUseCase, [
      friendships,
      requests,
      transactions,
      log,
    ]);
  friendsModule
    .bind(DI_SYMBOLS.ICancelFriendRequestUseCase)
    .toHigherOrderFunction(cancelFriendRequestUseCase, [
      requests,
      transactions,
      log,
    ]);
  friendsModule
    .bind(DI_SYMBOLS.ICheckFriendLinkUseCase)
    .toHigherOrderFunction(checkFriendLinkUseCase, [links]);
  friendsModule
    .bind(DI_SYMBOLS.IGetFriendLinkUseCase)
    .toHigherOrderFunction(getFriendLinkUseCase, [links, transactions, log]);
  friendsModule
    .bind(DI_SYMBOLS.IGetFriendUseCase)
    .toHigherOrderFunction(getFriendUseCase, [
      friendships,
      profiles,
      userGames,
      games,
      loans,
      files,
      gameNights,
    ]);
  friendsModule
    .bind(DI_SYMBOLS.IListFriendsUseCase)
    .toHigherOrderFunction(listFriendsUseCase, [
      friendships,
      requests,
      profiles,
      userGames,
      gameNights,
    ]);
  friendsModule
    .bind(DI_SYMBOLS.IListPeopleYouMayKnowUseCase)
    .toHigherOrderFunction(listPeopleYouMayKnowUseCase, [
      friendships,
      requests,
      profiles,
      gameNights,
    ]);
  friendsModule
    .bind(DI_SYMBOLS.IMakeFriendLinkUseCase)
    .toHigherOrderFunction(makeFriendLinkUseCase, [links, transactions, log]);
  friendsModule
    .bind(DI_SYMBOLS.IOpenFriendLinkUseCase)
    .toHigherOrderFunction(openFriendLinkUseCase, [
      links,
      friendships,
      requests,
      profiles,
      transactions,
      log,
    ]);
  friendsModule
    .bind(DI_SYMBOLS.ISendFriendRequestUseCase)
    .toHigherOrderFunction(sendFriendRequestUseCase, [
      friendships,
      requests,
      notices,
      transactions,
      log,
      gameNights,
    ]);
  friendsModule
    .bind(DI_SYMBOLS.IUnfriendUseCase)
    .toHigherOrderFunction(unfriendUseCase, [
      friendships,
      requests,
      userGames,
      loans,
      transactions,
      log,
      gameNights,
      notices,
    ]);

  for (const [controller, factory, useCase] of [
    [
      DI_SYMBOLS.IAnswerFriendRequestController,
      answerFriendRequestController,
      DI_SYMBOLS.IAnswerFriendRequestUseCase,
    ],
    [
      DI_SYMBOLS.ICancelFriendRequestController,
      cancelFriendRequestController,
      DI_SYMBOLS.ICancelFriendRequestUseCase,
    ],
    [
      DI_SYMBOLS.ICheckFriendLinkController,
      checkFriendLinkController,
      DI_SYMBOLS.ICheckFriendLinkUseCase,
    ],
    [
      DI_SYMBOLS.IGetFriendController,
      getFriendController,
      DI_SYMBOLS.IGetFriendUseCase,
    ],
    [
      DI_SYMBOLS.IGetFriendLinkController,
      getFriendLinkController,
      DI_SYMBOLS.IGetFriendLinkUseCase,
    ],
    [
      DI_SYMBOLS.IListFriendsController,
      listFriendsController,
      DI_SYMBOLS.IListFriendsUseCase,
    ],
    [
      DI_SYMBOLS.IListPeopleYouMayKnowController,
      listPeopleYouMayKnowController,
      DI_SYMBOLS.IListPeopleYouMayKnowUseCase,
    ],
    [
      DI_SYMBOLS.IMakeFriendLinkController,
      makeFriendLinkController,
      DI_SYMBOLS.IMakeFriendLinkUseCase,
    ],
    [
      DI_SYMBOLS.IOpenFriendLinkController,
      openFriendLinkController,
      DI_SYMBOLS.IOpenFriendLinkUseCase,
    ],
    [
      DI_SYMBOLS.ISendFriendRequestController,
      sendFriendRequestController,
      DI_SYMBOLS.ISendFriendRequestUseCase,
    ],
    [
      DI_SYMBOLS.IUnfriendController,
      unfriendController,
      DI_SYMBOLS.IUnfriendUseCase,
    ],
  ] as const) {
    friendsModule
      .bind(controller)
      .toHigherOrderFunction(factory, [useCase, log]);
  }

  return friendsModule;
}
