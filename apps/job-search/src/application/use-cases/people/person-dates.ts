import type { IInteractionsRepository } from "@/src/application/repositories/interactions.repository.interface";
import type {
  Person,
  PersonDates,
  PersonRecord,
} from "@/src/entities/models/person.model";
import type { ITransaction } from "@/src/entities/models/transaction.model";

// A person with no interactions yet.
export const NO_DATES: PersonDates = {
  messagedOn: null,
  repliedOn: null,
  metOn: null,
};

// People as stored, with the dates their interactions give them (KTD9), read in one query.
export async function withDates(
  interactionsRepository: IInteractionsRepository,
  ownerId: string,
  records: PersonRecord[],
  tx?: ITransaction,
): Promise<Person[]> {
  const dates = await interactionsRepository.datesFor(
    ownerId,
    records.map(({ id }) => id),
    tx,
  );
  return records.map((record) => ({
    ...record,
    ...(dates.get(record.id) ?? NO_DATES),
  }));
}

// One person, with their dates.
export async function datedPerson(
  interactionsRepository: IInteractionsRepository,
  ownerId: string,
  record: PersonRecord,
  tx?: ITransaction,
): Promise<Person> {
  const [person] = await withDates(
    interactionsRepository,
    ownerId,
    [record],
    tx,
  );
  return person ?? { ...record, ...NO_DATES };
}
