import type { ICompaniesRepository } from "@/src/application/repositories/companies.repository.interface";
import { byCodePoint } from "@/src/entities/code-point-order";
import { DatabaseOperationError } from "@/src/entities/errors/common";
import {
  type Company,
  type CompanyFacts,
  type CompanyPage,
  type CompanyQuery,
  type CompanyRef,
  companyNameKey,
} from "@/src/entities/models/company.model";

// As the table's repository: the most similar names a company's warning lists.
const SIMILAR_MAX = 10;

// The companies in memory. Like the table, find sorts by name key and then id, by code point.
export class MockCompaniesRepository implements ICompaniesRepository {
  private readonly rows: { ownerId: string; company: Company }[] = [];

  async create(ownerId: string, facts: CompanyFacts): Promise<Company> {
    const company: Company = {
      id: crypto.randomUUID(),
      ...facts,
      updatedAt: new Date(),
    };
    this.rows.push({ ownerId, company });
    return { ...company };
  }

  async get(ownerId: string, id: string): Promise<Company | undefined> {
    const row = this.rowOf(ownerId, id);
    return row && { ...row.company };
  }

  async getForUpdate(
    ownerId: string,
    id: string,
  ): Promise<Company | undefined> {
    return this.get(ownerId, id);
  }

  async update(
    ownerId: string,
    id: string,
    changes: Partial<CompanyFacts>,
  ): Promise<Company> {
    const row = this.rowOf(ownerId, id);
    if (!row) {
      throw new DatabaseOperationError("update found no company");
    }
    const given = Object.fromEntries(
      Object.entries(changes).filter(([, value]) => value !== undefined),
    );
    row.company = {
      ...row.company,
      ...given,
      updatedAt: new Date(
        Math.max(Date.now(), row.company.updatedAt.getTime() + 1),
      ),
    };
    return { ...row.company };
  }

  async delete(ownerId: string, id: string): Promise<void> {
    const index = this.rows.findIndex(
      (row) => row.ownerId === ownerId && row.company.id === id,
    );
    if (index >= 0) {
      this.rows.splice(index, 1);
    }
  }

  async find(
    ownerId: string,
    { query, limit, offset }: CompanyQuery,
  ): Promise<CompanyPage> {
    const key = companyNameKey(query ?? "");
    const matching = this.rows
      .filter(
        (row) =>
          row.ownerId === ownerId &&
          companyNameKey(row.company.name).includes(key),
      )
      .map(({ company }) => company)
      .sort(
        (a, b) =>
          byCodePoint(companyNameKey(a.name), companyNameKey(b.name)) ||
          byCodePoint(a.id, b.id),
      );
    return {
      companies: matching
        .slice(offset, offset + limit)
        .map(({ id, name, industry, location, tier }) => ({
          id,
          name,
          industry,
          location,
          tier,
        })),
      nextOffset: matching.length > offset + limit ? offset + limit : null,
    };
  }

  async findSimilar(
    ownerId: string,
    name: string,
    exceptId: string,
  ): Promise<CompanyRef[]> {
    const key = companyNameKey(name);
    return this.rows
      .filter(
        (row) =>
          row.ownerId === ownerId &&
          row.company.id !== exceptId &&
          companyNameKey(row.company.name) === key,
      )
      .map(({ company: { id, name: similar } }) => ({ id, name: similar }))
      .sort((a, b) => byCodePoint(a.name, b.name) || byCodePoint(a.id, b.id))
      .slice(0, SIMILAR_MAX);
  }

  private rowOf(ownerId: string, id: string) {
    return this.rows.find(
      (row) => row.ownerId === ownerId && row.company.id === id,
    );
  }
}
