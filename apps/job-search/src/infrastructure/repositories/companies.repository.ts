import { and, eq, ne, sql } from "drizzle-orm";
import { companies } from "@/db/schema";
import type { ICompaniesRepository } from "@/src/application/repositories/companies.repository.interface";
import type { ILoggerService } from "@/src/application/services/logger.service.interface";
import { DatabaseOperationError } from "@/src/entities/errors/common";
import {
  type Company,
  type CompanyFacts,
  type CompanyPage,
  type CompanyQuery,
  type CompanyRef,
  companyNameKey,
} from "@/src/entities/models/company.model";
import type { ITransaction } from "@/src/entities/models/transaction.model";
import {
  BaseRepository,
  nextUpdatedAt,
} from "@/src/infrastructure/repositories/base.repository";

// A company as the app reads it: not its owner, its name key or when it was made.
const COMPANY = {
  id: companies.id,
  name: companies.name,
  website: companies.website,
  location: companies.location,
  headcount: companies.headcount,
  industry: companies.industry,
  officePolicy: companies.officePolicy,
  leavePolicy: companies.leavePolicy,
  tier: companies.tier,
  researchSummary: companies.researchSummary,
  researchRef: companies.researchRef,
  updatedAt: companies.updatedAt,
};

// The most similar names a company's warning lists.
const SIMILAR_MAX = 10;

export class CompaniesRepository
  extends BaseRepository
  implements ICompaniesRepository
{
  constructor(logger: ILoggerService) {
    super(logger, "companies");
  }

  async create(
    ownerId: string,
    facts: CompanyFacts,
    tx: ITransaction,
  ): Promise<Company> {
    try {
      const [company] = await this.getDbContext(tx)
        .insert(companies)
        .values({ ownerId, ...facts, nameKey: companyNameKey(facts.name) })
        .returning(COMPANY);
      if (!company) {
        throw new DatabaseOperationError("create returned no company");
      }
      return company;
    } catch (err) {
      this.handleError(err, "create", { ownerId });
    }
  }

  async get(
    ownerId: string,
    id: string,
    tx?: ITransaction,
  ): Promise<Company | undefined> {
    try {
      const [company] = await this.getDbContext(tx)
        .select(COMPANY)
        .from(companies)
        .where(and(eq(companies.ownerId, ownerId), eq(companies.id, id)));
      return company;
    } catch (err) {
      this.handleError(err, "get", { ownerId, companyId: id });
    }
  }

  async getForUpdate(
    ownerId: string,
    id: string,
    tx: ITransaction,
  ): Promise<Company | undefined> {
    try {
      const [company] = await this.getDbContext(tx)
        .select(COMPANY)
        .from(companies)
        .where(and(eq(companies.ownerId, ownerId), eq(companies.id, id)))
        .for("update");
      return company;
    } catch (err) {
      this.handleError(err, "getForUpdate", { ownerId, companyId: id });
    }
  }

  async update(
    ownerId: string,
    id: string,
    changes: Partial<CompanyFacts>,
    tx: ITransaction,
  ): Promise<Company> {
    try {
      const [company] = await this.getDbContext(tx)
        .update(companies)
        .set({
          ...changes,
          ...(changes.name !== undefined && {
            nameKey: companyNameKey(changes.name),
          }),
          updatedAt: nextUpdatedAt(companies.updatedAt),
        })
        .where(and(eq(companies.ownerId, ownerId), eq(companies.id, id)))
        .returning(COMPANY);
      if (!company) {
        throw new DatabaseOperationError("update found no company");
      }
      return company;
    } catch (err) {
      this.handleError(err, "update", { ownerId, companyId: id });
    }
  }

  async delete(ownerId: string, id: string, tx: ITransaction): Promise<void> {
    try {
      await this.getDbContext(tx)
        .delete(companies)
        .where(and(eq(companies.ownerId, ownerId), eq(companies.id, id)));
    } catch (err) {
      this.handleError(err, "delete", { ownerId, companyId: id });
    }
  }

  async find(
    ownerId: string,
    { query, limit, offset }: CompanyQuery,
  ): Promise<CompanyPage> {
    const key = companyNameKey(query ?? "");
    try {
      // One more than the page, to tell whether another follows. Keys sort by code point
      // ("C"), as the mock sorts them.
      const rows = await this.getDbContext()
        .select({
          id: companies.id,
          name: companies.name,
          industry: companies.industry,
          location: companies.location,
          tier: companies.tier,
        })
        .from(companies)
        .where(
          and(
            eq(companies.ownerId, ownerId),
            key ? sql`strpos(${companies.nameKey}, ${key}) > 0` : undefined,
          ),
        )
        .orderBy(sql`${companies.nameKey} collate "C"`, companies.id)
        .limit(limit + 1)
        .offset(offset);
      return {
        companies: rows.slice(0, limit),
        nextOffset: rows.length > limit ? offset + limit : null,
      };
    } catch (err) {
      this.handleError(err, "find", { ownerId });
    }
  }

  async findSimilar(
    ownerId: string,
    name: string,
    exceptId: string,
    tx?: ITransaction,
  ): Promise<CompanyRef[]> {
    try {
      return await this.getDbContext(tx)
        .select({ id: companies.id, name: companies.name })
        .from(companies)
        .where(
          and(
            eq(companies.ownerId, ownerId),
            eq(companies.nameKey, companyNameKey(name)),
            ne(companies.id, exceptId),
          ),
        )
        .orderBy(sql`${companies.name} collate "C"`, companies.id)
        .limit(SIMILAR_MAX);
    } catch (err) {
      this.handleError(err, "findSimilar", { ownerId, companyId: exceptId });
    }
  }
}
