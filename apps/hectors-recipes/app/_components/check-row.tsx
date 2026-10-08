import { cn } from "@repo/ui/lib/utils";
import { Check } from "lucide-react";
import type { ReactNode } from "react";

// A row you check off (the design system's pattern for lists you check off; AGENTS.md UI
// Rules): the whole row is a label around a visually hidden checkbox, so it reads and works
// as one, with the drawn box beside the words. Groceries' items and cook mode's ingredients
// (P27.3), so both lists look and work the same.
export function CheckRow({
  checked,
  onChange,
  disabled = false,
  className,
  children,
}: {
  checked: boolean;
  onChange: () => void;
  disabled?: boolean;
  // Layout only: the row's spacing and rule.
  className?: string;
  children: ReactNode;
}) {
  return (
    <label
      className={cn(
        "flex min-w-0 flex-1 items-center gap-3 select-none",
        !disabled && "cursor-pointer",
        className,
      )}
    >
      <input
        type="checkbox"
        checked={checked}
        onChange={onChange}
        disabled={disabled}
        className="peer sr-only"
      />
      <span
        aria-hidden
        className={cn(
          "peer-focus-visible:ring-ring/50 flex size-7 shrink-0 items-center justify-center rounded-md border transition-colors duration-200 peer-focus-visible:ring-3",
          checked
            ? "bg-primary text-primary-foreground border-primary"
            : "border-input",
        )}
      >
        <Check
          className={cn(
            "size-4 transition-transform duration-200 motion-reduce:transition-none",
            checked ? "scale-100" : "scale-0",
          )}
        />
      </span>
      {children}
    </label>
  );
}
