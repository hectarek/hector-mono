import { PersonForm } from "@/app/_components/person-form";
import { getPageActor } from "@/app/_lib/current-actor";
import { listCompanies } from "@/app/_lib/list-companies";

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

// Adding a person (R7): at the company it opens from (`?company=`), and as the contact of the job
// it opens from (`?job=`), if any.
export default async function NewPersonPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const actor = await getPageActor();
  const params = await searchParams;
  const companies = await listCompanies(actor);
  const companyId =
    typeof params.company === "string" ? params.company : undefined;
  const jobId = typeof params.job === "string" ? params.job : undefined;

  return (
    <div className="flex max-w-2xl flex-col gap-6">
      <h1 className="text-xl font-semibold tracking-tight">Add a person</h1>
      <PersonForm companies={companies} companyId={companyId} jobId={jobId} />
    </div>
  );
}
