"use client";

import { Button } from "@repo/ui/components/button";
import { cn } from "@repo/ui/lib/utils";
import { Camera, FileText } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { type ChangeEvent, useRef, useState } from "react";
import { ReadingWait } from "@/app/_components/reading-wait";
import { RecipeForm } from "@/app/_components/recipe-form";
import { TopBar } from "@/app/_components/top-bar";
import { draftFormValues } from "@/app/_lib/draft-form-values";
import type { loadNewRecipe } from "@/app/_lib/new-recipe";
import {
  chosenFilesKind,
  RECIPE_FILE_ACCEPT,
  type RecipeFileKind,
} from "@/app/_lib/recipe-file";
import { photoShare, shrinkPhoto } from "@/app/_lib/shrink-photo";
import {
  type ReadRecipeResult,
  readRecipeFromDocument,
  readRecipeFromPhoto,
  readRecipeFromText,
} from "@/app/actions/import";
import type { CheckedDraft } from "@/src/entities/itemizing-check";
import {
  MAX_PDF_PAGES,
  MAX_PHOTO_BYTES,
  MAX_PHOTOS,
  MAX_RECIPE_TEXT,
} from "@/src/entities/models/recipe-draft.model";

type Stage =
  | { kind: "choose"; error?: string }
  | { kind: "reading"; previews: string[]; fileName: string }
  | { kind: "read"; draft: CheckedDraft; from: string };

type NewRecipe = Awaited<ReturnType<typeof loadNewRecipe>>;

const NOT_TAKEN = `Choose up to ${MAX_PHOTOS} photos, a PDF of up to ${MAX_PDF_PAGES} pages, or a Word, text or Markdown file.`;

// What a read was from, for the form's note ("Read from your photos.").
function readFrom(kind: RecipeFileKind, files: number): string {
  if (kind === "photo") return files > 1 ? "photos" : "photo";
  if (kind === "word") return "Word document";
  return kind === "pdf" ? "PDF" : "file";
}

// A PDF, sent as it is (D53): the reader counts its pages before reading it. One over the
// request limit is refused here, since the upload itself would fail.
async function readPdf(file: File): Promise<ReadRecipeResult> {
  if (file.size > MAX_PHOTO_BYTES) {
    return {
      error: "That PDF is over 4 MB. Screenshot the recipe's pages instead.",
    };
  }
  const data = new FormData();
  data.set("pdf", file);
  return readRecipeFromDocument(data);
}

// Up to MAX_PHOTOS photos of one recipe (D53), each shrunk on the phone (one image, or a long
// screenshot's pieces) within its share of the read, and sent in the order chosen.
async function readPhotos(files: File[]): Promise<ReadRecipeResult> {
  const share = photoShare(files.length);
  const photos = await Promise.all(
    files.map((file) => shrinkPhoto(file, share).catch(() => null)),
  );
  const data = new FormData();
  for (const [photo, pieces] of photos.entries()) {
    if (!pieces) {
      return {
        error: "Couldn't open that photo. Try a JPEG or PNG, or a screenshot.",
      };
    }
    for (const [piece, blob] of pieces.entries()) {
      data.append(
        `photo-${photo + 1}`,
        blob,
        `photo-${photo + 1}-${piece + 1}.jpg`,
      );
    }
  }
  return readRecipeFromPhoto(data);
}

// A text or Markdown file, read on the phone and sent as pasted text is (D53), so its draft is
// held to the file's own words.
async function readTextFile(file: File): Promise<ReadRecipeResult> {
  return readFileText((await file.text()).trim());
}

// A Word document (D74): its paragraphs, read on the phone, then sent as a text file is. The
// zip reader loads only when one is chosen.
async function readWordFile(file: File): Promise<ReadRecipeResult> {
  const { docxText } = await import("@/app/_lib/docx-text");
  const text = docxText(new Uint8Array(await file.arrayBuffer()));
  if (text === null) {
    return {
      error:
        "Couldn't open that Word document. Save it again, or save it as a PDF.",
    };
  }
  return readFileText(text);
}

async function readFileText(text: string): Promise<ReadRecipeResult> {
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
    const files = Array.from(event.target.files ?? []);
    // So choosing the same file again still counts as a change.
    event.target.value = "";
    const [file] = files;
    if (!file) return;
    const kind = chosenFilesKind(files);
    if (!kind) {
      setStage({ kind: "choose", error: NOT_TAKEN });
      return;
    }

    const previews =
      kind === "photo" ? files.map((photo) => URL.createObjectURL(photo)) : [];
    setStage({ kind: "reading", previews, fileName: file.name });
    try {
      const result =
        kind === "photo"
          ? await readPhotos(files)
          : kind === "pdf"
            ? await readPdf(file)
            : kind === "word"
              ? await readWordFile(file)
              : await readTextFile(file);
      setStage(
        "draft" in result
          ? {
              kind: "read",
              draft: result.draft,
              from: readFrom(kind, files.length),
            }
          : { kind: "choose", error: result.error },
      );
    } catch {
      setStage({
        kind: "choose",
        error:
          "Couldn't reach the server. Check your connection and try again.",
      });
    } finally {
      for (const preview of previews) URL.revokeObjectURL(preview);
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
        note={`Read from your ${stage.from}. Check it before saving.`}
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
        title="Add by photo or file"
      />

      {stage.kind === "reading" ? (
        <div className="flex flex-col items-center gap-4" aria-live="polite">
          {stage.previews.length > 0 ? (
            <div
              className={cn(
                "grid w-full gap-2",
                stage.previews.length === 2 && "grid-cols-2",
                stage.previews.length === 3 && "grid-cols-3",
              )}
            >
              {stage.previews.map((preview) => (
                <Image
                  key={preview}
                  src={preview}
                  alt=""
                  width={800}
                  height={800}
                  unoptimized
                  className="bg-muted h-auto max-h-80 w-full rounded-xl object-contain"
                />
              ))}
            </div>
          ) : (
            <p className="flex items-center gap-2 font-medium">
              <FileText aria-hidden className="size-5" />
              {stage.fileName}
            </p>
          )}
          <ReadingWait>
            Reading the recipe. This can take up to a minute.
          </ReadingWait>
        </div>
      ) : (
        <div className="flex flex-col gap-4">
          <p className="text-muted-foreground text-sm">
            Take or choose up to 3 photos of one recipe, such as cookbook pages
            or screenshots, or choose a PDF, a Word document, or a text or
            Markdown file. The recipe is read into the form for you to check
            before saving.
          </p>
          {/* Hidden, and opened by the button: an input that's only visually hidden still takes
              keyboard focus, which then lands on nothing you can see. */}
          <input
            ref={fileInput}
            type="file"
            accept={RECIPE_FILE_ACCEPT}
            multiple
            onChange={choose}
            hidden
          />
          <Button size="lg" onClick={() => fileInput.current?.click()}>
            <Camera data-icon="inline-start" />
            Choose a photo or file
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
