import type { IActivityRepository } from "@/src/application/repositories/activity.repository.interface";
import type { IBlocksRepository } from "@/src/application/repositories/blocks.repository.interface";
import type { IInteractionsRepository } from "@/src/application/repositories/interactions.repository.interface";
import type { IJobsRepository } from "@/src/application/repositories/jobs.repository.interface";
import type { IPeopleRepository } from "@/src/application/repositories/people.repository.interface";
import type { IPracticeRepository } from "@/src/application/repositories/practice.repository.interface";
import type { ISettingsRepository } from "@/src/application/repositories/settings.repository.interface";
import type { ILoggerService } from "@/src/application/services/logger.service.interface";
import { rankedList } from "@/src/application/use-cases/jobs/ranked-list";
import { withDates } from "@/src/application/use-cases/people/person-dates";
import { dueBy } from "@/src/application/use-cases/practice/scheduled";
import { weekCounts } from "@/src/application/use-cases/week/week-counts";
import { claudeSessions } from "@/src/entities/claude-sessions";
import { isStaleCandidate, staleAppliedBy } from "@/src/entities/job-lifecycle";
import {
  ACTIVITY_PAGE_MAX,
  type ActivityEntry,
} from "@/src/entities/models/activity.model";
import { type JobSummary, jobSummary } from "@/src/entities/models/job.model";
import { personSummary } from "@/src/entities/models/person.model";
import { DEFAULT_SETTINGS } from "@/src/entities/models/settings.model";
import type {
  ConversationToDebrief,
  TodayView,
} from "@/src/entities/models/today.model";
import {
  addDays,
  mondayOf,
  PLAN_TIME_ZONE,
  todayIn,
} from "@/src/entities/week";

export type IGetTodayUseCase = ReturnType<typeof getTodayUseCase>;

// How far back Claude's sessions reach (R9), and the most of its changes the view reads.
const CLAUDE_DAYS = 7;
const CLAUDE_CHANGES_MAX = 4 * ACTIVITY_PAGE_MAX;
// How many of the ranked list's jobs it shows (R27).
const APPLY_NEXT = 3;

// This week and get_today (docs/build-plan.md U9, R9, R10): the top of the ranked list (R27), the
// conversations to debrief, what's due by today in Eastern time and later this week, how many next
// steps have no date, today's Focus blocks (U17), Claude's recent sessions, and the week's counts
// against his targets.
export const getTodayUseCase = (
  jobsRepository: IJobsRepository,
  peopleRepository: IPeopleRepository,
  interactionsRepository: IInteractionsRepository,
  practiceRepository: IPracticeRepository,
  blocksRepository: IBlocksRepository,
  activityRepository: IActivityRepository,
  settingsRepository: ISettingsRepository,
  loggerService: ILoggerService,
) => {
  const logger = loggerService.child({ layer: "use-case", op: "getToday" });

  const applyNext = async (ownerId: string, today: string) =>
    (await rankedList(jobsRepository, settingsRepository, ownerId, today))
      .slice(0, APPLY_NEXT)
      .map(jobSummary);

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

  return async (ownerId: string): Promise<TodayView> => {
    const now = new Date();
    const today = todayIn(PLAN_TIME_ZONE, now);
    const monday = mondayOf(today);
    // Jobs and people are read due through Sunday, then split into due by today and later.
    const sunday = addDays(monday, 6);
    const since = new Date(now.getTime() - CLAUDE_DAYS * 24 * 60 * 60 * 1000);

    const [
      topJobs,
      toDebrief,
      weekJobs,
      staleJobs,
      weekPeople,
      open,
      changes,
      settings,
      counts,
      undatedJobs,
      undatedPeople,
      blocks,
    ] = await Promise.all([
      applyNext(ownerId, today),
      debriefs(ownerId, now),
      jobsRepository.listDue(ownerId, sunday),
      stale(ownerId, today),
      duePeople(ownerId, sunday),
      practiceRepository.listOpen(ownerId),
      claudeChanges(ownerId, since),
      settingsRepository.get(ownerId),
      weekCounts(
        {
          jobs: jobsRepository,
          interactions: interactionsRepository,
          practice: practiceRepository,
        },
        ownerId,
        monday,
      ),
      jobsRepository.countUndated(ownerId),
      peopleRepository.countUndated(ownerId),
      blocksRepository.listBetween(ownerId, today, today),
    ]);
    const staleIds = new Set(staleJobs.map(({ id }) => id));
    // Each job with its contacts, so its follow-up can be logged to one (the UX plan's UX3).
    const jobs = await Promise.all(
      weekJobs
        .filter(({ id }: JobSummary) => !staleIds.has(id))
        .map(async (job) => ({
          ...job,
          contacts: await peopleRepository.listForJob(ownerId, job.id),
        })),
    );
    const byToday = ({ nextDate }: { nextDate: string | null }) =>
      nextDate !== null && nextDate <= today;
    const view: TodayView = {
      today,
      monday,
      applyNext: topJobs,
      decisions: { debriefs: toDebrief },
      due: {
        jobs: jobs.filter(byToday),
        people: weekPeople.filter(byToday),
        stale: staleJobs,
        practice: dueBy(open, today),
      },
      later: {
        jobs: jobs.filter((job) => !byToday(job)),
        people: weekPeople.filter((person) => !byToday(person)),
      },
      undated: { jobs: undatedJobs, people: undatedPeople },
      blocks,
      claude: claudeSessions(changes),
      counts,
      targets: (settings ?? DEFAULT_SETTINGS).targets,
    };
    logger.debug("Today read", {
      applyNext: view.applyNext.length,
      debriefs: view.decisions.debriefs.length,
      dueJobs: view.due.jobs.length,
      duePeople: view.due.people.length,
      stale: view.due.stale.length,
      practice: view.due.practice.length,
    });
    return view;
  };
};
