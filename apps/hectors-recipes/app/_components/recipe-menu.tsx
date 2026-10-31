"use client";

import { Button } from "@repo/ui/components/button";
import { ChevronLeft, Copy, Globe, Pencil } from "lucide-react";
import Link from "next/link";
import { useActionState, useState } from "react";
import { BookSelect } from "@/app/_components/book-select";
import { RecipeLinkPanel } from "@/app/_components/recipe-link-panel";
import { ShareLinkButton } from "@/app/_components/share-link-button";
import { TitleMenu } from "@/app/_components/title-menu";
import { adoptRecipes } from "@/app/actions/spaces";

// What the view-only link view says, before the link is on and after (D98, D99).
const LINK_DESCRIPTION = {
  off: "Make a link anyone can open without an account, to read this recipe and change its servings. They can't change anything.",
  on: "Anyone with this link can read the recipe and change its servings, without an account. They can't change anything.",
};

// A recipe's ⋯ sheet (ux-plan D72): what you can do with the recipe besides cooking, planning
// and shopping for it. Edit for its book's editors, Share for everyone (anyone signed in can
// open a recipe's link), View-only link for editors (D98: a link for people without an
// account), and Copy to another book. View-only link and Copy turn the sheet into their own
// view, as Invite does.
export function RecipeMenu({
  recipeId,
  title,
  canEdit,
  shareToken,
  copyTargets,
}: {
  recipeId: string;
  title: string;
  canEdit: boolean;
  // Its view-only link's token while it's on; only those who can edit get it.
  shareToken: string | null;
  // The other books they can copy it into.
  copyTargets: { id: string; name: string }[];
}) {
  const [view, setView] = useState<"menu" | "copy" | "link">("menu");
  const [state, formAction, isPending] = useActionState(adoptRecipes, null);
  const copying = view === "copy";

  return (
    <TitleMenu
      name={title}
      title={
        copying
          ? "Copy to another book"
          : view === "link"
            ? "View-only link"
            : title
      }
      description={
        copying
          ? "It's copied as its own recipe. Later changes to either one won't affect the other."
          : view === "link"
            ? LINK_DESCRIPTION[shareToken ? "on" : "off"]
            : undefined
      }
      onOpenChange={(open) => {
        if (!open) setView("menu");
      }}
    >
      {view === "link" ? (
        <RecipeLinkPanel
          recipeId={recipeId}
          title={title}
          shareToken={shareToken}
          onBack={() => setView("menu")}
        />
      ) : copying ? (
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
            onClick={() => setView("menu")}
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
          {canEdit && (
            <Button
              variant="secondary"
              size="lg"
              onClick={() => setView("link")}
            >
              <Globe data-icon="inline-start" />
              View-only link
            </Button>
          )}
          {copyTargets.length > 0 && (
            <Button
              variant="secondary"
              size="lg"
              onClick={() => setView("copy")}
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
