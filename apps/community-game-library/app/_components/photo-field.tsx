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
import { PHOTO_FAILED_LINE } from "@/src/entities/profile-photo";

// A photo as the form sends it: a JPEG within 800px and 300 KB (shrink-image.ts).
async function shrunk(file: File): Promise<File> {
  return new File([await shrinkImage(file)], "photo.jpg", {
    type: "image/jpeg",
  });
}

function filesOf(photo: File): FileList {
  const files = new DataTransfer();
  files.items.add(photo);
  return files.files;
}

// A photo in a form (KTD11; A4, E6, B9, G3): choose one, see it, and the form sends it shrunk to a
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
  startWith,
  removable = false,
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
  // A picture the field starts with as if it had been chosen: A4's, the one a Google sign-up came
  // with (Hector, 2026-11-24). Fetched and shrunk like a chosen photo, so the form sends it as one;
  // one that can't be leaves the field empty. Google's picture host lets the browser read it.
  startWith?: string | null;
  // Remove photo, under a photo chosen and not sent yet (A4). E6 removes a saved photo itself.
  removable?: boolean;
  // The action's word on the photo it was sent.
  error?: string;
}) {
  const input = useRef<HTMLInputElement>(null);
  // The photo in the field, chosen or started with, which a cancelled choice puts back: Chrome
  // empties the field when its picker is cancelled.
  const kept = useRef<File | null>(null);
  // Once the member chooses or removes a photo, a starting picture that arrives late stays out.
  const touched = useRef(false);
  const labelId = useId();
  const [preview, setPreview] = useState<string>();
  const [failed, setFailed] = useState(false);

  useEffect(
    () => () => {
      if (preview) URL.revokeObjectURL(preview);
    },
    [preview],
  );

  useEffect(() => {
    if (!startWith) return;
    let current = true;
    (async () => {
      try {
        const response = await fetch(startWith);
        if (!response.ok) return;
        const blob = await response.blob();
        const photo = await shrunk(
          new File([blob], "picture", { type: blob.type }),
        );
        const field = input.current;
        if (!current || touched.current || !field) return;
        field.files = filesOf(photo);
        kept.current = photo;
        setPreview(URL.createObjectURL(photo));
      } catch {
        // Out of reach, or not a picture: the field starts empty, as for an email sign-up.
      }
    })();
    return () => {
      current = false;
    };
  }, [startWith]);

  async function choose(event: ChangeEvent<HTMLInputElement>) {
    const field = event.currentTarget;
    const file = field.files?.[0];
    if (!file) {
      if (kept.current) field.files = filesOf(kept.current);
      return;
    }
    touched.current = true;
    try {
      const photo = await shrunk(file);
      field.files = filesOf(photo);
      kept.current = photo;
      setFailed(false);
      setPreview(URL.createObjectURL(photo));
    } catch {
      field.value = "";
      kept.current = null;
      setFailed(true);
      setPreview(undefined);
    }
  }

  function remove() {
    touched.current = true;
    kept.current = null;
    if (input.current) input.current.value = "";
    setFailed(false);
    setPreview(undefined);
  }

  const shown = preview ?? photoUrl ?? undefined;
  const line = failed ? PHOTO_FAILED_LINE : error;
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

  // Remove photo sits after the field, where E6 puts its own: the field stretches each part of it
  // to its full width.
  return (
    <>
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
      {removable && preview && (
        <Button
          type="button"
          variant="link"
          className="self-start"
          onClick={remove}
        >
          Remove photo
        </Button>
      )}
    </>
  );
}
