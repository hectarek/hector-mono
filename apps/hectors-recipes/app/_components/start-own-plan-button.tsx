"use client";

import { Button } from "@repo/ui/components/button";
import { CalendarPlus } from "lucide-react";
import { ActionForm } from "@/app/_components/action-form";
import { startOwnPlan } from "@/app/actions/spaces";

// In a plan's ⋯ sheet (D42), when they own no plan (D16).
export function StartOwnPlanButton() {
  return (
    <ActionForm action={startOwnPlan} fields={{}}>
      {({ isPending }) => (
        <Button
          type="submit"
          variant="secondary"
          size="lg"
          disabled={isPending}
        >
          <CalendarPlus data-icon="inline-start" />
          {isPending ? "Starting…" : "Start my own meal plan"}
        </Button>
      )}
    </ActionForm>
  );
}
