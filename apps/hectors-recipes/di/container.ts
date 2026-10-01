import { createContainer } from "@evyweb/ioctopus";
import { createAuthenticationModule } from "@/di/modules/authentication.module";
import { createGroceryModule } from "@/di/modules/grocery.module";
import { createLoggerModule } from "@/di/modules/logger.module";
import { createPlanModule } from "@/di/modules/plan.module";
import { createRealtimeModule } from "@/di/modules/realtime.module";
import { createRecipeReaderModule } from "@/di/modules/recipe-reader.module";
import { createRecipesModule } from "@/di/modules/recipes.module";
import { createSpacesModule } from "@/di/modules/spaces.module";
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
ApplicationContainer.load(Symbol("RealtimeModule"), createRealtimeModule());
ApplicationContainer.load(
  Symbol("RecipeReaderModule"),
  createRecipeReaderModule(),
);
ApplicationContainer.load(Symbol("SpacesModule"), createSpacesModule());
ApplicationContainer.load(Symbol("RecipesModule"), createRecipesModule());
ApplicationContainer.load(Symbol("PlanModule"), createPlanModule());
ApplicationContainer.load(Symbol("GroceryModule"), createGroceryModule());

export function getInjection<K extends keyof typeof DI_SYMBOLS>(
  symbol: K,
): DI_RETURN_TYPES[K] {
  return ApplicationContainer.get(DI_SYMBOLS[symbol]);
}
