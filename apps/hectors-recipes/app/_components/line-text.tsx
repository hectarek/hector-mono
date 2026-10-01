import type { ShownLine } from "@/src/entities/scaling";

// A recipe line as it reads: "4 cloves garlic", then its note and "optional" in a quieter
// voice (the note stays on the recipe and off the grocery list).
export function LineText({ line }: { line: ShownLine }) {
  const extra = [line.note, line.optional ? "optional" : null]
    .filter(Boolean)
    .join(", ");
  return (
    <>
      {line.text}
      {extra && <span className="text-muted-foreground">, {extra}</span>}
    </>
  );
}
