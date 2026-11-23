"use client";

import { Button } from "@repo/ui/components/button";
import { Field, FieldLabel } from "@repo/ui/components/field";
import { Textarea } from "@repo/ui/components/textarea";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { ConfirmDialog } from "@/app/_components/confirm-dialog";
import { Group } from "@/app/_components/group";
import { callResultAction } from "@/app/_lib/call-action";
import { notify } from "@/app/_lib/notify";
import { shareOrCopy } from "@/app/_lib/share";
import { cancelNight } from "@/app/actions/nights";
import { listed } from "@/src/entities/listed";
import { nightCancelledMessage } from "@/src/entities/share-message";

// Cancelling, at the foot of the host's page (D7), and D11's dialog: the date, then everyone
// going, invited or waiting by name, told in their inbox, with an optional note. Nights opens
// after (D15) with Text them too, which hands the phone's share sheet a ready message (R52).
export function CancelNight({
  gameNightId,
  title,
  day,
  when,
  told,
}: {
  gameNightId: string;
  title: string;
  // "Fri, Nov 20", for the message.
  day: string;
  // "Fri, Nov 20 · 7:00 PM"
  when: string;
  // Everyone going, invited or waiting, by name.
  told: string[];
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [note, setNote] = useState("");
  const noteId = `cancel-note-${gameNightId}`;

  async function confirm() {
    const result = await callResultAction(() => cancelNight(gameNightId, note));
    if (result?.error !== undefined) {
      return result.error;
    }
    router.push("/nights");
    notify(
      result && "message" in result && result.message
        ? result.message
        : `${title} is cancelled`,
      told.length > 0
        ? {
            action: {
              label: "Text them too",
              onClick: () => {
                void shareOrCopy({ text: nightCancelledMessage(title, day) });
              },
            },
          }
        : {},
    );
    return undefined;
  }

  return (
    <Group label="Cancelling">
      <p className="text-13 text-muted-foreground">
        Everyone going, invited or waiting is told.
      </p>
      <Button variant="destructive" size="lg" onClick={() => setOpen(true)}>
        Cancel the night
      </Button>
      <ConfirmDialog
        open={open}
        onOpenChange={setOpen}
        title={`Cancel ${title}?`}
        confirmLabel="Cancel the night"
        keepLabel="Keep it"
        onConfirm={confirm}
      >
        {told.length > 0 ? (
          <>
            <p>
              {when}. Everyone going, invited or waiting is told: {listed(told)}
              .
            </p>
            <p>
              It goes to their inbox. They see it when they next open the app.
            </p>
            <Field>
              <FieldLabel htmlFor={noteId}>
                <span>
                  Note for them
                  <span data-ink="smudge" className="font-normal">
                    {" · optional"}
                  </span>
                </span>
              </FieldLabel>
              <Textarea
                id={noteId}
                rows={2}
                maxLength={500}
                value={note}
                onChange={(event) => setNote(event.target.value)}
              />
            </Field>
          </>
        ) : (
          <p>{when}. Nobody else is on its list, so nobody is told.</p>
        )}
        <p className="font-bold">This can’t be undone.</p>
      </ConfirmDialog>
    </Group>
  );
}
