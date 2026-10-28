import { createModule } from "@evyweb/ioctopus";
import { DI_SYMBOLS } from "@/di/types";
import { createJobUseCase } from "@/src/application/use-cases/jobs/create-job.use-case";
import { deleteJobUseCase } from "@/src/application/use-cases/jobs/delete-job.use-case";
import { findJobsUseCase } from "@/src/application/use-cases/jobs/find-jobs.use-case";
import { getJobUseCase } from "@/src/application/use-cases/jobs/get-job.use-case";
import { moveJobUseCase } from "@/src/application/use-cases/jobs/move-job.use-case";
import { reviewProposalUseCase } from "@/src/application/use-cases/jobs/review-proposal.use-case";
import { updateJobUseCase } from "@/src/application/use-cases/jobs/update-job.use-case";
import { JobsRepository } from "@/src/infrastructure/repositories/jobs.repository";
import { MockJobsRepository } from "@/src/infrastructure/repositories/jobs.repository.mock";
import { acceptProposalController } from "@/src/interface-adapters/controllers/jobs/accept-proposal.controller";
import { addJobController } from "@/src/interface-adapters/controllers/jobs/add-job.controller";
import { closeJobController } from "@/src/interface-adapters/controllers/jobs/close-job.controller";
import { deleteJobController } from "@/src/interface-adapters/controllers/jobs/delete-job.controller";
import { dismissProposalController } from "@/src/interface-adapters/controllers/jobs/dismiss-proposal.controller";
import { findJobsController } from "@/src/interface-adapters/controllers/jobs/find-jobs.controller";
import { getJobController } from "@/src/interface-adapters/controllers/jobs/get-job.controller";
import { proposeJobController } from "@/src/interface-adapters/controllers/jobs/propose-job.controller";
import { reopenProposalController } from "@/src/interface-adapters/controllers/jobs/reopen-proposal.controller";
import { setJobStatusController } from "@/src/interface-adapters/controllers/jobs/set-job-status.controller";
import { updateJobController } from "@/src/interface-adapters/controllers/jobs/update-job.controller";

// Jobs, their status moves and the review queue (docs/build-plan.md U6).
export function createJobsModule() {
  const jobsModule = createModule();

  if (process.env.NODE_ENV === "test") {
    jobsModule
      .bind(DI_SYMBOLS.IJobsRepository)
      .toClass(MockJobsRepository, [
        DI_SYMBOLS.ICompaniesRepository,
        DI_SYMBOLS.ILeadSourcesRepository,
      ]);
  } else {
    jobsModule
      .bind(DI_SYMBOLS.IJobsRepository)
      .toClass(JobsRepository, [DI_SYMBOLS.ILoggerService]);
  }

  // Each write's dependencies: the jobs, the log, transactions and the logger.
  const writes = [
    DI_SYMBOLS.IJobsRepository,
    DI_SYMBOLS.IActivityRepository,
    DI_SYMBOLS.ITransactionManagerService,
    DI_SYMBOLS.ILoggerService,
  ];

  jobsModule
    .bind(DI_SYMBOLS.IFindJobsUseCase)
    .toHigherOrderFunction(findJobsUseCase, [
      DI_SYMBOLS.IJobsRepository,
      DI_SYMBOLS.ILoggerService,
    ]);
  jobsModule
    .bind(DI_SYMBOLS.IGetJobUseCase)
    .toHigherOrderFunction(getJobUseCase, [
      DI_SYMBOLS.IJobsRepository,
      DI_SYMBOLS.INotesRepository,
      DI_SYMBOLS.IActivityRepository,
      DI_SYMBOLS.IPeopleRepository,
      DI_SYMBOLS.IInteractionsRepository,
      DI_SYMBOLS.ILoggerService,
    ]);
  jobsModule
    .bind(DI_SYMBOLS.ICreateJobUseCase)
    .toHigherOrderFunction(createJobUseCase, [
      DI_SYMBOLS.IJobsRepository,
      DI_SYMBOLS.ICompaniesRepository,
      DI_SYMBOLS.ILeadSourcesRepository,
      DI_SYMBOLS.ISettingsRepository,
      DI_SYMBOLS.IActivityRepository,
      DI_SYMBOLS.ITransactionManagerService,
      DI_SYMBOLS.ILoggerService,
    ]);
  jobsModule
    .bind(DI_SYMBOLS.IUpdateJobUseCase)
    .toHigherOrderFunction(updateJobUseCase, [
      DI_SYMBOLS.IJobsRepository,
      DI_SYMBOLS.ICompaniesRepository,
      DI_SYMBOLS.ILeadSourcesRepository,
      DI_SYMBOLS.IActivityRepository,
      DI_SYMBOLS.ITransactionManagerService,
      DI_SYMBOLS.ILoggerService,
    ]);
  jobsModule
    .bind(DI_SYMBOLS.IMoveJobUseCase)
    .toHigherOrderFunction(moveJobUseCase, writes);
  jobsModule
    .bind(DI_SYMBOLS.IReviewProposalUseCase)
    .toHigherOrderFunction(reviewProposalUseCase, writes);
  jobsModule
    .bind(DI_SYMBOLS.IDeleteJobUseCase)
    .toHigherOrderFunction(deleteJobUseCase, [
      DI_SYMBOLS.IJobsRepository,
      DI_SYMBOLS.INotesRepository,
      DI_SYMBOLS.IPeopleRepository,
      DI_SYMBOLS.IInteractionsRepository,
      DI_SYMBOLS.IActivityRepository,
      DI_SYMBOLS.ITransactionManagerService,
      DI_SYMBOLS.ILoggerService,
    ]);

  const controllers = [
    [
      DI_SYMBOLS.IFindJobsController,
      findJobsController,
      DI_SYMBOLS.IFindJobsUseCase,
    ],
    [DI_SYMBOLS.IGetJobController, getJobController, DI_SYMBOLS.IGetJobUseCase],
    [
      DI_SYMBOLS.IProposeJobController,
      proposeJobController,
      DI_SYMBOLS.ICreateJobUseCase,
    ],
    [
      DI_SYMBOLS.IAddJobController,
      addJobController,
      DI_SYMBOLS.ICreateJobUseCase,
    ],
    [
      DI_SYMBOLS.IUpdateJobController,
      updateJobController,
      DI_SYMBOLS.IUpdateJobUseCase,
    ],
    [
      DI_SYMBOLS.ISetJobStatusController,
      setJobStatusController,
      DI_SYMBOLS.IMoveJobUseCase,
    ],
    [
      DI_SYMBOLS.ICloseJobController,
      closeJobController,
      DI_SYMBOLS.IMoveJobUseCase,
    ],
    [
      DI_SYMBOLS.IAcceptProposalController,
      acceptProposalController,
      DI_SYMBOLS.IReviewProposalUseCase,
    ],
    [
      DI_SYMBOLS.IDismissProposalController,
      dismissProposalController,
      DI_SYMBOLS.IReviewProposalUseCase,
    ],
    [
      DI_SYMBOLS.IReopenProposalController,
      reopenProposalController,
      DI_SYMBOLS.IReviewProposalUseCase,
    ],
    [
      DI_SYMBOLS.IDeleteJobController,
      deleteJobController,
      DI_SYMBOLS.IDeleteJobUseCase,
    ],
  ] as const;
  for (const [symbol, controller, useCase] of controllers) {
    jobsModule
      .bind(symbol)
      .toHigherOrderFunction(controller, [useCase, DI_SYMBOLS.ILoggerService]);
  }

  return jobsModule;
}
