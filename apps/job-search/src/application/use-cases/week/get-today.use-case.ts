import type { IActivityRepository } from "@/src/application/repositories/activity.repository.interface";
import type { IInteractionsRepository } from "@/src/application/repositories/interactions.repository.interface";
import type { IJobsRepository } from "@/src/application/repositories/jobs.repository.interface";
import type { IPeopleRepository } from "@/src/application/repositories/people.repository.interface";
import type { IPracticeRepository } from "@/src/application/repositories/practice.repository.interface";
import type { ISettingsRepository } from "@/src/application/repositories/settings.repository.interface";
import type { ILoggerService } from "@/src/application/services/logger.service.interface";
import { withDates } from "@/src/application/use-cases/people/person-dates";
import { dueBy } from "@/src/application/use-cases/practice/scheduled";
import { claudeSessions } from "@/src/entities/claude-sessions";
import { isStaleCandidate, staleAppliedBy } from "@/src/entities/job-lifecycle";
import {
  ACTIVITY_PAGE_MAX,
  type ActivityEntry,
} from "@/src/entities/models/activity.model";
import { JOB_PAGE_MAX, type JobSummary } from "@/src/entities/models/job.model";
import { personSummary } from "@/src/entities/models/person.model";
import { DEFAULT_SETTINGS } from "@/src/entities/models/settings.model";
import type {
  ConversationToDebrief,
  TodayView,
} from "@/src/entities/models/today.model";
import { mondayOf, PLAN_TIME_ZONE, todayIn } from "@/src/entities/week";
import { SCREEN_OR_BEYOND, weekRange } from "@/src/entities/weekly-counts";

export type IGetTodayUseCase = ReturnType<typeof getTodayUseCase>;

// How far back Claude's sessions reach (R9), and the most of its changes the view reads.
const CLAUDE_DAYS = 7;
const CLAUDE_CHANGES_MAX = 4 * ACTIVITY_PAGE_MAX;

// This week and get_today (docs/build-plan.md U9, R9, R10): what needs Hector's decision, what's
// due by today in Eastern time, Claude's recent sessions, and the week's counts against his
// targets.
export const getTodayUseCase = (
  jobsRepository: IJobsRepository,
  peopleRepository: IPeopleRepository,
  interactionsRepository: IInteractionsRepository,
  practiceRepository: IPracticeRepository,
  activityRepository: IActivityRepository,
  settingsRepository: ISettingsRepository,
  loggerService: ILoggerService,
) => {
  const logger = loggerService.child({ layer: "use-case", op: "getToday" });

  // The pending proposals, as many as the cap can hold (settings allow at most a page).
  const proposals = async (ownerId: string) =>
    (
      await jobsRepository.find(ownerId, {
        reviewState: "pending",
        limit: JOB_PAGE_MAX,
        offset: 0,
      })
    ).jobs;

  const debriefs = async (
    ownerId: string,
    now: Date,
  ): Promise<ConversationToDebrief[]> => {
    const ended = (await interactionsRepository.listScheduled(ownerId)).filter(
      ({ endsAt }) => endsAt !== null && endsAt <= now,
    );
    const withPeople = await Promise.all(
      ended.map(async (conversation) => {
        const person = await peopleRepository.get(
          ownerId,
          conversation.personId,
        );
        return (
          person && {
            conversation,
            person: {
              id: person.id,
              name: person.name,
              role: person.role,
              rank: person.rank,
            },
          }
        );
      }),
    );
    return withPeople.filter((debrief) => debrief !== undefined);
  };

  // Applied jobs old enough to be stale, kept if no reply is linked to them (R3).
  const stale = async (ownerId: string, today: string) => {
    const applied = await jobsRepository.listAppliedBy(
      ownerId,
      staleAppliedBy(today),
    );
    const replies = await Promise.all(
      applied.map((job) =>
        interactionsRepository.repliedOnFor(ownerId, job.id),
      ),
    );
    return applied.filter((job, index) =>
      isStaleCandidate({ ...job, repliedOn: replies[index] ?? null }, today),
    );
  };

  const duePeople = async (ownerId: string, today: string) =>
    (
      await withDates(
        interactionsRepository,
        ownerId,
        await peopleRepository.listDue(ownerId, today),
      )
    ).map(personSummary);

  // Claude's changes since the day given, newest first, a page at a time up to the most read.
  const claudeChanges = async (ownerId: string, since: Date) => {
    const entries: ActivityEntry[] = [];
    let offset: number | null = 0;
    while (offset !== null && entries.length < CLAUDE_CHANGES_MAX) {
      const page = await activityRepository.list(ownerId, {
        actor: "agent",
        since,
        limit: ACTIVITY_PAGE_MAX,
        offset,
      });
      entries.push(...page.entries);
      offset = page.nextOffset;
    }
    return entries;
  };

  const counts = async (ownerId: string, monday: string) => {
    const { from, to } = weekRange(monday);
    const [interactions, applications, practiceSessions, screensReached] =
      await Promise.all([
        interactionsRepository.countInRange(ownerId, from, to),
        jobsRepository.countApplied(ownerId, from, to),
        practiceRepository.countSessions(ownerId, from, to),
        jobsRepository.countMovesInto(ownerId, SCREEN_OR_BEYOND, from, to),
      ]);
    return { ...interactions, applications, practiceSessions, screensReached };
  };

  return async (ownerId: string): Promise<TodayView> => {
    const now = new Date();
    const today = todayIn(PLAN_TIME_ZONE, now);
    const monday = mondayOf(today);
    const since = new Date(now.getTime() - CLAUDE_DAYS * 24 * 60 * 60 * 1000);

    const [
      pending,
      toDebrief,
      dueJobs,
      staleJobs,
      people,
      open,
      changes,
      settings,
      weekCounts,
    ] = await Promise.all([
      proposals(ownerId),
      debriefs(ownerId, now),
      jobsRepository.listDue(ownerId, today),
      stale(ownerId, today),
      duePeople(ownerId, today),
      practiceRepository.listOpen(ownerId),
      claudeChanges(ownerId, since),
      settingsRepository.get(ownerId),
      counts(ownerId, monday),
    ]);
    const staleIds = new Set(staleJobs.map(({ id }) => id));
    const view: TodayView = {
      today,
      monday,
      decisions: { proposals: pending, debriefs: toDebrief },
      due: {
        jobs: dueJobs.filter(({ id }: JobSummary) => !staleIds.has(id)),
        people,
        stale: staleJobs,
        practice: dueBy(open, today),
      },
      claude: claudeSessions(changes),
      counts: weekCounts,
      targets: (settings ?? DEFAULT_SETTINGS).targets,
    };
    logger.debug("Today read", {
      proposals: view.decisions.proposals.length,
      debriefs: view.decisions.debriefs.length,
      dueJobs: view.due.jobs.length,
      duePeople: view.due.people.length,
      stale: view.due.stale.length,
      practice: view.due.practice.length,
    });
    return view;
  };
};
