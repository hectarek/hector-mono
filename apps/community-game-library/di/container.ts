import { createContainer } from "@evyweb/ioctopus";
import { createAccessModule } from "@/di/modules/access.module";
import { createAuthenticationModule } from "@/di/modules/authentication.module";
import { createCatalogModule } from "@/di/modules/catalog.module";
import { createCopiesModule } from "@/di/modules/copies.module";
import { createDailyModule } from "@/di/modules/daily.module";
import { createFileStorageModule } from "@/di/modules/file-storage.module";
import { createFriendsModule } from "@/di/modules/friends.module";
import { createLoansModule } from "@/di/modules/loans.module";
import { createLoggerModule } from "@/di/modules/logger.module";
import { createNightsModule } from "@/di/modules/nights.module";
import { createNoticesModule } from "@/di/modules/notices.module";
import { createProfileModule } from "@/di/modules/profile.module";
import { createSuggestionsModule } from "@/di/modules/suggestions.module";
import { createTransactionModule } from "@/di/modules/transaction.module";
import { type DI_RETURN_TYPES, DI_SYMBOLS } from "@/di/types";

const ApplicationContainer = createContainer();

ApplicationContainer.load(Symbol("AccessModule"), createAccessModule());
ApplicationContainer.load(
  Symbol("AuthenticationModule"),
  createAuthenticationModule(),
);
ApplicationContainer.load(Symbol("CatalogModule"), createCatalogModule());
ApplicationContainer.load(Symbol("CopiesModule"), createCopiesModule());
ApplicationContainer.load(Symbol("DailyModule"), createDailyModule());
ApplicationContainer.load(
  Symbol("FileStorageModule"),
  createFileStorageModule(),
);
ApplicationContainer.load(Symbol("FriendsModule"), createFriendsModule());
ApplicationContainer.load(Symbol("LoansModule"), createLoansModule());
ApplicationContainer.load(Symbol("LoggerModule"), createLoggerModule());
ApplicationContainer.load(Symbol("NightsModule"), createNightsModule());
ApplicationContainer.load(Symbol("NoticesModule"), createNoticesModule());
ApplicationContainer.load(Symbol("ProfileModule"), createProfileModule());
ApplicationContainer.load(
  Symbol("SuggestionsModule"),
  createSuggestionsModule(),
);
ApplicationContainer.load(
  Symbol("TransactionModule"),
  createTransactionModule(),
);

export function getInjection<K extends keyof typeof DI_SYMBOLS>(
  symbol: K,
): DI_RETURN_TYPES[K] {
  return ApplicationContainer.get(DI_SYMBOLS[symbol]);
}
