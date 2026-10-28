import type { IInteractionsRepository } from "@/src/application/repositories/interactions.repository.interface";
import type { IJobsRepository } from "@/src/application/repositories/jobs.repository.interface";
import type { IPeopleRepository } from "@/src/application/repositories/people.repository.interface";
import type { ILoggerService } from "@/src/application/services/logger.service.interface";
import { datedPerson } from "@/src/application/use-cases/people/person-dates";
import { NotFoundError } from "@/src/entities/errors/common";
import { type Job, jobSummary } from "@/src/entities/models/job.model";
import type { PersonDetail } from "@/src/entities/models/person.model";

export type IGetPersonUseCase = ReturnType<typeof getPersonUseCase>;

// A person as their page and get_person show them (docs/build-plan.md U7): with their dates, their
// interactions, the latest first, and the jobs they're a contact for.
export const getPersonUseCase = (
  peopleRepository: IPeopleRepository,
  interactionsRepository: IInteractionsRepository,
  jobsRepository: IJobsRepository,
  loggerService: ILoggerService,
) => {
  const logger = loggerService.child({ layer: "use-case", op: "getPerson" });

  return async (
    ownerId: string,
    { id }: { id: string },
  ): Promise<PersonDetail> => {
    const record = await peopleRepository.get(ownerId, id);
    if (!record) {
      throw new NotFoundError("Couldn't find that person.");
    }
    const [person, interactions, jobIds] = await Promise.all([
      datedPerson(interactionsRepository, ownerId, record),
      interactionsRepository.listForPerson(ownerId, id),
      peopleRepository.jobIdsFor(ownerId, id),
    ]);
    const jobs = await Promise.all(
      jobIds.map((jobId) => jobsRepository.get(ownerId, jobId)),
    );
    logger.debug("Person read", { personId: id });
    return {
      person,
      interactions,
      jobs: jobs.filter((job): job is Job => job !== undefined).map(jobSummary),
    };
  };
};
