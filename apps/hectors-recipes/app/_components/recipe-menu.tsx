"use client";

import { Button } from "@repo/ui/components/button";
import { ChevronLeft, Copy, Pencil } from "lucide-react";
import Link from "next/link";
import { useActionState, useState } from "react";
import { BookSelect } from "@/app/_components/book-select";
import { ShareLinkButton } from "@/app/_components/share-link-button";
import { TitleMenu } from "@/app/_components/title-menu";
import { adoptRecipes } from "@/app/actions/spaces";

// A recipe's ⋯ sheet (ux-plan D72): what you can do with the recipe besides cooking, planning
// and shopping for it. Edit for its book's editors, Share for everyone (anyone signed in can
// open a recipe's link), and Copy to another book, which turns the sheet into its book
// picker, as Invite does.
export function RecipeMenu({
  recipeId,
  title,
  canEdit,
  copyTargets,
}: {
  recipeId: string;
  title: string;
  canEdit: boolean;
  // The other books they can copy it into.
  copyTargets: { id: string; name: string }[];
}) {
  const [copying, setCopying] = useState(false);
  const [state, formAction, isPending] = useActionState(adoptRecipes, null);

  return (
    <TitleMenu
      name={title}
      title={copying ? "Copy to another book" : title}
      description={
        copying
          ? "It's copied as its own recipe. Later changes to either one won't affect the other."
          : undefined
      }
      onOpenChange={(open) => {
        if (!open) setCopying(false);
      }}
    >
      {copying ? (
        <form action={formAction} className="flex flex-col gap-3">
          <input type="hidden" name="recipeId" value={recipeId} />
          <BookSelect targets={copyTargets} />
          {state?.error && (
            <p role="alert" className="text-destructive text-sm">
              {state.error}
            </p>
          )}
          <Button type="submit" size="lg" disabled={isPending}>
            {isPending ? "Copying…" : "Copy"}
          </Button>
          <Button
            type="button"
            variant="secondary"
            size="lg"
            onClick={() => setCopying(false)}
          >
            <ChevronLeft data-icon="inline-start" />
            Back
          </Button>
        </form>
      ) : (
        <>
          {canEdit && (
            <Button
              variant="secondary"
              size="lg"
              nativeButton={false}
              render={<Link href={`/recipes/${recipeId}/edit`} />}
            >
              <Pencil data-icon="inline-start" />
              Edit
            </Button>
          )}
          <ShareLinkButton
            path={`/recipes/${recipeId}`}
            title={title}
            label={{ share: "Share recipe", copy: "Copy recipe link" }}
          />
          {copyTargets.length > 0 && (
            <Button
              variant="secondary"
              size="lg"
              onClick={() => setCopying(true)}
            >
              <Copy data-icon="inline-start" />
              Copy to another book
            </Button>
          )}
        </>
      )}
    </TitleMenu>
  );
}
