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
import { useLeaveGuard } from "@/app/_lib/leave-guard";
import { notify, notifyNotSent } from "@/app/_lib/notify";
import type { ActionState } from "@/app/actions/shared";
import { suggestGame } from "@/app/actions/suggestions";

const optional = (
  <span data-ink="smudge" className="font-normal">
    {" · optional"}
  </span>
);

// B9's form: the title, filled with what was searched, then what else the member knows, and a
// photo of the box. Send says "Suggestion sent." and opens My library, where it waits on the
// admin. Leaving with something typed asks first.
export function SuggestForm({ title }: { title: string }) {
  const router = useRouter();
  const form = useRef<HTMLFormElement>(null);
  const [typed, setTyped] = useState(false);
  const [state, submit, pending] = useActionState(
    async (previous: ActionState, formData: FormData) => {
      try {
        return await suggestGame(previous, formData);
      } catch {
        notifyNotSent(() => form.current?.requestSubmit());
        return previous;
      }
    },
    null,
  );
  const sent = state?.message !== undefined;
  useLeaveGuard(typed && !sent);

  useEffect(() => {
    if (state?.message) {
      notify(state.message);
      router.push("/my-library");
    }
  }, [state, router]);

  const field = (name: string) => state?.fields?.[name];
  return (
    <form
      ref={form}
      action={submit}
      onChange={() => setTyped(true)}
      className="flex flex-col gap-3"
      noValidate
    >
      <Group label="The game">
        <div className="flex flex-col gap-3">
          <Field data-invalid={field("title") ? "true" : undefined}>
            <FieldLabel htmlFor="suggest-title">Title</FieldLabel>
            <Input id="suggest-title" name="title" defaultValue={title} />
            {field("title") && <FieldError>{field("title")}</FieldError>}
          </Field>
          <Field data-invalid={field("year") ? "true" : undefined}>
            <FieldLabel htmlFor="suggest-year">
              <span>Year{optional}</span>
            </FieldLabel>
            <Input id="suggest-year" name="year" inputMode="numeric" />
            {field("year") && <FieldError>{field("year")}</FieldError>}
          </Field>
          <Field>
            <FieldLabel htmlFor="suggest-publisher">
              <span>Publisher{optional}</span>
            </FieldLabel>
            <Input id="suggest-publisher" name="publisher" />
          </Field>
          <Field data-invalid={field("sourceUrl") ? "true" : undefined}>
            <FieldLabel htmlFor="suggest-link">
              <span>Link{optional}</span>
            </FieldLabel>
            <Input id="suggest-link" name="sourceUrl" type="url" />
            <FieldDescription>
              A page about the game, if you have one.
            </FieldDescription>
            {field("sourceUrl") && (
              <FieldError>{field("sourceUrl")}</FieldError>
            )}
          </Field>
          <PhotoField
            name="photo"
            label="Photo of the box"
            optional
            shape="box"
            chooseLabel="Take or choose a photo"
            error={field("photo")}
          />
        </div>
      </Group>
      {state?.error && !state.fields && (
        <p role="alert" className="text-xs text-destructive">
          {state.error}
        </p>
      )}
      <Button type="submit" size="lg" disabled={pending}>
        Send suggestion
      </Button>
    </form>
  );
}
