import { JobForm } from "@/app/_components/job-form";
import { getPageActor } from "@/app/_lib/current-actor";
import { loadJob } from "@/app/_lib/load-job";
import { getInjection } from "@/di/container";

// Changing a job's facts (R1): Hector's session and Claude's both may, though Claude sets
// applied-on only with a status move (KTD3).
export default async function EditJobPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const actor = await getPageActor();
  const { id } = await params;
  const [{ job }, sources] = await Promise.all([
    loadJob(id, actor),
    getInjection("IListSourcesController")({}, actor),
  ]);

  return (
    <div className="flex max-w-2xl flex-col gap-6">
      <h1 className="text-xl font-semibold tracking-tight">Edit {job.role}</h1>
      <JobForm
        job={job}
        companyId={job.company.id}
        sources={sources.map((source) => source.name)}
      />
    </div>
  );
}
