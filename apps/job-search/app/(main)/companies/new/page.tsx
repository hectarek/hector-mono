import { CompanyForm } from "@/app/_components/company-form";
import { getPageActor } from "@/app/_lib/current-actor";

// Adding a company (R4).
export default async function NewCompanyPage() {
  await getPageActor();

  return (
    <div className="flex max-w-2xl flex-col gap-6">
      <h1 className="text-xl font-semibold tracking-tight">Add a company</h1>
      <CompanyForm />
    </div>
  );
}
