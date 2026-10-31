// The sheet's import use case over the real repositories (docs/build-plan.md U11). The import
// script loads this module only once it has set DATABASE_URL, which the repositories' database
// module reads when it loads.
import { importSnapshotUseCase } from "@/src/application/use-cases/import/import-snapshot.use-case";
import { ActivityRepository } from "@/src/infrastructure/repositories/activity.repository";
import { CompaniesRepository } from "@/src/infrastructure/repositories/companies.repository";
import { ImportRefsRepository } from "@/src/infrastructure/repositories/import-refs.repository";
import { InteractionsRepository } from "@/src/infrastructure/repositories/interactions.repository";
import { JobsRepository } from "@/src/infrastructure/repositories/jobs.repository";
import { LeadSourcesRepository } from "@/src/infrastructure/repositories/lead-sources.repository";
import { PeopleRepository } from "@/src/infrastructure/repositories/people.repository";
import { PracticeRepository } from "@/src/infrastructure/repositories/practice.repository";
import { ConsoleLoggerService } from "@/src/infrastructure/services/console-logger.service";
import { TransactionManagerService } from "@/src/infrastructure/services/transaction-manager.service";

const log = new ConsoleLoggerService({ script: "import-snapshot" });

export const importSnapshotWithRepositories = importSnapshotUseCase(
  new CompaniesRepository(log),
  new LeadSourcesRepository(log),
  new JobsRepository(log),
  new PeopleRepository(log),
  new InteractionsRepository(log),
  new PracticeRepository(log),
  new ActivityRepository(log),
  new ImportRefsRepository(log),
  new TransactionManagerService(log),
  log,
);
