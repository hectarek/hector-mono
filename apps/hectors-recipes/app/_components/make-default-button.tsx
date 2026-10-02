"use client";

import { Button } from "@repo/ui/components/button";
import { Star } from "lucide-react";
import { ActionForm } from "@/app/_components/action-form";
import { setDefaultSpace } from "@/app/actions/spaces";
import type { SpaceType } from "@/src/entities/models/space.model";

// In a plan's ⋯ sheet (D42), when they're in two or more plans (D14).
export function MakeDefaultButton({
  type,
  spaceId,
}: {
  type: SpaceType;
  spaceId: string;
}) {
  return (
    <ActionForm action={setDefaultSpace} fields={{ type, spaceId }}>
      {({ isPending }) => (
        <Button
          type="submit"
          variant="secondary"
          size="lg"
          disabled={isPending}
        >
          <Star data-icon="inline-start" />
          {isPending ? "Saving…" : "Make my default plan"}
        </Button>
      )}
    </ActionForm>
  );
}
