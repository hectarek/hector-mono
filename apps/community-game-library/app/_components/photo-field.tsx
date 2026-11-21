"use client";

import { Button } from "@repo/ui/components/button";
import {
  Field,
  FieldDescription,
  FieldError,
  FieldTitle,
} from "@repo/ui/components/field";
import { cn } from "@repo/ui/lib/utils";
import Image from "next/image";
import { type ChangeEvent, useEffect, useId, useRef, useState } from "react";
import { CameraIcon } from "@/app/_components/icons";
import { shrinkImage } from "@/app/_lib/shrink-image";

const FAILED = "That photo didn’t upload. Try a smaller one.";

// A photo in a form (KTD11; E6, B9, G3): choose one, see it, and the form sends it shrunk to a
// JPEG within 800px and 300 KB (shrink-image.ts), under the field's `name`. Round for a member's
// photo; a box for a game's box or cover. A photo the phone can't open or shrink, or one the
// action refuses (`error`), gets the line "That photo didn't upload. Try a smaller one." under
// it, and nothing is sent for it.
export function PhotoField({
  name,
  label = "Photo",
  optional = false,
  help,
  chooseLabel = "Choose a photo",
  shape = "round",
  photoUrl,
  error,
}: {
  name: string;
  label?: string;
  optional?: boolean;
  help?: string;
  chooseLabel?: string;
  shape?: "round" | "box";
  // The photo already saved, if any.
  photoUrl?: string | null;
  // The action's word on the photo it was sent.
  error?: string;
}) {
  const input = useRef<HTMLInputElement>(null);
  const labelId = useId();
  const [preview, setPreview] = useState<string>();
  const [failed, setFailed] = useState(false);

  useEffect(
    () => () => {
      if (preview) URL.revokeObjectURL(preview);
    },
    [preview],
  );

  async function choose(event: ChangeEvent<HTMLInputElement>) {
    const field = event.currentTarget;
    const file = field.files?.[0];
    if (!file) return;
    try {
      const photo = new File([await shrinkImage(file)], "photo.jpg", {
        type: "image/jpeg",
      });
      const chosen = new DataTransfer();
      chosen.items.add(photo);
      field.files = chosen.files;
      setFailed(false);
      setPreview(URL.createObjectURL(photo));
    } catch {
      field.value = "";
      setFailed(true);
      setPreview(undefined);
    }
  }

  const shown = preview ?? photoUrl ?? undefined;
  const line = failed ? FAILED : error;
  const picture = shown ? (
    <Image
      src={shown}
      alt=""
      fill
      unoptimized
      className={shape === "box" ? "object-contain" : "object-cover"}
    />
  ) : (
    <CameraIcon className="size-6" />
  );
  const button = (
    <Button
      type="button"
      variant="secondary"
      aria-describedby={labelId}
      onClick={() => input.current?.click()}
    >
      {chooseLabel}
    </Button>
  );

  return (
    <Field data-invalid={line ? "true" : undefined}>
      <FieldTitle id={labelId}>
        <span>
          {label}
          {optional && (
            <span data-ink="smudge" className="font-normal">
              {" · optional"}
            </span>
          )}
        </span>
      </FieldTitle>
      {shape === "round" ? (
        <div className="flex items-center gap-3.5">
          <span
            aria-hidden="true"
            className={cn(
              "relative flex size-18 shrink-0 items-center justify-center overflow-hidden rounded-full border-2 border-foreground bg-secondary",
              !shown && "border-dashed",
            )}
          >
            {picture}
          </span>
          {button}
        </div>
      ) : (
        <div className="flex flex-col items-center gap-2 rounded-lg border-2 border-dashed border-foreground p-3.5">
          <span
            aria-hidden="true"
            className={cn(
              "relative flex items-center justify-center",
              shown && "h-40 w-full",
            )}
          >
            {picture}
          </span>
          {button}
        </div>
      )}
      <input
        ref={input}
        type="file"
        name={name}
        accept="image/*"
        tabIndex={-1}
        aria-hidden="true"
        className="sr-only"
        onChange={choose}
      />
      {help && <FieldDescription>{help}</FieldDescription>}
      {line && <FieldError>{line}</FieldError>}
    </Field>
  );
}
