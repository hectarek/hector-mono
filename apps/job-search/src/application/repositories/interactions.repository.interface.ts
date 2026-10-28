import type {
  ConversationState,
  Interaction,
} from "@/src/entities/models/interaction.model";
import type { PersonDates } from "@/src/entities/models/person.model";
import type { ITransaction } from "@/src/entities/models/transaction.model";

// An interaction as it's written.
export type NewInteraction = Omit<Interaction, "id" | "createdAt">;

// An owner's interactions with people (docs/build-plan.md U7, KTD9). Every method takes the
// owner's id (KTD2).
export interface IInteractionsRepository {
  add(
    ownerId: string,
    interaction: NewInteraction,
    tx: ITransaction,
  ): Promise<Interaction>;
  // The interaction, read for a change: it stays locked until the transaction ends.
  getForUpdate(
    ownerId: string,
    id: string,
    tx: ITransaction,
  ): Promise<Interaction | undefined>;
  // How a scheduled conversation ended, and its note when one is given.
  setOutcome(
    ownerId: string,
    id: string,
    outcome: { state: ConversationState; note?: string | null },
    tx: ITransaction,
  ): Promise<Interaction>;
  delete(ownerId: string, id: string, tx: ITransaction): Promise<void>;
  // A person's interactions, the latest day first, then the latest logged.
  listForPerson(
    ownerId: string,
    personId: string,
    tx?: ITransaction,
  ): Promise<Interaction[]>;
  // Each given person's dates (KTD9): the latest message sent, reply received and conversation
  // held. A person with none has no entry.
  datesFor(
    ownerId: string,
    personIds: string[],
    tx?: ITransaction,
  ): Promise<Map<string, PersonDates>>;
  // The latest reply linked to a job, for the stale rule (R3).
  repliedOnFor(ownerId: string, jobId: string): Promise<string | null>;
  // Every interaction a person has, with the person's delete.
  deleteForPerson(
    ownerId: string,
    personId: string,
    tx: ITransaction,
  ): Promise<void>;
  // Unlinks a job's interactions, with the job's delete: they stay on their people.
  unlinkJob(ownerId: string, jobId: string, tx: ITransaction): Promise<void>;
}
