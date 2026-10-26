import { Alert, AlertDescription, AlertTitle } from "@repo/ui/components/alert";

// What a form shows when its save met a change made since it opened (R22, docs/build-plan.md
// KTD15): each field that changed and its value now. The form holds the record as it is now, with
// what was typed kept, so the next save goes against it.
export function ConflictNotice({
  what,
  changes,
}: {
  // What changed, as the notice names it: "the company", "the settings".
  what: string;
  changes: { label: string; now: string }[];
}) {
  return (
    <Alert>
      <AlertTitle>Changed since you opened this</AlertTitle>
      <AlertDescription>
        <p>
          The form shows {what} as it is now, with your edits kept. Save to keep
          them.
        </p>
        <ul>
          {changes.map(({ label, now }) => (
            <li key={label}>
              {label} is now {now || "empty"}
            </li>
          ))}
        </ul>
      </AlertDescription>
    </Alert>
  );
}
