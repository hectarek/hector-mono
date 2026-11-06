import { PageTitle } from "@/app/_components/display";
import { PracticeForm } from "@/app/_components/practice-form";
import { getPageActor } from "@/app/_lib/current-actor";

// Logging a practice session (R11).
export default async function NewPracticeSessionPage() {
  await getPageActor();

  return (
    <div className="flex max-w-2xl flex-col gap-6">
      <PageTitle>Log a practice session</PageTitle>
      <PracticeForm />
    </div>
  );
}
