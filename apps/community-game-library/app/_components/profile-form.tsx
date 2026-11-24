"use client";

import { Button } from "@repo/ui/components/button";
import {
  Field,
  FieldDescription,
  FieldError,
  FieldLabel,
} from "@repo/ui/components/field";
import { Input } from "@repo/ui/components/input";
import { useRouter } from "next/navigation";
import { useActionState, useEffect, useRef, useState } from "react";
import { Group } from "@/app/_components/group";
import { PhotoField } from "@/app/_components/photo-field";
import { Piece } from "@/app/_components/piece";
import { PiecePicker } from "@/app/_components/piece-picker";
import { callAction } from "@/app/_lib/call-action";
import { useLeaveGuard } from "@/app/_lib/leave-guard";
import { notify, notifyNotSent } from "@/app/_lib/notify";
import type { ActionState } from "@/app/actions/shared";
import type { NameAndPiece } from "@/src/entities/models/user-profile.model";
import type { PieceColor, PieceShape } from "@/src/entities/piece";

type ProfileAction = (
  state: ActionState,
  formData: FormData,
) => Promise<ActionState>;

export type ProfileValues = {
  name: string;
  phone: string;
  shape: PieceShape;
  color: PieceColor;
};

// A4 (Next, to the home-screen step) and E6 (Save, back to You with "Profile saved."): one form for the name, photo,
// phone and playing piece (R40, R51). What's typed stays when a send fails, since the fields
// are the form's own state, and a send that never reached the server says "That didn't send."
// with Try again. In E6 the leave guard asks before leaving unsaved changes.
export function ProfileForm({
  mode,
  action,
  initial,
  photoUrl,
  startingPhoto,
  removePhoto,
  taken,
  next = mode === "edit" ? "/you" : "/start/home-screen",
}: {
  mode: "start" | "edit";
  action: ProfileAction;
  initial: ProfileValues;
  photoUrl?: string | null;
  // A4's photo to start with, as if chosen: the picture a Google sign-up came with.
  startingPhoto?: string | null;
  // E6's way to take the photo away, when there is one.
  removePhoto?: () => Promise<ActionState>;
  // The friends' pieces, "Taken by your friends"; nothing draws when there are none.
  taken: NameAndPiece[];
  // Where the form goes once saved: You, or setting up's next step (A5 after a friend link).
  next?: string;
}) {
  const router = useRouter();
  const form = useRef<HTMLFormElement>(null);
  const [name, setName] = useState(initial.name);
  const [phone, setPhone] = useState(initial.phone);
  const [shape, setShape] = useState(initial.shape);
  const [color, setColor] = useState(initial.color);
  const [state, submit, pending] = useActionState(
    async (previous: ActionState, formData: FormData) => {
      try {
        return await action(previous, formData);
      } catch {
        notifyNotSent(() => form.current?.requestSubmit());
        return previous;
      }
    },
    null,
  );
  const saved = state?.message !== undefined;
  const changed =
    name !== initial.name ||
    phone !== initial.phone ||
    shape !== initial.shape ||
    color !== initial.color;
  useLeaveGuard(mode === "edit" && changed && !saved);

  useEffect(() => {
    if (state?.message) {
      if (mode === "edit") notify(state.message);
      router.push(next);
    }
  }, [state, mode, router, next]);

  async function takePhotoAway() {
    const error = removePhoto ? await callAction(removePhoto) : undefined;
    notify(error ?? "Photo removed.");
  }

  return (
    <form ref={form} action={submit} className="flex flex-col gap-3" noValidate>
      <Group label="About you">
        <div className="flex flex-col gap-3">
          <Field data-invalid={state?.fields?.name ? "true" : undefined}>
            <FieldLabel htmlFor="profile-name">Name</FieldLabel>
            <Input
              id="profile-name"
              name="name"
              autoComplete="name"
              value={name}
              onChange={(event) => setName(event.target.value)}
              aria-invalid={state?.fields?.name ? true : undefined}
            />
            <FieldDescription>The name your friends see.</FieldDescription>
            {state?.fields?.name && (
              <FieldError>{state.fields.name}</FieldError>
            )}
          </Field>

          <PhotoField
            name="photo"
            optional
            photoUrl={photoUrl}
            startWith={startingPhoto}
            removable={mode === "start"}
            help="Shown on your page. Everywhere else your piece stands for you."
            error={state?.fields?.photo}
          />
          {mode === "edit" && photoUrl && (
            <Button
              type="button"
              variant="link"
              className="self-start"
              onClick={takePhotoAway}
            >
              Remove photo
            </Button>
          )}

          <Field data-invalid={state?.fields?.phone ? "true" : undefined}>
            <FieldLabel htmlFor="profile-phone">
              <span>
                Phone
                <span data-ink="smudge" className="font-normal">
                  {" · optional"}
                </span>
              </span>
            </FieldLabel>
            <Input
              id="profile-phone"
              name="phone"
              type="tel"
              autoComplete="tel"
              value={phone}
              onChange={(event) => setPhone(event.target.value)}
              aria-invalid={state?.fields?.phone ? true : undefined}
            />
            <FieldDescription>
              Only your friends, and the other person in a loan, see it.
            </FieldDescription>
            {state?.fields?.phone && (
              <FieldError>{state.fields.phone}</FieldError>
            )}
          </Field>
        </div>
      </Group>

      <Group label="Your playing piece">
        <div className="flex flex-col gap-3">
          <div className="flex items-center gap-3.5">
            <Piece shape={shape} color={color} size={36} />
            <p className="text-13 leading-snug text-muted-foreground">
              This piece stands for you in the app: in a seat, in a line, next
              to a loan.
            </p>
          </div>
          <PiecePicker
            shape={shape}
            color={color}
            onShape={setShape}
            onColor={setColor}
          />
          {taken.length > 0 && (
            <div className="flex flex-col gap-2 border-t-2 border-dashed border-foreground pt-3">
              <span
                data-ink="smudge"
                className="font-mono text-2xs font-medium tracking-wider uppercase"
              >
                Taken by your friends
              </span>
              <ul className="flex flex-wrap items-end gap-4.5">
                {taken.map((friend) => (
                  <li
                    key={friend.userId}
                    className="flex flex-col items-center gap-1"
                  >
                    <Piece
                      shape={friend.pieceShape}
                      color={friend.pieceColor}
                      size={16}
                    />
                    <span
                      data-ink="smudge"
                      className="font-mono text-10 font-medium uppercase"
                    >
                      {friend.name}
                    </span>
                  </li>
                ))}
              </ul>
              <p className="text-xs text-muted-foreground">
                Two friends can share a piece. Names always show beside it.
              </p>
            </div>
          )}
        </div>
      </Group>

      {state?.error && !state.fields && (
        <p role="alert" className="text-13 font-semibold text-destructive">
          {state.error}
        </p>
      )}
      <Button size="lg" type="submit" disabled={pending}>
        {mode === "start" ? "Next" : "Save"}
      </Button>
    </form>
  );
}
