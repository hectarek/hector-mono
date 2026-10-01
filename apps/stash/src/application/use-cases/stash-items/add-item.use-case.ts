import type { IStashItemsRepository } from "@/src/application/repositories/stash-items.repository.interface";
import type { ILoggerService } from "@/src/application/services/logger.service.interface";
import { InputParseError } from "@/src/entities/errors/common";
import type { StashItem } from "@/src/entities/models/stash-item.model";

export type IAddItemUseCase = ReturnType<typeof addItemUseCase>;

export const addItemUseCase = (
  stashItemsRepository: IStashItemsRepository,
  loggerService: ILoggerService,
) => {
  const logger = loggerService.child({ layer: "use-case", op: "addItem" });

  return async (
    input: {
      url: string;
      title: string;
      description?: string;
      type?: string;
      thumbnailUrl?: string;
      source?: string;
    },
    userId: string,
  ): Promise<StashItem> => {
    if (!input.url || !input.title) {
      throw new InputParseError("URL and title are required");
    }

    logger.info("Adding stash item", { userId, url: input.url });

    const maxPosition = await stashItemsRepository.getMaxPosition(userId);

    const item = await stashItemsRepository.create(
      {
        userId,
        url: input.url,
        title: input.title,
        description: input.description,
        type: input.type as StashItem["type"],
        thumbnailUrl: input.thumbnailUrl,
        source: input.source,
      },
      maxPosition + 1,
    );

    logger.debug("Stash item created", { itemId: item.id });
    return item;
  };
};
