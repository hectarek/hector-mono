import { Button } from "@repo/ui/components/button";

// Human-only controls as Claude's session sees them: there, but off, and whose they are (R21,
// docs/build-plan.md KTD3).
export function OnlyHector({ labels }: { labels: string[] }) {
  return (
    <div className="flex flex-wrap items-center gap-2">
      {labels.map((label) => (
        <Button
          key={label}
          variant={label === "Delete" ? "destructive" : "secondary"}
          size="lg"
          disabled
          className="min-h-11"
        >
          {label}
        </Button>
      ))}
      <span className="text-muted-foreground text-sm">Only Hector</span>
    </div>
  );
}
