"use server";

import { getActionActor } from "@/app/_lib/current-actor";
import { type ActionResult, answer, changeContext } from "@/app/actions/shared";
import { getInjection } from "@/di/container";
import type {
  DeletedPerson,
  PeoplePage,
  Person,
  PersonDetail,
} from "@/src/entities/models/person.model";

// People (docs/build-plan.md U7): plain-argument actions that answer an envelope and never
// redirect (KTD4). find_people, get_person, add_person and update_person call the first four once
// U4's gate passes; deleting a person and taking a contact off a job are Hector's alone (R21).

export async function findPeople(
  input: unknown,
): Promise<ActionResult<PeoplePage>> {
  return answer(
    "findPeople",
    "Couldn't list the people. Try again.",
    async () =>
      getInjection("IFindPeopleController")(input, await getActionActor()),
  );
}

export async function getPerson(
  input: unknown,
): Promise<ActionResult<PersonDetail>> {
  return answer("getPerson", "Couldn't read the person. Try again.", async () =>
    getInjection("IGetPersonController")(input, await getActionActor()),
  );
}

// A new person, and a job's contact when the input names the job. `tool` is the page tool's name.
export async function addPerson(
  input: unknown,
  tool?: string,
): Promise<ActionResult<Person>> {
  return answer(
    "addPerson",
    "Couldn't add the person. Try again.",
    async () =>
      getInjection("IAddPersonController")(input, await changeContext(tool)),
    (person) => [...pagesOf(person), ...jobPageOf(input)],
  );
}

export async function updatePerson(
  input: unknown,
  tool?: string,
): Promise<ActionResult<Person>> {
  return answer(
    "updatePerson",
    "Couldn't save the person. Try again.",
    async () =>
      getInjection("IUpdatePersonController")(input, await changeContext(tool)),
    pagesOf,
  );
}

export async function deletePerson(
  input: unknown,
): Promise<ActionResult<DeletedPerson>> {
  return answer(
    "deletePerson",
    "Couldn't delete the person. Try again.",
    async () =>
      getInjection("IDeletePersonController")(input, await changeContext()),
    (deleted) => [
      ...personPages(deleted.id, deleted.companyId),
      ...deleted.jobIds.map((jobId) => `/jobs/${jobId}`),
    ],
  );
}

export async function removeContact(
  input: unknown,
): Promise<ActionResult<{ personId: string; jobId: string }>> {
  return answer(
    "removeContact",
    "Couldn't remove the contact. Try again.",
    async () =>
      getInjection("IRemoveContactController")(input, await changeContext()),
    ({ personId, jobId }) => [
      `/jobs/${jobId}`,
      `/people/${personId}`,
      "/agent",
    ],
  );
}

// The pages that show a person: the people list, their own, their company's, and Claude's page,
// which lists its changes.
function personPages(id: string, companyId: string | null): string[] {
  return [
    "/people",
    `/people/${id}`,
    ...(companyId ? [`/companies/${companyId}`] : []),
    "/agent",
  ];
}

function pagesOf(person: Person): string[] {
  return personPages(person.id, person.company?.id ?? null);
}

// The job a new person was added as a contact for, whose page lists them.
function jobPageOf(input: unknown): string[] {
  const jobId =
    typeof input === "object" && input !== null && "jobId" in input
      ? input.jobId
      : undefined;
  return typeof jobId === "string" ? [`/jobs/${jobId}`] : [];
}
