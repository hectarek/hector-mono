import { createModule } from "@evyweb/ioctopus";
import { DI_SYMBOLS } from "@/di/types";
import { UserGamesRepository } from "@/src/infrastructure/repositories/user-games.repository";
import { MockUserGamesRepository } from "@/src/infrastructure/repositories/user-games.repository.mock";

export function createCopiesModule() {
  const copiesModule = createModule();

  if (process.env.NODE_ENV === "test") {
    copiesModule
      .bind(DI_SYMBOLS.IUserGamesRepository)
      .toClass(MockUserGamesRepository, [DI_SYMBOLS.IFriendshipsRepository]);
  } else {
    copiesModule
      .bind(DI_SYMBOLS.IUserGamesRepository)
      .toClass(UserGamesRepository, [DI_SYMBOLS.ILoggerService]);
  }

  return copiesModule;
}
