"use client";

import { Button } from "@repo/ui/components/button";
import { Field, FieldLabel } from "@repo/ui/components/field";
import { Input } from "@repo/ui/components/input";
import { Spinner } from "@repo/ui/components/spinner";
import { Textarea } from "@repo/ui/components/textarea";
import Link from "next/link";
import { type FormEvent, useId, useState } from "react";
import { RecipeForm } from "@/app/_components/recipe-form";
import { TopBar } from "@/app/_components/top-bar";
import { draftFormValues } from "@/app/_lib/draft-form-values";
import type { loadNewRecipe } from "@/app/_lib/new-recipe";
import { pastedFrom } from "@/app/_lib/pasted-from";
import {
  type ReadRecipeResult,
  readRecipeFromLink,
  readRecipeFromText,
} from "@/app/actions/import";

type Read = Extract<ReadRecipeResult, { draft: unknown }>;
type Stage =
  | { kind: "enter"; error?: string; pasting: boolean }
  | { kind: "reading"; what: string }
  | { kind: "read"; result: Read };

// Add by link (ux-plan P10.3): the page's own recipe data, or its text read by the recipe
// reader, fills the new-recipe form to check. A site that won't be read gets its text pasted
// instead (D34), a photo or file, or the form by hand.
export function LinkImport({
  form,
  choiceHref,
  manualHref,
  photoHref,
}: Awaited<ReturnType<typeof loadNewRecipe>>) {
  const [stage, setStage] = useState<Stage>({ kind: "enter", pasting: false });
  const [url, setUrl] = useState("");
  const [pasted, setPasted] = useState("");
  const urlId = useId();
  const textId = useId();

  // `sourceUrl` is for text pasted from a page: it still came from there.
  async function read(
    what: string,
    action: (data: FormData) => Promise<ReadRecipeResult>,
    data: FormData,
    pasting: boolean,
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
          : { kind: "enter", error: result.error, pasting },
      );
    } catch {
      setStage({
        kind: "enter",
        error:
          "Couldn't reach the server. Check your connection and try again.",
        pasting,
      });
    }
  }

  function readLink(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = new FormData();
    data.set("url", url);
    void read("Reading the page", readRecipeFromLink, data, false);
  }

  function readText(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = new FormData();
    data.set("text", pasted);
    void read(
      "Reading the recipe",
      readRecipeFromText,
      data,
      true,
      pastedFrom(url),
    );
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
        title="Add by link"
      />

      {stage.kind === "reading" ? (
        <p
          className="text-muted-foreground flex items-center justify-center gap-2 py-8 text-sm"
          aria-live="polite"
        >
          <Spinner />
          {stage.what}. This can take up to a minute.
        </p>
      ) : (
        <div className="flex flex-col gap-6">
          {/* No browser check: "budgetbytes.com/…" without https:// is fine here. */}
          <form onSubmit={readLink} noValidate className="flex flex-col gap-4">
            <Field>
              <FieldLabel htmlFor={urlId}>Link to the recipe</FieldLabel>
              <Input
                id={urlId}
                type="url"
                inputMode="url"
                value={url}
                onChange={(event) => setUrl(event.target.value)}
                placeholder="https://"
                autoComplete="off"
              />
            </Field>
            <Button type="submit" size="lg" disabled={!url.trim()}>
              Read recipe
            </Button>
          </form>

          {stage.error && (
            <div className="flex flex-col gap-3">
              <p role="alert" className="text-destructive text-sm">
                {stage.error}
              </p>
              {stage.pasting ? null : (
                <Button
                  variant="secondary"
                  size="lg"
                  onClick={() => setStage({ ...stage, pasting: true })}
                >
                  Paste the recipe&apos;s text instead
                </Button>
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

          {stage.pasting && (
            <form onSubmit={readText} className="flex flex-col gap-4">
              <Field>
                <FieldLabel htmlFor={textId}>The recipe&apos;s text</FieldLabel>
                <Textarea
                  id={textId}
                  value={pasted}
                  onChange={(event) => setPasted(event.target.value)}
                  rows={8}
                  placeholder="Its name, ingredients and method, copied from the page."
                />
              </Field>
              <Button type="submit" size="lg" disabled={!pasted.trim()}>
                Read text
              </Button>
            </form>
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
