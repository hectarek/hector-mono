import type { z } from "zod";
import type { IActivityRepository } from "@/src/application/repositories/activity.repository.interface";
import type { ICompaniesRepository } from "@/src/application/repositories/companies.repository.interface";
import type { IImportRefsRepository } from "@/src/application/repositories/import-refs.repository.interface";
import type { IInteractionsRepository } from "@/src/application/repositories/interactions.repository.interface";
import type { IJobsRepository } from "@/src/application/repositories/jobs.repository.interface";
import type { ILeadSourcesRepository } from "@/src/application/repositories/lead-sources.repository.interface";
import type { IPeopleRepository } from "@/src/application/repositories/people.repository.interface";
import type { IPracticeRepository } from "@/src/application/repositories/practice.repository.interface";
import type { ILoggerService } from "@/src/application/services/logger.service.interface";
import type { ITransactionManagerService } from "@/src/application/services/transaction-manager.service.interface";
import { recordChange } from "@/src/application/use-cases/activity/record-change";
import { sourceNamed } from "@/src/application/use-cases/sources/source-named";
import { InputParseError } from "@/src/entities/errors/common";
import { loggable } from "@/src/entities/errors/loggable";
import type { JobStatus } from "@/src/entities/job-lifecycle";
import type {
  ChangeContext,
  RecordRef,
} from "@/src/entities/models/activity.model";
import { companyFacts } from "@/src/entities/models/company.model";
import {
  IMPORT_KINDS,
  type ImportKind,
  type ImportReport,
  importSnapshotSchema,
  needsStatusDate,
  type SnapshotJob,
  type SnapshotPerson,
  snapshotCompanySchema,
  snapshotJobSchema,
  snapshotPersonSchema,
  snapshotPracticeSchema,
} from "@/src/entities/models/import-snapshot.model";
import {
  type InteractionKind,
  interactionLogged,
} from "@/src/entities/models/interaction.model";
import { jobLogged } from "@/src/entities/models/job.model";
import { personLogged } from "@/src/entities/models/person.model";
import {
  reviewLogged,
  sessionLogged,
} from "@/src/entities/models/practice-entry.model";
import type { ITransaction } from "@/src/entities/models/transaction.model";
import { postingKey } from "@/src/entities/posting-link";

// The sheet's one import (docs/build-plan.md KTD14, U11), as the script runs it: a dry run reports
// what a commit would create and skip, and a commit writes it, one transaction per record, with
// actor `import`. A job lands as the snapshot has it: applied on its applied-on, its status on the
// day it reached it, and the snapshot's next step and date, with none of R3's move defaults. A
// record whose ref an earlier run wrote is skipped. A commit doesn't start while any job past
// applied lacks its status date.
export const importSnapshotUseCase = (
  companiesRepository: ICompaniesRepository,
  leadSourcesRepository: ILeadSourcesRepository,
  jobsRepository: IJobsRepository,
  peopleRepository: IPeopleRepository,
  interactionsRepository: IInteractionsRepository,
  practiceRepository: IPracticeRepository,
  activityRepository: IActivityRepository,
  importRefsRepository: IImportRefsRepository,
  transactionManager: ITransactionManagerService,
  loggerService: ILoggerService,
) => {
  const logger = loggerService.child({
    layer: "use-case",
    op: "importSnapshot",
  });

  return async (
    ownerId: string,
    input: unknown,
    { commit }: { commit: boolean },
  ): Promise<ImportReport> => {
    const { data: snapshot, error } = importSnapshotSchema.safeParse(input);
    if (error) {
      throw new InputParseError("That isn't a snapshot", { cause: error });
    }
    const report: ImportReport = {
      commit,
      created: byKind(),
      skipped: byKind(),
      problems: [],
      undated: [],
      refused: null,
    };
    const context: ChangeContext = { actor: "import", ownerId };

    // Each record on its own: a bad one is reported, and the rest still import.
    const read = <T>(
      kind: ImportKind,
      schema: z.ZodType<T>,
      records: unknown[],
    ): T[] =>
      records.flatMap((record) => {
        const parsed = schema.safeParse(record);
        if (parsed.success) {
          return [parsed.data];
        }
        report.problems.push({
          kind,
          ref: refOf(record),
          reason: parsed.error.issues[0]?.message ?? "Couldn't read it",
        });
        return [];
      });
    const companies = read(
      "company",
      snapshotCompanySchema,
      snapshot.companies,
    );
    const jobs = read("job", snapshotJobSchema, snapshot.jobs);
    const people = read("person", snapshotPersonSchema, snapshot.people);
    const practice = read(
      "practice",
      snapshotPracticeSchema,
      snapshot.practice,
    );

    report.undated = jobs.filter(needsStatusDate).map(({ ref }) => ref);
    if (commit && report.undated.length > 0) {
      report.refused = `${report.undated.length} job(s) past applied have no status date. Nothing was written.`;
      return report;
    }

    // Records by kind and ref: those an earlier run wrote, then those this run creates. A dry run
    // knows a record it would create, but has no id for it.
    const imported = await importRefsRepository.list(ownerId);
    const known = new Set(imported.keys());
    const ids = new Map(
      [...imported].map(([key, record]) => [key, record.id] as const),
    );

    // Creates one record, unless an earlier run did: in a dry run, only counts it.
    const land = async (
      kind: ImportKind,
      ref: string,
      unplaced: string | null,
      write: (tx: ITransaction) => Promise<RecordRef>,
    ): Promise<void> => {
      const key = keyOf(kind, ref);
      if (imported.has(key)) {
        report.skipped[kind].push(ref);
        return;
      }
      if (unplaced) {
        report.problems.push({ kind, ref, reason: unplaced });
        return;
      }
      if (!commit) {
        known.add(key);
        report.created[kind].push(ref);
        return;
      }
      try {
        const record = await transactionManager.startTransaction(async (tx) => {
          const written = await write(tx);
          await importRefsRepository.add(ownerId, key, written, tx);
          return written;
        });
        known.add(key);
        ids.set(key, record.id);
        report.created[kind].push(ref);
      } catch (err) {
        // KTD20: the class and code, never the message, which can quote a value.
        const { errorClass, errorCode } = loggable(err);
        report.problems.push({
          kind,
          ref,
          reason: `Couldn't write it (${errorClass}${errorCode ? ` ${errorCode}` : ""})`,
        });
      }
    };
    const idOf = (kind: ImportKind, ref: string): string => {
      const id = ids.get(keyOf(kind, ref));
      if (!id) {
        throw new Error(`No ${kind} was written under ${ref}`);
      }
      return id;
    };
    const missing = (kind: ImportKind, refs: (string | undefined)[]) =>
      refs.find((ref) => ref !== undefined && !known.has(keyOf(kind, ref)));

    for (const company of companies) {
      await land("company", company.ref, null, async (tx) => {
        const created = await companiesRepository.create(
          ownerId,
          {
            name: company.name,
            website: company.website ?? null,
            location: company.location ?? null,
            headcount: null,
            industry: null,
            officePolicy: null,
            leavePolicy: null,
            tier: company.tier ?? null,
            researchSummary: null,
            researchRef: null,
          },
          tx,
        );
        await recordChange(activityRepository, tx, context, {
          record: { kind: "company", id: created.id },
          action: "created",
          after: companyFacts(created),
        });
        return { kind: "company", id: created.id };
      });
    }

    for (const job of jobs) {
      const company = missing("company", [job.companyRef]);
      await land(
        "job",
        job.ref,
        company ? `Its company ${company} isn't in the snapshot` : null,
        async (tx) => {
          const { source } = await sourceNamed(
            leadSourcesRepository,
            activityRepository,
            tx,
            context,
            job.source,
          );
          const created = await jobsRepository.create(
            ownerId,
            {
              companyId: idOf("company", job.companyRef),
              clientName: null,
              role: job.role,
              nextStep: job.nextStep ?? null,
              nextDate: job.nextDate ?? null,
              appliedOn: appliedOnOf(job),
              targetRole: null,
              level: null,
              location: job.location ?? null,
              workMode: null,
              payMin: null,
              payMax: null,
              postingUrl: job.postingUrl ?? null,
              postingKey: job.postingUrl ? postingKey(job.postingUrl) : null,
              summary: null,
              foundOn: job.foundOn ?? snapshot.takenOn,
              sourceId: source.id,
              travelPercent: null,
              employmentType: null,
              teamSize: null,
              status: job.status,
              reviewState: "accepted",
              proposalReason: null,
              dismissReason: null,
              dismissNote: null,
            },
            tx,
          );
          for (const move of movesOf(job)) {
            await jobsRepository.addStatusChange(
              ownerId,
              created.id,
              { ...move, actor: "import" },
              tx,
            );
          }
          await recordChange(activityRepository, tx, context, {
            record: { kind: "job", id: created.id },
            action: "created",
            after: jobLogged(created),
          });
          return { kind: "job", id: created.id };
        },
      );
    }

    for (const person of people) {
      const company = missing("company", [person.companyRef]);
      const job = missing("job", person.jobRefs);
      const unplaced = company
        ? `Their company ${company} isn't in the snapshot`
        : job
          ? `A job they're a contact for, ${job}, isn't in the snapshot`
          : null;
      await land("person", person.ref, unplaced, async (tx) => {
        const created = await peopleRepository.create(
          ownerId,
          {
            name: person.name,
            companyId: person.companyRef
              ? idOf("company", person.companyRef)
              : null,
            role: person.role ?? null,
            howKnown: person.howKnown ?? null,
            rank: person.rank ?? null,
            ask: person.ask ?? null,
            nextStep: person.nextStep ?? null,
            nextDate: person.nextDate ?? null,
            notes: person.notes ?? null,
          },
          tx,
        );
        await recordChange(activityRepository, tx, context, {
          record: { kind: "person", id: created.id },
          action: "created",
          after: personLogged(created),
        });
        for (const jobRef of person.jobRefs) {
          await peopleRepository.linkJob(
            ownerId,
            created.id,
            idOf("job", jobRef),
            tx,
          );
        }
        for (const { kind, occurredOn } of interactionsOf(person)) {
          const added = await interactionsRepository.add(
            ownerId,
            {
              personId: created.id,
              kind,
              occurredOn,
              jobId: null,
              note: null,
              state: kind === "conversation" ? "held" : null,
              startsAt: null,
              endsAt: null,
              author: "import",
            },
            tx,
          );
          await recordChange(activityRepository, tx, context, {
            record: { kind: "interaction", id: added.id },
            action: "created",
            after: interactionLogged(added),
          });
        }
        return { kind: "person", id: created.id };
      });
    }

    for (const entry of practice) {
      await land("practice", entry.ref, null, async (tx) => {
        const session = await practiceRepository.addSession(
          ownerId,
          {
            topic: entry.topic,
            type: entry.type ?? null,
            pattern: entry.pattern ?? null,
            practicedOn: entry.practicedOn,
            result: entry.result,
            aiUsed: entry.aiUsed,
            minutes: entry.minutes ?? null,
            notes: entry.notes ?? null,
            author: "import",
          },
          tx,
        );
        await recordChange(activityRepository, tx, context, {
          record: { kind: "practice-entry", id: session.id },
          action: "created",
          after: sessionLogged(session),
        });
        for (const review of entry.reviews) {
          const added = await practiceRepository.addReview(
            ownerId,
            {
              sessionId: session.id,
              practicedOn: review.practicedOn,
              result: review.result,
              aiUsed: review.aiUsed,
              minutes: review.minutes ?? null,
              notes: review.notes ?? null,
              author: "import",
            },
            tx,
          );
          await recordChange(activityRepository, tx, context, {
            record: { kind: "practice-entry", id: added.id },
            action: "created",
            after: reviewLogged(added),
          });
        }
        return { kind: "practice-entry", id: session.id };
      });
    }

    logger.info(commit ? "Snapshot imported" : "Snapshot dry-run", {
      commit,
      created: IMPORT_KINDS.map((kind) => report.created[kind].length).join(
        "/",
      ),
      skipped: IMPORT_KINDS.map((kind) => report.skipped[kind].length).join(
        "/",
      ),
      problems: report.problems.length,
    });
    return report;
  };
};

function byKind(): Record<ImportKind, string[]> {
  return { company: [], job: [], person: [], practice: [] };
}

// The key a record's ref is kept under: refs are the snapshot's own, so each kind keeps its own.
function keyOf(kind: ImportKind, ref: string): string {
  return `${kind}:${ref}`;
}

function refOf(record: unknown): string | null {
  if (typeof record === "object" && record !== null && "ref" in record) {
    const { ref } = record as { ref: unknown };
    return typeof ref === "string" ? ref : null;
  }
  return null;
}

// An applied job's applied-on is its status date when the snapshot gives no other.
function appliedOnOf(job: SnapshotJob): string | null {
  return (
    job.appliedOn ?? (job.status === "applied" ? (job.statusOn ?? null) : null)
  );
}

// The dated moves that put a job where the snapshot has it (KTD7): to applied on its applied-on,
// then to its status on the day it reached it. The week's counts read these dates.
function movesOf(
  job: SnapshotJob,
): { from: JobStatus; to: JobStatus; on: string }[] {
  const moves: { from: JobStatus; to: JobStatus; on: string }[] = [];
  let at: JobStatus = "verify";
  const appliedOn = appliedOnOf(job);
  if (appliedOn && job.status !== "verify" && job.status !== "target") {
    moves.push({ from: at, to: "applied", on: appliedOn });
    at = "applied";
  }
  if (job.status !== at && job.statusOn) {
    moves.push({ from: at, to: job.status, on: job.statusOn });
  }
  return moves;
}

// One dated interaction per date the sheet filled in for a person (KTD9).
function interactionsOf(
  person: SnapshotPerson,
): { kind: InteractionKind; occurredOn: string }[] {
  const dated: [InteractionKind, string | null | undefined][] = [
    ["message-sent", person.messagedOn],
    ["reply-received", person.repliedOn],
    ["conversation", person.metOn],
  ];
  return dated.flatMap(([kind, occurredOn]) =>
    occurredOn ? [{ kind, occurredOn }] : [],
  );
}
