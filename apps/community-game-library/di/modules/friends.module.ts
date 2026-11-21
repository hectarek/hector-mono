import { createModule } from "@evyweb/ioctopus";
import { DI_SYMBOLS } from "@/di/types";
import { FriendshipsRepository } from "@/src/infrastructure/repositories/friendships.repository";
import { MockFriendshipsRepository } from "@/src/infrastructure/repositories/friendships.repository.mock";

export function createFriendsModule() {
  const friendsModule = createModule();

  if (process.env.NODE_ENV === "test") {
    friendsModule
      .bind(DI_SYMBOLS.IFriendshipsRepository)
      .toClass(MockFriendshipsRepository);
  } else {
    friendsModule
      .bind(DI_SYMBOLS.IFriendshipsRepository)
      .toClass(FriendshipsRepository, [DI_SYMBOLS.ILoggerService]);
  }

  return friendsModule;
}
