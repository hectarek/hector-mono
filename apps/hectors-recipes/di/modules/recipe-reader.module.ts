import { createModule } from "@evyweb/ioctopus";
import { DI_SYMBOLS } from "@/di/types";
import { readRecipeUseCase } from "@/src/application/use-cases/recipes/read-recipe.use-case";
import { readRecipeFromLinkUseCase } from "@/src/application/use-cases/recipes/read-recipe-from-link.use-case";
import { RecipeReadsRepository } from "@/src/infrastructure/repositories/recipe-reads.repository";
import { MockRecipeReadsRepository } from "@/src/infrastructure/repositories/recipe-reads.repository.mock";
import { AiGatewayRecipeReaderService } from "@/src/infrastructure/services/ai-gateway-recipe-reader.service";
import { HttpRecipePageFetcherService } from "@/src/infrastructure/services/http-recipe-page-fetcher.service";
import { MockRecipePageFetcherService } from "@/src/infrastructure/services/mock-recipe-page-fetcher.service";
import { MockRecipeReaderService } from "@/src/infrastructure/services/mock-recipe-reader.service";
import { readRecipeController } from "@/src/interface-adapters/controllers/recipes/read-recipe.controller";
import { readRecipeFromLinkController } from "@/src/interface-adapters/controllers/recipes/read-recipe-from-link.controller";

export function createRecipeReaderModule() {
  const recipeReaderModule = createModule();

  if (process.env.NODE_ENV === "test") {
    recipeReaderModule
      .bind(DI_SYMBOLS.IRecipeReaderService)
      .toClass(MockRecipeReaderService);
    recipeReaderModule
      .bind(DI_SYMBOLS.IRecipePageFetcherService)
      .toClass(MockRecipePageFetcherService);
    recipeReaderModule
      .bind(DI_SYMBOLS.IRecipeReadsRepository)
      .toClass(MockRecipeReadsRepository);
  } else {
    recipeReaderModule
      .bind(DI_SYMBOLS.IRecipeReaderService)
      .toClass(AiGatewayRecipeReaderService, [DI_SYMBOLS.ILoggerService]);
    recipeReaderModule
      .bind(DI_SYMBOLS.IRecipePageFetcherService)
      .toClass(HttpRecipePageFetcherService, [DI_SYMBOLS.ILoggerService]);
    recipeReaderModule
      .bind(DI_SYMBOLS.IRecipeReadsRepository)
      .toClass(RecipeReadsRepository, [DI_SYMBOLS.ILoggerService]);
  }

  // Import (ux-plan Phase 10): read a photo or a page's text into a draft to check.
  recipeReaderModule
    .bind(DI_SYMBOLS.IReadRecipeUseCase)
    .toHigherOrderFunction(readRecipeUseCase, [
      DI_SYMBOLS.IRecipeReaderService,
      DI_SYMBOLS.IRecipeReadsRepository,
      DI_SYMBOLS.ILoggerService,
    ]);
  recipeReaderModule
    .bind(DI_SYMBOLS.IReadRecipeController)
    .toHigherOrderFunction(readRecipeController, [
      DI_SYMBOLS.IReadRecipeUseCase,
      DI_SYMBOLS.ILoggerService,
    ]);

  recipeReaderModule
    .bind(DI_SYMBOLS.IReadRecipeFromLinkUseCase)
    .toHigherOrderFunction(readRecipeFromLinkUseCase, [
      DI_SYMBOLS.IRecipePageFetcherService,
      DI_SYMBOLS.IReadRecipeUseCase,
      DI_SYMBOLS.ILoggerService,
    ]);
  recipeReaderModule
    .bind(DI_SYMBOLS.IReadRecipeFromLinkController)
    .toHigherOrderFunction(readRecipeFromLinkController, [
      DI_SYMBOLS.IReadRecipeFromLinkUseCase,
      DI_SYMBOLS.ILoggerService,
    ]);

  return recipeReaderModule;
}
