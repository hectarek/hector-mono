import { and, asc, count, eq, lte, sql } from "drizzle-orm";
import { companies, jobPeople, people } from "@/db/schema";
import type { IPeopleRepository } from "@/src/application/repositories/people.repository.interface";
import type { ILoggerService } from "@/src/application/services/logger.service.interface";
import { DatabaseOperationError } from "@/src/entities/errors/common";
import type {
  PeopleQuery,
  PersonFacts,
  PersonRecord,
  PersonRef,
} from "@/src/entities/models/person.model";
import type { ITransaction } from "@/src/entities/models/transaction.model";
import {
  BaseRepository,
  nextUpdatedAt,
} from "@/src/infrastructure/repositories/base.repository";

// A person as the app reads them: their facts and their company by name, not their owner or when
// they were added.
const PERSON = {
  id: people.id,
  name: people.name,
  role: people.role,
  howKnown: people.howKnown,
  rank: people.rank,
  ask: people.ask,
  nextStep: people.nextStep,
  nextDate: people.nextDate,
  notes: people.notes,
  updatedAt: people.updatedAt,
  companyId: companies.id,
  companyName: companies.name,
};

const PERSON_REF = {
  id: people.id,
  name: people.name,
  role: people.role,
  rank: people.rank,
};

// Names sort by code point ("C"), then id, as the mock sorts them.
const BY_NAME = [sql`${people.name} collate "C"`, people.id] as const;

export class PeopleRepository
  extends BaseRepository
  implements IPeopleRepository
{
  constructor(logger: ILoggerService) {
    super(logger, "people");
  }

  async create(
    ownerId: string,
    facts: PersonFacts,
    tx: ITransaction,
  ): Promise<PersonRecord> {
    try {
      const [row] = await this.getDbContext(tx)
        .insert(people)
        .values({ ownerId, ...facts })
        .returning({ id: people.id });
      const person = row && (await this.read(ownerId, row.id, tx));
      if (!person) {
        throw new DatabaseOperationError("create returned no person");
      }
      return person;
    } catch (err) {
      this.handleError(err, "create", { ownerId });
    }
  }

  async get(
    ownerId: string,
    id: string,
    tx?: ITransaction,
  ): Promise<PersonRecord | undefined> {
    try {
      return await this.read(ownerId, id, tx);
    } catch (err) {
      this.handleError(err, "get", { ownerId, personId: id });
    }
  }

  async getForUpdate(
    ownerId: string,
    id: string,
    tx: ITransaction,
  ): Promise<PersonRecord | undefined> {
    try {
      return await this.read(ownerId, id, tx, true);
    } catch (err) {
      this.handleError(err, "getForUpdate", { ownerId, personId: id });
    }
  }

  async update(
    ownerId: string,
    id: string,
    changes: Partial<PersonFacts>,
    tx: ITransaction,
  ): Promise<PersonRecord> {
    try {
      const [row] = await this.getDbContext(tx)
        .update(people)
        .set({ ...changes, updatedAt: nextUpdatedAt(people.updatedAt) })
        .where(and(eq(people.ownerId, ownerId), eq(people.id, id)))
        .returning({ id: people.id });
      const person = row && (await this.read(ownerId, row.id, tx));
      if (!person) {
        throw new DatabaseOperationError("update found no person");
      }
      return person;
    } catch (err) {
      this.handleError(err, "update", { ownerId, personId: id });
    }
  }

  async delete(ownerId: string, id: string, tx: ITransaction): Promise<void> {
    try {
      const db = this.getDbContext(tx);
      await db
        .delete(jobPeople)
        .where(and(eq(jobPeople.ownerId, ownerId), eq(jobPeople.personId, id)));
      await db
        .delete(people)
        .where(and(eq(people.ownerId, ownerId), eq(people.id, id)));
    } catch (err) {
      this.handleError(err, "delete", { ownerId, personId: id });
    }
  }

  async find(
    ownerId: string,
    { query, companyId, limit, offset }: PeopleQuery,
  ): Promise<{ people: PersonRecord[]; nextOffset: number | null }> {
    try {
      // One more than the page, to tell whether another follows.
      const rows = await this.getDbContext()
        .select(PERSON)
        .from(people)
        .leftJoin(companies, eq(companies.id, people.companyId))
        .where(
          and(
            eq(people.ownerId, ownerId),
            query
              ? sql`strpos(lower(${people.name}), lower(${query})) > 0`
              : undefined,
            companyId ? eq(people.companyId, companyId) : undefined,
          ),
        )
        .orderBy(...BY_NAME)
        .limit(limit + 1)
        .offset(offset);
      return {
        people: rows.slice(0, limit).map(toRecord),
        nextOffset: rows.length > limit ? offset + limit : null,
      };
    } catch (err) {
      this.handleError(err, "find", { ownerId });
    }
  }

  async listDue(ownerId: string, day: string): Promise<PersonRecord[]> {
    try {
      const rows = await this.getDbContext()
        .select(PERSON)
        .from(people)
        .leftJoin(companies, eq(companies.id, people.companyId))
        .where(and(eq(people.ownerId, ownerId), lte(people.nextDate, day)))
        .orderBy(asc(people.nextDate), ...BY_NAME);
      return rows.map(toRecord);
    } catch (err) {
      this.handleError(err, "listDue", { ownerId });
    }
  }

  async listForCompany(
    ownerId: string,
    companyId: string,
  ): Promise<PersonRef[]> {
    try {
      return await this.getDbContext()
        .select(PERSON_REF)
        .from(people)
        .where(
          and(eq(people.ownerId, ownerId), eq(people.companyId, companyId)),
        )
        .orderBy(...BY_NAME);
    } catch (err) {
      this.handleError(err, "listForCompany", { ownerId, companyId });
    }
  }

  async countForCompany(
    ownerId: string,
    companyId: string,
    tx: ITransaction,
  ): Promise<number> {
    try {
      const [row] = await this.getDbContext(tx)
        .select({ people: count() })
        .from(people)
        .where(
          and(eq(people.ownerId, ownerId), eq(people.companyId, companyId)),
        );
      return row?.people ?? 0;
    } catch (err) {
      this.handleError(err, "countForCompany", { ownerId, companyId });
    }
  }

  async listForJob(ownerId: string, jobId: string): Promise<PersonRef[]> {
    try {
      return await this.getDbContext()
        .select(PERSON_REF)
        .from(jobPeople)
        .innerJoin(people, eq(people.id, jobPeople.personId))
        .where(and(eq(jobPeople.ownerId, ownerId), eq(jobPeople.jobId, jobId)))
        .orderBy(...BY_NAME);
    } catch (err) {
      this.handleError(err, "listForJob", { ownerId, jobId });
    }
  }

  async jobIdsFor(
    ownerId: string,
    personId: string,
    tx?: ITransaction,
  ): Promise<string[]> {
    try {
      const rows = await this.getDbContext(tx)
        .select({ jobId: jobPeople.jobId })
        .from(jobPeople)
        .where(
          and(eq(jobPeople.ownerId, ownerId), eq(jobPeople.personId, personId)),
        )
        .orderBy(jobPeople.createdAt, jobPeople.jobId);
      return rows.map(({ jobId }) => jobId);
    } catch (err) {
      this.handleError(err, "jobIdsFor", { ownerId, personId });
    }
  }

  async linkJob(
    ownerId: string,
    personId: string,
    jobId: string,
    tx: ITransaction,
  ): Promise<void> {
    try {
      await this.getDbContext(tx)
        .insert(jobPeople)
        .values({ ownerId, personId, jobId })
        .onConflictDoNothing();
    } catch (err) {
      this.handleError(err, "linkJob", { ownerId, personId, jobId });
    }
  }

  async unlinkJob(
    ownerId: string,
    personId: string,
    jobId: string,
    tx: ITransaction,
  ): Promise<void> {
    try {
      await this.getDbContext(tx)
        .delete(jobPeople)
        .where(
          and(
            eq(jobPeople.ownerId, ownerId),
            eq(jobPeople.personId, personId),
            eq(jobPeople.jobId, jobId),
          ),
        );
    } catch (err) {
      this.handleError(err, "unlinkJob", { ownerId, personId, jobId });
    }
  }

  async unlinkAllFor(
    ownerId: string,
    jobId: string,
    tx: ITransaction,
  ): Promise<void> {
    try {
      await this.getDbContext(tx)
        .delete(jobPeople)
        .where(and(eq(jobPeople.ownerId, ownerId), eq(jobPeople.jobId, jobId)));
    } catch (err) {
      this.handleError(err, "unlinkAllFor", { ownerId, jobId });
    }
  }

  // A person with their company's name, locked for the transaction when it's for a change. The
  // lock takes the person's row only: the company is the nullable side of the join.
  private async read(
    ownerId: string,
    id: string,
    tx?: ITransaction,
    forUpdate = false,
  ): Promise<PersonRecord | undefined> {
    const query = this.getDbContext(tx)
      .select(PERSON)
      .from(people)
      .leftJoin(companies, eq(companies.id, people.companyId))
      .where(and(eq(people.ownerId, ownerId), eq(people.id, id)));
    const [row] = forUpdate
      ? await query.for("update", { of: people })
      : await query;
    return row && toRecord(row);
  }
}

function toRecord({
  companyId,
  companyName,
  ...person
}: {
  companyId: string | null;
  companyName: string | null;
} & Omit<PersonRecord, "company">): PersonRecord {
  return {
    ...person,
    company:
      companyId !== null && companyName !== null
        ? { id: companyId, name: companyName }
        : null,
  };
}
