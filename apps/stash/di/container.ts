import { createContainer } from "@evyweb/ioctopus";
import { createAuthenticationModule } from "@/di/modules/authentication.module";
import { createLoggerModule } from "@/di/modules/logger.module";
import { createStashItemsModule } from "@/di/modules/stash-items.module";
import { createTransactionModule } from "@/di/modules/transaction.module";
import { type DI_RETURN_TYPES, DI_SYMBOLS } from "@/di/types";

const ApplicationContainer = createContainer();

ApplicationContainer.load(Symbol("LoggerModule"), createLoggerModule());
ApplicationContainer.load(
  Symbol("AuthenticationModule"),
  createAuthenticationModule(),
);
ApplicationContainer.load(
  Symbol("TransactionModule"),
  createTransactionModule(),
);
ApplicationContainer.load(Symbol("StashItemsModule"), createStashItemsModule());

export function getInjection<K extends keyof typeof DI_SYMBOLS>(
  symbol: K,
): DI_RETURN_TYPES[K] {
  return ApplicationContainer.get(DI_SYMBOLS[symbol]);
}
