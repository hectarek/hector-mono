"use client";

import { Button } from "@repo/ui/components/button";
import { Spinner } from "@repo/ui/components/spinner";
import { Camera } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { type ChangeEvent, useRef, useState } from "react";
import { RecipeForm } from "@/app/_components/recipe-form";
import { TopBar } from "@/app/_components/top-bar";
import { draftFormValues } from "@/app/_lib/draft-form-values";
import type { loadNewRecipe } from "@/app/_lib/new-recipe";
import { shrinkPhoto } from "@/app/_lib/shrink-photo";
import { readRecipeFromPhoto } from "@/app/actions/import";
import type { CheckedDraft } from "@/src/entities/itemizing-check";

type Stage =
  | { kind: "choose"; error?: string }
  | { kind: "reading"; preview: string }
  | { kind: "read"; draft: CheckedDraft };

type NewRecipe = Awaited<ReturnType<typeof loadNewRecipe>>;

// Add by photo (ux-plan P10.2): a cookbook page or a screenshot, shrunk on the phone, read by
// the recipe reader, then the new-recipe form filled in to check. Nothing is saved until Save,
// and the photo itself isn't kept.
export function PhotoImport({ form, choiceHref, manualHref }: NewRecipe) {
  const [stage, setStage] = useState<Stage>({ kind: "choose" });
  const fileInput = useRef<HTMLInputElement>(null);

  async function choose(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    // So choosing the same photo again still counts as a change.
    event.target.value = "";
    if (!file) return;

    const preview = URL.createObjectURL(file);
    setStage({ kind: "reading", preview });
    try {
      const pieces = await shrinkPhoto(file).catch(() => null);
      if (!pieces) {
        setStage({
          kind: "choose",
          error:
            "Couldn't open that photo. Try a JPEG or PNG, or a screenshot.",
        });
        return;
      }
      const data = new FormData();
      for (const [index, piece] of pieces.entries()) {
        data.append("photo", piece, `photo-${index + 1}.jpg`);
      }
      const result = await readRecipeFromPhoto(data);
      setStage(
        "draft" in result
          ? { kind: "read", draft: result.draft }
          : { kind: "choose", error: result.error },
      );
    } catch {
      setStage({
        kind: "choose",
        error:
          "Couldn't reach the server. Check your connection and try again.",
      });
    } finally {
      URL.revokeObjectURL(preview);
    }
  }

  if (stage.kind === "read") {
    const { values, review } = draftFormValues(stage.draft);
    return (
      <RecipeForm
        mode="create"
        {...form}
        values={values}
        review={review}
        note="Read from your photo. Check it before saving."
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
        title="Add by photo"
      />

      {stage.kind === "reading" ? (
        <div className="flex flex-col items-center gap-4" aria-live="polite">
          <Image
            src={stage.preview}
            alt=""
            width={800}
            height={800}
            unoptimized
            className="bg-muted h-auto max-h-80 w-full rounded-xl object-contain"
          />
          <p className="text-muted-foreground flex items-center gap-2 text-sm">
            <Spinner />
            Reading the recipe. This can take up to a minute.
          </p>
        </div>
      ) : (
        <div className="flex flex-col gap-4">
          <p className="text-muted-foreground text-sm">
            Take a photo of a cookbook page, or choose a screenshot. The recipe
            is read into the form for you to check before saving.
          </p>
          {/* Hidden, and opened by the button: an input that's only visually hidden still takes
              keyboard focus, which then lands on nothing you can see. */}
          <input
            ref={fileInput}
            type="file"
            accept="image/*"
            onChange={choose}
            hidden
          />
          <Button size="lg" onClick={() => fileInput.current?.click()}>
            <Camera data-icon="inline-start" />
            Choose a photo
          </Button>
          {stage.error && (
            <div className="flex flex-col gap-3">
              <p role="alert" className="text-destructive text-sm">
                {stage.error}
              </p>
              <Button
                variant="secondary"
                size="lg"
                nativeButton={false}
                render={<Link href={manualHref} />}
              >
                Add manually instead
              </Button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
