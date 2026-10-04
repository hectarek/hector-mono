"use client";

import { Button } from "@repo/ui/components/button";
import { Spinner } from "@repo/ui/components/spinner";
import { Camera, FileText } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { type ChangeEvent, useRef, useState } from "react";
import { RecipeForm } from "@/app/_components/recipe-form";
import { TopBar } from "@/app/_components/top-bar";
import { draftFormValues } from "@/app/_lib/draft-form-values";
import type { loadNewRecipe } from "@/app/_lib/new-recipe";
import {
  RECIPE_FILE_ACCEPT,
  type RecipeFileKind,
  recipeFileKind,
} from "@/app/_lib/recipe-file";
import { shrinkPhoto } from "@/app/_lib/shrink-photo";
import {
  type ReadRecipeResult,
  readRecipeFromPhoto,
  readRecipeFromText,
} from "@/app/actions/import";
import type { CheckedDraft } from "@/src/entities/itemizing-check";
import { MAX_RECIPE_TEXT } from "@/src/entities/models/recipe-draft.model";

type Stage =
  | { kind: "choose"; error?: string }
  | { kind: "reading"; preview?: string; fileName: string }
  | { kind: "read"; draft: CheckedDraft; from: RecipeFileKind };

type NewRecipe = Awaited<ReturnType<typeof loadNewRecipe>>;

const NOT_TAKEN = "Choose a photo, or a text or Markdown file.";

// A photo, shrunk on the phone (one image, or a long screenshot's pieces), for the reader.
async function readPhoto(file: File): Promise<ReadRecipeResult> {
  const pieces = await shrinkPhoto(file).catch(() => null);
  if (!pieces) {
    return {
      error: "Couldn't open that photo. Try a JPEG or PNG, or a screenshot.",
    };
  }
  const data = new FormData();
  for (const [index, piece] of pieces.entries()) {
    data.append("photo", piece, `photo-${index + 1}.jpg`);
  }
  return readRecipeFromPhoto(data);
}

// A text or Markdown file, read on the phone and sent as pasted text is (D53), so its draft is
// held to the file's own words.
async function readTextFile(file: File): Promise<ReadRecipeResult> {
  const text = (await file.text()).trim();
  if (!text) {
    return { error: "That file is empty." };
  }
  if (text.length > MAX_RECIPE_TEXT) {
    return { error: "That file has too much text to be one recipe." };
  }
  const data = new FormData();
  data.set("text", text);
  return readRecipeFromText(data);
}

// Add by photo (ux-plan P10.2) or file (D53): a cookbook page, a screenshot, or a text or
// Markdown file, read by the recipe reader, then the new-recipe form filled in to check.
// Nothing is saved until Save, and the photo or file itself isn't kept.
export function PhotoImport({ form, choiceHref, manualHref }: NewRecipe) {
  const [stage, setStage] = useState<Stage>({ kind: "choose" });
  const fileInput = useRef<HTMLInputElement>(null);

  async function choose(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    // So choosing the same file again still counts as a change.
    event.target.value = "";
    if (!file) return;
    const kind = recipeFileKind(file);
    if (!kind) {
      setStage({ kind: "choose", error: NOT_TAKEN });
      return;
    }

    const preview = kind === "photo" ? URL.createObjectURL(file) : undefined;
    setStage({ kind: "reading", preview, fileName: file.name });
    try {
      const result =
        kind === "photo" ? await readPhoto(file) : await readTextFile(file);
      setStage(
        "draft" in result
          ? { kind: "read", draft: result.draft, from: kind }
          : { kind: "choose", error: result.error },
      );
    } catch {
      setStage({
        kind: "choose",
        error:
          "Couldn't reach the server. Check your connection and try again.",
      });
    } finally {
      if (preview) URL.revokeObjectURL(preview);
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
        note={`Read from your ${stage.from === "photo" ? "photo" : "file"}. Check it before saving.`}
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
          {stage.preview ? (
            <Image
              src={stage.preview}
              alt=""
              width={800}
              height={800}
              unoptimized
              className="bg-muted h-auto max-h-80 w-full rounded-xl object-contain"
            />
          ) : (
            <p className="flex items-center gap-2 font-medium">
              <FileText aria-hidden className="size-5" />
              {stage.fileName}
            </p>
          )}
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
            accept={RECIPE_FILE_ACCEPT}
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
