"use client";

import { Switch } from "@repo/ui/components/switch";
import { useId, useState, useTransition } from "react";
import { callAction } from "@/app/_lib/call-action";
import { notify } from "@/app/_lib/notify";
import type { ActionState } from "@/app/actions/shared";

// A switch that saves as it flips (screens.md, Flip a switch): "Saved.", or, when the save
// fails, back as it was with what went wrong. Its words sit on the left and the switch on the
// right (B6, B7). The label holds both lines and fills the row's 44px, so a tap anywhere on the
// words flips it; it sits beside the switch, not around it, since a Base UI switch inside its
// label flips twice on a click in happy-dom. The switch is named by the first line alone.
export function SavedSwitch({
  label,
  help,
  on,
  save,
}: {
  label: string;
  // A line under the words, saying what on and off mean.
  help?: string;
  on: boolean;
  save: (on: boolean) => Promise<ActionState>;
}) {
  const [checked, setChecked] = useState(on);
  const [, startTransition] = useTransition();
  const switchId = useId();
  const labelId = useId();
  const helpId = useId();

  function flip(next: boolean) {
    setChecked(next);
    startTransition(async () => {
      const error = await callAction(() => save(next));
      if (error) {
        setChecked(!next);
        notify(error);
      } else {
        notify("Saved.");
      }
    });
  }

  return (
    <div className="flex items-center justify-between gap-2.5">
      <label
        htmlFor={switchId}
        className="flex min-h-11 flex-1 flex-col justify-center gap-0.5"
      >
        <span id={labelId} className="text-15">
          {label}
        </span>
        {help && (
          <span
            id={helpId}
            className="text-xs leading-snug text-muted-foreground"
          >
            {help}
          </span>
        )}
      </label>
      <Switch
        id={switchId}
        checked={checked}
        onCheckedChange={flip}
        aria-labelledby={labelId}
        aria-describedby={help ? helpId : undefined}
      />
    </div>
  );
}
