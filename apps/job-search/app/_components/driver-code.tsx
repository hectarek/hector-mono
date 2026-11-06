import { ACTOR_LABELS } from "@/app/_lib/job-labels";
import type { ChangeActor } from "@/src/entities/models/activity.model";

// Who did something, in three letters, as a timing screen names its drivers (the design system's
// DriverCode). Every actor gets the same quiet chip, so Claude's work is told apart by its letters
// alone; screen readers hear the full name.
const CODES: Record<ChangeActor, string> = {
  owner: "HEC",
  agent: "CLA",
  import: "IMP",
  system: "APP",
};

export function DriverCode({ actor }: { actor: ChangeActor }) {
  return (
    <span className="inline-flex shrink-0">
      <span
        aria-hidden="true"
        className="bg-secondary text-secondary-foreground font-heading font-stretch-118% text-2xs rounded-xs px-1.5 py-0.5 font-extrabold tracking-widest"
      >
        {CODES[actor]}
      </span>
      <span className="sr-only">{ACTOR_LABELS[actor]}</span>
    </span>
  );
}
