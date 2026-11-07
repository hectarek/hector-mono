import { createModule } from "@evyweb/ioctopus";
import { DI_SYMBOLS } from "@/di/types";
import { addBlocksUseCase } from "@/src/application/use-cases/blocks/add-blocks.use-case";
import { deleteBlockUseCase } from "@/src/application/use-cases/blocks/delete-block.use-case";
import { getBlockUseCase } from "@/src/application/use-cases/blocks/get-block.use-case";
import { listBlocksUseCase } from "@/src/application/use-cases/blocks/list-blocks.use-case";
import { updateBlockUseCase } from "@/src/application/use-cases/blocks/update-block.use-case";
import { BlocksRepository } from "@/src/infrastructure/repositories/blocks.repository";
import { MockBlocksRepository } from "@/src/infrastructure/repositories/blocks.repository.mock";
import { addBlocksController } from "@/src/interface-adapters/controllers/blocks/add-blocks.controller";
import { deleteBlockController } from "@/src/interface-adapters/controllers/blocks/delete-block.controller";
import { getBlockController } from "@/src/interface-adapters/controllers/blocks/get-block.controller";
import { listBlocksController } from "@/src/interface-adapters/controllers/blocks/list-blocks.controller";
import { updateBlockController } from "@/src/interface-adapters/controllers/blocks/update-block.controller";

// Focus blocks (docs/build-plan.md U17).
export function createBlocksModule() {
  const blocksModule = createModule();

  if (process.env.NODE_ENV === "test") {
    blocksModule
      .bind(DI_SYMBOLS.IBlocksRepository)
      .toClass(MockBlocksRepository);
  } else {
    blocksModule
      .bind(DI_SYMBOLS.IBlocksRepository)
      .toClass(BlocksRepository, [DI_SYMBOLS.ILoggerService]);
  }

  const writes = [
    DI_SYMBOLS.IBlocksRepository,
    DI_SYMBOLS.IActivityRepository,
    DI_SYMBOLS.ITransactionManagerService,
    DI_SYMBOLS.ILoggerService,
  ];
  blocksModule
    .bind(DI_SYMBOLS.IAddBlocksUseCase)
    .toHigherOrderFunction(addBlocksUseCase, writes);
  blocksModule
    .bind(DI_SYMBOLS.IUpdateBlockUseCase)
    .toHigherOrderFunction(updateBlockUseCase, writes);
  blocksModule
    .bind(DI_SYMBOLS.IDeleteBlockUseCase)
    .toHigherOrderFunction(deleteBlockUseCase, writes);
  blocksModule
    .bind(DI_SYMBOLS.IListBlocksUseCase)
    .toHigherOrderFunction(listBlocksUseCase, [DI_SYMBOLS.IBlocksRepository]);
  blocksModule
    .bind(DI_SYMBOLS.IGetBlockUseCase)
    .toHigherOrderFunction(getBlockUseCase, [DI_SYMBOLS.IBlocksRepository]);

  blocksModule
    .bind(DI_SYMBOLS.IAddBlocksController)
    .toHigherOrderFunction(addBlocksController, [
      DI_SYMBOLS.IAddBlocksUseCase,
      DI_SYMBOLS.ILoggerService,
    ]);
  blocksModule
    .bind(DI_SYMBOLS.IUpdateBlockController)
    .toHigherOrderFunction(updateBlockController, [
      DI_SYMBOLS.IUpdateBlockUseCase,
      DI_SYMBOLS.ILoggerService,
    ]);
  blocksModule
    .bind(DI_SYMBOLS.IDeleteBlockController)
    .toHigherOrderFunction(deleteBlockController, [
      DI_SYMBOLS.IDeleteBlockUseCase,
      DI_SYMBOLS.ILoggerService,
    ]);
  blocksModule
    .bind(DI_SYMBOLS.IListBlocksController)
    .toHigherOrderFunction(listBlocksController, [
      DI_SYMBOLS.IListBlocksUseCase,
      DI_SYMBOLS.ILoggerService,
    ]);
  blocksModule
    .bind(DI_SYMBOLS.IGetBlockController)
    .toHigherOrderFunction(getBlockController, [
      DI_SYMBOLS.IGetBlockUseCase,
      DI_SYMBOLS.ILoggerService,
    ]);

  return blocksModule;
}
