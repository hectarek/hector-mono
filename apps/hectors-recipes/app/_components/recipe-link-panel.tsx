"use client";

import { Button } from "@repo/ui/components/button";
import { ChevronLeft } from "lucide-react";
import { useState, useTransition } from "react";
import { ShareLinkButton } from "@/app/_components/share-link-button";
import { callAction } from "@/app/_lib/call-action";
import { setRecipeLink } from "@/app/actions/recipes";

// A recipe's view-only public link (docs/ux-plan.md D98), in its ⋯ sheet for those who can
// edit it: turn it on, share it, or turn it off, which asks first in the sheet, as Clear
// meal plan does (D91). The page comes back with the link after each change.
export function RecipeLinkPanel({
  recipeId,
  title,
  shareToken,
  onBack,
}: {
  recipeId: string;
  title: string;
  shareToken: string | null;
  onBack: () => void;
}) {
  const [asking, setAsking] = useState(false);
  const [error, setError] = useState<string>();
  const [isPending, startTransition] = useTransition();

  function setShared(shared: boolean) {
    startTransition(async () => {
      const failed = await callAction(() => setRecipeLink(recipeId, shared));
      setError(failed);
      if (!failed) setAsking(false);
    });
  }

  const back = (
    <Button variant="secondary" size="lg" onClick={onBack}>
      <ChevronLeft data-icon="inline-start" />
      Back
    </Button>
  );
  const failure = error && (
    <p role="alert" className="text-destructive text-sm">
      {error}
    </p>
  );

  if (!shareToken) {
    return (
      <>
        {failure}
        <Button size="lg" disabled={isPending} onClick={() => setShared(true)}>
          {isPending ? "Turning on…" : "Turn on view-only link"}
        </Button>
        {back}
      </>
    );
  }

  if (asking) {
    return (
      // The border is on a wrapper: a legend is drawn into its own fieldset's border.
      <div className="rounded-xl border p-3">
        <fieldset className="flex flex-col gap-3">
          <legend className="mb-3 font-medium">
            Turn off the view-only link?
          </legend>
          <p className="text-muted-foreground text-sm">
            It stops working for everyone who has it. Turning it on again makes
            a new link.
          </p>
          {failure}
          <div className="grid grid-cols-2 gap-2">
            <Button
              variant="secondary"
              size="lg"
              onClick={() => {
                setAsking(false);
                setError(undefined);
              }}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              size="lg"
              disabled={isPending}
              onClick={() => setShared(false)}
            >
              {isPending ? "Turning off…" : "Turn off"}
            </Button>
          </div>
        </fieldset>
      </div>
    );
  }

  return (
    <>
      <ShareLinkButton
        path={`/shared/${shareToken}`}
        title={title}
        label={{ share: "Share view-only link", copy: "Copy view-only link" }}
        variant="default"
      />
      <Button variant="secondary" size="lg" onClick={() => setAsking(true)}>
        Turn off link
      </Button>
      {back}
    </>
  );
}
