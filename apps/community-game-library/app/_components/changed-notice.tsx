import { Button } from "@repo/ui/components/button";
import { CHANGED_LINES } from "@/app/_lib/changed-lines";
import type { ChangedReason } from "@/src/entities/errors/common";

// Something changed underneath (KTD16): the sheet says what in one line, in a bone inset, and
// offers the next best action, such as Join the line, in place of its own. Nothing was sent.
// An action whose state carries `changed` shows this instead of its error line.
export function ChangedNotice({
  reason,
  onNext,
}: {
  reason: ChangedReason;
  // The next best action, when the reason has one and the screen can take it.
  onNext?: () => void;
}) {
  const { line, next } = CHANGED_LINES[reason];
  return (
    <div className="flex flex-col gap-3.5">
      <p
        role="status"
        className="rounded-lg border-2 border-foreground bg-secondary p-3 text-sm font-semibold"
      >
        {line}
      </p>
      {next && onNext && (
        <Button size="lg" className="w-full" onClick={onNext}>
          {next}
        </Button>
      )}
    </div>
  );
}
