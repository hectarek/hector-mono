import type { ICompaniesRepository } from "@/src/application/repositories/companies.repository.interface";
import type { IPeopleRepository } from "@/src/application/repositories/people.repository.interface";
import { byCodePoint } from "@/src/entities/code-point-order";
import { DatabaseOperationError } from "@/src/entities/errors/common";
import type {
  PeopleQuery,
  PersonFacts,
  PersonRecord,
  PersonRef,
} from "@/src/entities/models/person.model";
import { nextUpdatedAt } from "@/src/infrastructure/repositories/updated-at.mock";

// A person as the mock keeps them: their company by id, named when read, as the table joins it.
type StoredPerson = Omit<PersonRecord, "company"> & {
  companyId: string | null;
};

// The people and their job links in memory. Like the table, lists sort by name and then id, by
// code point.
export class MockPeopleRepository implements IPeopleRepository {
  private readonly rows: { ownerId: string; person: StoredPerson }[] = [];
  private readonly links: {
    ownerId: string;
    personId: string;
    jobId: string;
    createdAt: Date;
  }[] = [];

  constructor(private readonly companies: ICompaniesRepository) {}

  async create(ownerId: string, facts: PersonFacts): Promise<PersonRecord> {
    const person: StoredPerson = {
      id: crypto.randomUUID(),
      ...facts,
      updatedAt: new Date(),
    };
    this.rows.push({ ownerId, person });
    return this.recordOf(ownerId, person);
  }

  async get(ownerId: string, id: string): Promise<PersonRecord | undefined> {
    const row = this.rowOf(ownerId, id);
    return row && this.recordOf(ownerId, row.person);
  }

  async getForUpdate(
    ownerId: string,
    id: string,
  ): Promise<PersonRecord | undefined> {
    return this.get(ownerId, id);
  }

  async update(
    ownerId: string,
    id: string,
    changes: Partial<PersonFacts>,
  ): Promise<PersonRecord> {
    const row = this.rowOf(ownerId, id);
    if (!row) {
      throw new DatabaseOperationError("update found no person");
    }
    const given = Object.fromEntries(
      Object.entries(changes).filter(([, value]) => value !== undefined),
    );
    row.person = {
      ...row.person,
      ...given,
      updatedAt: nextUpdatedAt(row.person.updatedAt),
    };
    return this.recordOf(ownerId, row.person);
  }

  async delete(ownerId: string, id: string): Promise<void> {
    this.removeLinks(
      (link) => link.ownerId === ownerId && link.personId === id,
    );
    const index = this.rows.findIndex(
      (row) => row.ownerId === ownerId && row.person.id === id,
    );
    if (index >= 0) {
      this.rows.splice(index, 1);
    }
  }

  async find(
    ownerId: string,
    { query, companyId, limit, offset }: PeopleQuery,
  ): Promise<{ people: PersonRecord[]; nextOffset: number | null }> {
    const needle = (query ?? "").toLowerCase();
    const matching = this.peopleOf(ownerId).filter(
      (person) =>
        person.name.toLowerCase().includes(needle) &&
        (companyId === undefined || person.companyId === companyId),
    );
    return {
      people: await Promise.all(
        matching
          .slice(offset, offset + limit)
          .map((person) => this.recordOf(ownerId, person)),
      ),
      nextOffset: matching.length > offset + limit ? offset + limit : null,
    };
  }

  async listDue(ownerId: string, day: string): Promise<PersonRecord[]> {
    return Promise.all(
      this.peopleOf(ownerId)
        .filter((person) => person.nextDate !== null && person.nextDate <= day)
        // A stable sort, so people due the same day stay by name.
        .sort((a, b) => byCodePoint(a.nextDate ?? "", b.nextDate ?? ""))
        .map((person) => this.recordOf(ownerId, person)),
    );
  }

  async listForCompany(
    ownerId: string,
    companyId: string,
  ): Promise<PersonRef[]> {
    return this.peopleOf(ownerId)
      .filter((person) => person.companyId === companyId)
      .map(refOf);
  }

  async countForCompany(ownerId: string, companyId: string): Promise<number> {
    return (await this.listForCompany(ownerId, companyId)).length;
  }

  async listForJob(ownerId: string, jobId: string): Promise<PersonRef[]> {
    const linked = new Set(
      this.links
        .filter((link) => link.ownerId === ownerId && link.jobId === jobId)
        .map((link) => link.personId),
    );
    return this.peopleOf(ownerId)
      .filter((person) => linked.has(person.id))
      .map(refOf);
  }

  async jobIdsFor(ownerId: string, personId: string): Promise<string[]> {
    return this.links
      .filter((link) => link.ownerId === ownerId && link.personId === personId)
      .sort(
        (a, b) =>
          a.createdAt.getTime() - b.createdAt.getTime() ||
          byCodePoint(a.jobId, b.jobId),
      )
      .map((link) => link.jobId);
  }

  async linkJob(
    ownerId: string,
    personId: string,
    jobId: string,
  ): Promise<void> {
    const linked = this.links.some(
      (link) =>
        link.ownerId === ownerId &&
        link.personId === personId &&
        link.jobId === jobId,
    );
    if (!linked) {
      this.links.push({ ownerId, personId, jobId, createdAt: new Date() });
    }
  }

  async unlinkJob(
    ownerId: string,
    personId: string,
    jobId: string,
  ): Promise<void> {
    this.removeLinks(
      (link) =>
        link.ownerId === ownerId &&
        link.personId === personId &&
        link.jobId === jobId,
    );
  }

  async unlinkAllFor(ownerId: string, jobId: string): Promise<void> {
    this.removeLinks(
      (link) => link.ownerId === ownerId && link.jobId === jobId,
    );
  }

  // The owner's people, by name and then id.
  private peopleOf(ownerId: string): StoredPerson[] {
    return this.rows
      .filter((row) => row.ownerId === ownerId)
      .map((row) => row.person)
      .sort((a, b) => byCodePoint(a.name, b.name) || byCodePoint(a.id, b.id));
  }

  private rowOf(ownerId: string, id: string) {
    return this.rows.find(
      (row) => row.ownerId === ownerId && row.person.id === id,
    );
  }

  private removeLinks(matches: (link: (typeof this.links)[number]) => boolean) {
    for (let index = this.links.length - 1; index >= 0; index -= 1) {
      const link = this.links[index];
      if (link && matches(link)) {
        this.links.splice(index, 1);
      }
    }
  }

  private async recordOf(
    ownerId: string,
    { companyId, ...person }: StoredPerson,
  ): Promise<PersonRecord> {
    const company = companyId
      ? await this.companies.get(ownerId, companyId)
      : undefined;
    return {
      ...person,
      company: company ? { id: company.id, name: company.name } : null,
    };
  }
}

function refOf({ id, name, role, rank }: StoredPerson): PersonRef {
  return { id, name, role, rank };
}
