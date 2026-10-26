import type {
  Company,
  CompanyFacts,
  CompanyPage,
  CompanyQuery,
  CompanyRef,
} from "@/src/entities/models/company.model";
import type { ITransaction } from "@/src/entities/models/transaction.model";

// An owner's companies (docs/build-plan.md U5). Every method takes the owner's id: no other
// owner's company is ever read or changed (KTD2).
export interface ICompaniesRepository {
  create(
    ownerId: string,
    facts: CompanyFacts,
    tx: ITransaction,
  ): Promise<Company>;
  get(
    ownerId: string,
    id: string,
    tx?: ITransaction,
  ): Promise<Company | undefined>;
  // The company, read for a change: it stays locked until the transaction ends, so no other
  // write lands between the check against what was read and the change.
  getForUpdate(
    ownerId: string,
    id: string,
    tx: ITransaction,
  ): Promise<Company | undefined>;
  // Sets the given facts and moves updatedAt on. The use case has read the company first.
  update(
    ownerId: string,
    id: string,
    changes: Partial<CompanyFacts>,
    tx: ITransaction,
  ): Promise<Company>;
  delete(ownerId: string, id: string, tx: ITransaction): Promise<void>;
  find(ownerId: string, query: CompanyQuery): Promise<CompanyPage>;
  // The companies, but the one given, whose names match this one ignoring case and punctuation.
  findSimilar(
    ownerId: string,
    name: string,
    exceptId: string,
    tx?: ITransaction,
  ): Promise<CompanyRef[]>;
}
