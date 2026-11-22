"use client";

import { Button } from "@repo/ui/components/button";
import { Checkbox } from "@repo/ui/components/checkbox";
import { Field, FieldError, FieldLabel } from "@repo/ui/components/field";
import {
  NativeSelect,
  NativeSelectOption,
} from "@repo/ui/components/native-select";
import { Textarea } from "@repo/ui/components/textarea";
import {
  startTransition,
  useActionState,
  useEffect,
  useRef,
  useState,
} from "react";
import { CONDITIONS } from "@/app/_components/copy-state";
import { Group } from "@/app/_components/group";
import { useLeaveGuard } from "@/app/_lib/leave-guard";
import { notify, notifyNotSent } from "@/app/_lib/notify";
import { saveCopy } from "@/app/actions/copies";
import type { ActionState } from "@/app/actions/shared";
import type { UserGame } from "@/src/entities/models/user-game.model";

// B7's This copy: its condition, what's missing or damaged, and the expansions in its box, saved
// together with Save ("Saved."). What's typed stays when a send fails, and leaving with changes
// unsaved asks first: a save brings the page back with the copy as saved, so the fields match it.
// It sends from onSubmit rather than the form's action: after a form action React resets the
// form, which put the condition back to the one the page loaded with while the copy kept the
// new one, so the next Save sent the old one (2026-11-22).
export function CopyForm({
  userGameId,
  condition,
  conditionNote,
  expansions,
  boxed,
}: {
  userGameId: string;
  condition: UserGame["condition"];
  conditionNote: string;
  // Every expansion of the copy's game, by its full title (B7's "Gull & Anchor: Low Tide").
  expansions: { id: string; title: string }[];
  boxed: string[];
}) {
  const form = useRef<HTMLFormElement>(null);
  const [chosen, setChosen] = useState(condition);
  const [note, setNote] = useState(conditionNote);
  const [ticked, setTicked] = useState(new Set(boxed));
  const [state, submit, pending] = useActionState(
    async (previous: ActionState, formData: FormData) => {
      try {
        return await saveCopy(previous, formData);
      } catch {
        notifyNotSent(() => form.current?.requestSubmit());
        return previous;
      }
    },
    null,
  );
  useLeaveGuard(
    chosen !== condition ||
      note !== conditionNote ||
      ticked.size !== boxed.length ||
      boxed.some((id) => !ticked.has(id)),
  );

  useEffect(() => {
    if (state?.message) {
      notify(state.message);
    }
  }, [state]);

  return (
    <form
      ref={form}
      onSubmit={(event) => {
        event.preventDefault();
        const formData = new FormData(event.currentTarget);
        startTransition(() => submit(formData));
      }}
      noValidate
    >
      <input type="hidden" name="userGameId" value={userGameId} />
      <Group label="This copy">
        <div className="flex flex-col gap-3">
          <Field data-invalid={state?.fields?.condition ? "true" : undefined}>
            <FieldLabel htmlFor="copy-condition">Condition</FieldLabel>
            <NativeSelect
              id="copy-condition"
              name="condition"
              value={chosen}
              onChange={(event) =>
                setChosen(event.target.value as UserGame["condition"])
              }
            >
              {Object.entries(CONDITIONS).map(([value, words]) => (
                <NativeSelectOption key={value} value={value}>
                  {words}
                </NativeSelectOption>
              ))}
            </NativeSelect>
            {state?.fields?.condition && (
              <FieldError>{state.fields.condition}</FieldError>
            )}
          </Field>

          <Field
            data-invalid={state?.fields?.conditionNote ? "true" : undefined}
          >
            <FieldLabel htmlFor="copy-parts">
              <span>
                Missing or damaged parts
                <span data-ink="smudge" className="font-normal">
                  {" · optional"}
                </span>
              </span>
            </FieldLabel>
            <Textarea
              id="copy-parts"
              name="conditionNote"
              rows={3}
              maxLength={200}
              value={note}
              onChange={(event) => setNote(event.target.value)}
              aria-invalid={state?.fields?.conditionNote ? true : undefined}
            />
            {state?.fields?.conditionNote && (
              <FieldError>{state.fields.conditionNote}</FieldError>
            )}
          </Field>

          {expansions.length > 0 && (
            <fieldset className="flex flex-col gap-0.5">
              <legend className="text-13 font-semibold">
                Expansions in the box
              </legend>
              {expansions.map((expansion) => (
                <div key={expansion.id} className="flex items-center gap-2.5">
                  <Checkbox
                    id={`box-${expansion.id}`}
                    name="expansionIds"
                    value={expansion.id}
                    checked={ticked.has(expansion.id)}
                    onCheckedChange={(on) =>
                      setTicked((now) => {
                        const next = new Set(now);
                        if (on) {
                          next.add(expansion.id);
                        } else {
                          next.delete(expansion.id);
                        }
                        return next;
                      })
                    }
                  />
                  <label
                    htmlFor={`box-${expansion.id}`}
                    className="flex min-h-11 flex-1 items-center text-15"
                  >
                    {expansion.title}
                  </label>
                </div>
              ))}
            </fieldset>
          )}

          <Button type="submit" disabled={pending} className="self-start">
            Save
          </Button>
          {state?.error && !state.fields && (
            <p role="alert" className="text-xs text-destructive">
              {state.error}
            </p>
          )}
        </div>
      </Group>
    </form>
  );
}
