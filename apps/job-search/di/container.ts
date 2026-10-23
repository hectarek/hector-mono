import { createContainer } from "@evyweb/ioctopus";
import { createAccessModule } from "@/di/modules/access.module";
import { createAuthenticationModule } from "@/di/modules/authentication.module";
import { createLoggerModule } from "@/di/modules/logger.module";
import { createTransactionModule } from "@/di/modules/transaction.module";
import { type DI_RETURN_TYPES, DI_SYMBOLS } from "@/di/types";

const ApplicationContainer = createContainer();

ApplicationContainer.load(Symbol("LoggerModule"), createLoggerModule());
ApplicationContainer.load(
  Symbol("AuthenticationModule"),
  createAuthenticationModule(),
);
ApplicationContainer.load(Symbol("AccessModule"), createAccessModule());
ApplicationContainer.load(
  Symbol("TransactionModule"),
  createTransactionModule(),
);

export function getInjection<K extends keyof typeof DI_SYMBOLS>(
  symbol: K,
): DI_RETURN_TYPES[K] {
  return ApplicationContainer.get(DI_SYMBOLS[symbol]);
}
