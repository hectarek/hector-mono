import { RecordTitle } from "@/app/_components/display";
import { PersonForm } from "@/app/_components/person-form";
import { getPageActor } from "@/app/_lib/current-actor";
import { listCompanies } from "@/app/_lib/list-companies";
import { loadPerson } from "@/app/_lib/load-person";

// Changing what's known about a person (R7): Hector's session and Claude's both may.
export default async function EditPersonPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const actor = await getPageActor();
  const { id } = await params;
  const [{ person }, companies] = await Promise.all([
    loadPerson(id, actor),
    listCompanies(actor),
  ]);

  return (
    <div className="flex max-w-2xl flex-col gap-6">
      <RecordTitle>Edit {person.name}</RecordTitle>
      <PersonForm person={person} companies={companies} />
    </div>
  );
}
