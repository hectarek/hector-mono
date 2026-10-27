import type {
  AddedSource,
  LeadSource,
} from "@/src/entities/models/lead-source.model";
import type { ITransaction } from "@/src/entities/models/transaction.model";

// An owner's lead sources (docs/build-plan.md U5), each name listed once, compared ignoring case.
export interface ILeadSourcesRepository {
  // The owner's source with this name, added when there's none. Two adds of one name at once
  // give one source.
  add(ownerId: string, name: string, tx: ITransaction): Promise<AddedSource>;
  // Every source of the owner's, by name.
  list(ownerId: string): Promise<LeadSource[]>;
}
