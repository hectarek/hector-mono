import { CompanyForm } from "@/app/_components/company-form";
import { getPageActor } from "@/app/_lib/current-actor";
import { loadCompany } from "@/app/_lib/load-company";

// Changing a company's facts (R4): Hector's session and Claude's both may.
export default async function EditCompanyPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const actor = await getPageActor();
  const { id } = await params;
  const { company } = await loadCompany(id, actor);

  return (
    <div className="flex max-w-2xl flex-col gap-6">
      <h1 className="text-xl font-semibold tracking-tight">
        Edit {company.name}
      </h1>
      <CompanyForm company={company} />
    </div>
  );
}
