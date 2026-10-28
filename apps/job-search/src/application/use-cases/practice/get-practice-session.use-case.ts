import type { IPracticeRepository } from "@/src/application/repositories/practice.repository.interface";
import { scheduled } from "@/src/application/use-cases/practice/scheduled";
import { NotFoundError } from "@/src/entities/errors/common";
import type { PracticeSession } from "@/src/entities/models/practice-entry.model";

export type IGetPracticeSessionUseCase = ReturnType<
  typeof getPracticeSessionUseCase
>;

// A session for its page (docs/build-plan.md U8): its tries and its next review (R11).
export const getPracticeSessionUseCase =
  (practiceRepository: IPracticeRepository) =>
  async (ownerId: string, { id }: { id: string }): Promise<PracticeSession> => {
    const session = await practiceRepository.getSession(ownerId, id);
    if (!session) {
      throw new NotFoundError("Couldn't find that practice session.");
    }
    return scheduled(session);
  };
