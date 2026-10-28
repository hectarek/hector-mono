import { PracticeForm } from "@/app/_components/practice-form";
import { getPageActor } from "@/app/_lib/current-actor";

// Logging a practice session (R11).
export default async function NewPracticeSessionPage() {
  await getPageActor();

  return (
    <div className="flex max-w-2xl flex-col gap-6">
      <h1 className="text-xl font-semibold tracking-tight">
        Log a practice session
      </h1>
      <PracticeForm />
    </div>
  );
}
