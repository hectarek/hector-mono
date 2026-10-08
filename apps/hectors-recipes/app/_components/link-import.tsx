"use client";

import { Button } from "@repo/ui/components/button";
import { Field, FieldDescription, FieldLabel } from "@repo/ui/components/field";
import { Textarea } from "@repo/ui/components/textarea";
import Link from "next/link";
import { type FormEvent, useId, useState } from "react";
import { ReadingWait } from "@/app/_components/reading-wait";
import { RecipeForm } from "@/app/_components/recipe-form";
import { TopBar } from "@/app/_components/top-bar";
import { draftFormValues } from "@/app/_lib/draft-form-values";
import type { loadNewRecipe } from "@/app/_lib/new-recipe";
import { loneLink, pastedFrom } from "@/app/_lib/pasted-from";
import {
  type ReadRecipeResult,
  readRecipeFromLink,
  readRecipeFromText,
} from "@/app/actions/import";
import { DAILY_RECIPE_READS } from "@/src/entities/models/recipe-draft.model";

type Read = Extract<ReadRecipeResult, { draft: unknown }>;
type Stage =
  | { kind: "enter"; error?: string; linkFailed?: boolean }
  | { kind: "reading"; what: string }
  | { kind: "read"; result: Read };

// Add by link or text (ux-plan P10.3, D73): one box for a recipe's link or its whole text. A
// lone web address is read as a page (its own recipe data, else its text by the recipe
// reader); anything else goes to the reader as text. Either fills the new-recipe form to
// check. A page that won't be read can have its text pasted in its place, keeping the link as
// the recipe's source; a photo or file, or the form by hand, are a tap away.
export function LinkImport({
  form,
  choiceHref,
  manualHref,
  photoHref,
  readsLeft,
}: Awaited<ReturnType<typeof loadNewRecipe>>) {
  const [stage, setStage] = useState<Stage>({ kind: "enter" });
  const [box, setBox] = useState("");
  // The last link read, so text pasted after it still names its page.
  const [lastLink, setLastLink] = useState("");
  const boxId = useId();

  async function read(
    what: string,
    action: (data: FormData) => Promise<ReadRecipeResult>,
    data: FormData,
    isLink: boolean,
    sourceUrl?: string,
  ) {
    setStage({ kind: "reading", what });
    try {
      const result = await action(data);
      setStage(
        "draft" in result
          ? {
              kind: "read",
              result: sourceUrl ? { ...result, sourceUrl } : result,
            }
          : { kind: "enter", error: result.error, linkFailed: isLink },
      );
    } catch {
      setStage({
        kind: "enter",
        error:
          "Couldn't reach the server. Check your connection and try again.",
        linkFailed: isLink,
      });
    }
  }

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = new FormData();
    const link = loneLink(box);
    if (link) {
      setLastLink(link);
      data.set("url", box);
      void read("Reading the page", readRecipeFromLink, data, true);
    } else {
      data.set("text", box);
      void read(
        "Reading the recipe",
        readRecipeFromText,
        data,
        false,
        pastedFrom(lastLink),
      );
    }
  }

  if (stage.kind === "read") {
    const { draft, sourceUrl, imageUrl } = stage.result;
    const { values, review } = draftFormValues(draft, { sourceUrl, imageUrl });
    return (
      <RecipeForm
        mode="create"
        {...form}
        values={values}
        review={review}
        note={`Read from ${sourceUrl ? hostOf(sourceUrl) : "your text"}. Check it before saving.`}
      />
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <TopBar
        start={
          <Button
            variant="ghost"
            size="lg"
            nativeButton={false}
            render={<Link href={choiceHref} />}
            className="-ml-2"
          >
            Cancel
          </Button>
        }
        title="Add by link or text"
      />

      {stage.kind === "reading" ? (
        <ReadingWait>{stage.what}. This can take up to a minute.</ReadingWait>
      ) : (
        <div className="flex flex-col gap-6">
          <form onSubmit={submit} className="flex flex-col gap-4">
            <Field>
              <FieldLabel htmlFor={boxId}>
                The recipe&apos;s link, or its text
              </FieldLabel>
              <Textarea
                id={boxId}
                value={box}
                onChange={(event) => setBox(event.target.value)}
                rows={6}
                placeholder="https://… or its name, ingredients and method"
                autoComplete="off"
              />
              <FieldDescription>
                {readsLeft === 0
                  ? // A page's own recipe data is read without AI, so a link may still work (D48).
                    `You've read ${DAILY_RECIPE_READS} recipes with AI in the last day, the most for one day. A recipe site's link often still works, as its recipe can be read without AI. Pasted text waits until tomorrow.`
                  : "It's read into the form for you to check before saving."}
              </FieldDescription>
            </Field>
            <Button type="submit" size="lg" disabled={!box.trim()}>
              Read recipe
            </Button>
          </form>

          {stage.error && (
            <div className="flex flex-col gap-3">
              <p role="alert" className="text-destructive text-sm">
                {stage.error}
              </p>
              {stage.linkFailed && (
                <p className="text-muted-foreground text-sm">
                  You can copy the recipe&apos;s text from the page and paste it
                  above in place of the link.
                </p>
              )}
              <div className="grid grid-cols-2 gap-2">
                <Button
                  variant="secondary"
                  size="lg"
                  nativeButton={false}
                  render={<Link href={photoHref} />}
                >
                  Add by photo or file
                </Button>
                <Button
                  variant="secondary"
                  size="lg"
                  nativeButton={false}
                  render={<Link href={manualHref} />}
                >
                  Add manually
                </Button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function hostOf(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return url;
  }
}
