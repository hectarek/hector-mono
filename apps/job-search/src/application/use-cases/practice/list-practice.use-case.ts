import type { IPracticeRepository } from "@/src/application/repositories/practice.repository.interface";
import {
  dueBy,
  scheduled,
} from "@/src/application/use-cases/practice/scheduled";
import type { PracticePage } from "@/src/entities/models/practice-entry.model";
import { PLAN_TIME_ZONE, todayIn } from "@/src/entities/week";

export type IListPracticeUseCase = ReturnType<typeof listPracticeUseCase>;

// The practice page and list_practice (docs/build-plan.md U8, R11): every session whose next
// review is due by today in Eastern time, the earliest due first, then by problem, and the latest
// sessions.
export const listPracticeUseCase =
  (practiceRepository: IPracticeRepository) =>
  async (
    ownerId: string,
    { limit }: { limit: number },
  ): Promise<PracticePage> => {
    const today = todayIn(PLAN_TIME_ZONE);
    const [open, recent] = await Promise.all([
      practiceRepository.listOpen(ownerId),
      practiceRepository.listRecent(ownerId, limit),
    ]);
    return { today, due: dueBy(open, today), recent: recent.map(scheduled) };
  };
