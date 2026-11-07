import { z } from "zod";
import type { RecordAdded } from "./activity.model";
import type { CompanyRef } from "./company.model";
import {
  dateSchema,
  optionalText,
  requiredText,
  timeSchema,
} from "./input.model";
import type { Interaction } from "./interaction.model";
import type { JobSummary } from "./job.model";
import type { Note } from "./note.model";

// How close Hector is to a person (R7), A the closest.
export const RANKS = ["A", "B", "C"] as const;
export type Rank = (typeof RANKS)[number];

// What a person holds that a change can set (R7): their company, by id, their role, how Hector
// knows them, a rank, the ask, and a next step and date. Dates are "YYYY-MM-DD" (KTD18). Their
// notes are dated entries of their own, as a job's are (the UX plan's UX8, Q7).
export type PersonFacts = {
  name: string;
  companyId: string | null;
  role: string | null;
  howKnown: string | null;
  rank: Rank | null;
  ask: string | null;
  nextStep: string | null;
  nextDate: string | null;
};

// The dates a person's interactions give them (KTD9): the latest message sent, reply received and
// conversation held. Read from the interactions each time, never stored on the person, so a
// backfill or a delete can't leave them wrong.
export type PersonDates = {
  messagedOn: string | null;
  repliedOn: string | null;
  metOn: string | null;
};

// A person as stored: their facts, with the company by name.
export type PersonRecord = Omit<PersonFacts, "companyId"> & {
  id: string;
  company: CompanyRef | null;
  // When it last changed: a change sends back the one it read (R22).
  updatedAt: Date;
};

// A person as the app shows them: as stored, with their dates.
export type Person = PersonRecord & PersonDates;

// A person as their history records them: the company by name.
export function personLogged({
  id,
  company,
  updatedAt,
  ...facts
}: PersonRecord): Record<string, unknown> {
  return { company: company?.name ?? null, ...facts };
}

// A person in another record's list: a company's people, a job's contacts.
export type PersonRef = Pick<Person, "id" | "name" | "role" | "rank">;

// A person who's gone, as their delete answers: who, and the pages that listed them.
export type DeletedPerson = {
  id: string;
  name: string;
  companyId: string | null;
  jobIds: string[];
};

// Removing a contact from a job's input: which person, and which job.
export const contactSchema = z.object({
  personId: z.uuid(),
  jobId: z.uuid(),
});

const rankSchema = z.enum(RANKS, { error: "Use A, B or C" });

// The details any person may carry, every one optional.
const personDetailsSchema = z.object({
  companyId: z.uuid().nullable().optional(),
  role: optionalText(120).optional(),
  howKnown: optionalText(200).optional(),
  rank: rankSchema.nullable().optional(),
  ask: optionalText(300).optional(),
  nextStep: optionalText(120).optional(),
  nextDate: dateSchema.nullable().optional(),
});

// add_person's input: a name, whatever else is known, the job they're a contact for, if any, and
// a note, which becomes their first.
export const addPersonSchema = personDetailsSchema.extend({
  name: requiredText(120, "A person needs a name"),
  jobId: z.uuid().optional(),
  notes: optionalText(4000).optional(),
});
export type AddPersonInput = z.output<typeof addPersonSchema>;

// update_person's input: a change to the facts given, against the updatedAt read with the person
// (R22). Null clears a fact. The dates a person's interactions give them have no field (KTD9).
export const updatePersonSchema = personDetailsSchema.extend({
  id: z.uuid(),
  updatedAt: timeSchema,
  name: requiredText(120, "A person needs a name").optional(),
});
export type UpdatePersonInput = z.output<typeof updatePersonSchema>;

// get_person's input, and deleting's: which person.
export const personIdSchema = z.object({ id: z.uuid() });

// The most people a page of find_people holds.
const PEOPLE_PAGE_MAX = 50;

// How find_people orders people: by name, or by their next steps (the UX plan's UX6): late, due
// today, upcoming, then steps with no date, then everyone with none, rank A first within each.
const PEOPLE_ORDERS = ["name", "next-step"] as const;

// find_people's input: people whose names, or whose company's names, hold the query, ignoring
// case (everyone without one), at the company given, if any, only those whose next step has no
// date when undated is true, in the order asked, a page at a time.
export const findPeopleSchema = z.object({
  query: z
    .string()
    .trim()
    .max(120, { error: "At most 120 characters" })
    .optional(),
  companyId: z.uuid().optional(),
  undated: z.boolean().optional(),
  order: z
    .enum(PEOPLE_ORDERS, { error: `Use one of: ${PEOPLE_ORDERS.join(", ")}` })
    .default("name"),
  limit: z.int().min(1).max(PEOPLE_PAGE_MAX).default(20),
  offset: z.int().min(0).default(0),
});
export type PeopleQuery = z.output<typeof findPeopleSchema>;

// A person as a list shows them, with the updatedAt a change from the list sends back (R22).
export type PersonSummary = Pick<
  Person,
  | "id"
  | "name"
  | "company"
  | "role"
  | "rank"
  | "nextStep"
  | "nextDate"
  | "messagedOn"
  | "repliedOn"
  | "metOn"
  | "updatedAt"
>;

export function personSummary(person: Person): PersonSummary {
  return {
    id: person.id,
    name: person.name,
    company: person.company,
    role: person.role,
    rank: person.rank,
    nextStep: person.nextStep,
    nextDate: person.nextDate,
    messagedOn: person.messagedOn,
    repliedOn: person.repliedOn,
    metOn: person.metOn,
    updatedAt: person.updatedAt,
  };
}

// nextOffset: where the next page starts, or null on the last one.
export type PeoplePage = {
  people: PersonSummary[];
  nextOffset: number | null;
};

// A person as their page and get_person show them: their interactions, the latest first, the jobs
// they're a contact for, and their notes, the newest first.
export type PersonDetail = {
  person: Person;
  interactions: Interaction[];
  jobs: JobSummary[];
  notes: Note[];
  // Who added them and when (the UX plan's UX8).
  added: RecordAdded;
};
