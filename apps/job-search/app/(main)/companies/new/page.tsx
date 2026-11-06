import { CompanyForm } from "@/app/_components/company-form";
import { PageTitle } from "@/app/_components/display";
import { getPageActor } from "@/app/_lib/current-actor";

// Adding a company (R4).
export default async function NewCompanyPage() {
  await getPageActor();

  return (
    <div className="flex max-w-2xl flex-col gap-6">
      <PageTitle>Add a company</PageTitle>
      <CompanyForm />
    </div>
  );
}
