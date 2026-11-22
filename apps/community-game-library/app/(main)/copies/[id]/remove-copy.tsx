"use client";

import { Button } from "@repo/ui/components/button";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { ConfirmDialog } from "@/app/_components/confirm-dialog";
import { callResultAction } from "@/app/_lib/call-action";
import { notify } from "@/app/_lib/notify";
import { removeCopy } from "@/app/actions/copies";
import type { ActionState } from "@/app/actions/shared";

// B7's Remove panel and B14's dialog: Remove from my library asks first, then My library opens
// with the message. While someone has the copy the button is switched off, with why (AE2).
export function RemoveCopy({
  userGameId,
  gameId,
  title,
  out,
}: {
  userGameId: string;
  gameId: string;
  title: string;
  out: boolean;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);

  async function remove() {
    const result: ActionState = await callResultAction(() =>
      removeCopy(userGameId, gameId),
    );
    if (result?.error !== undefined) {
      return result.error;
    }
    router.push("/my-library");
    if (result?.message) {
      notify(result.message);
    }
    return undefined;
  }

  return (
    <>
      <Button
        variant="secondary"
        disabled={out}
        onClick={() => setOpen(true)}
        className="self-start"
      >
        Remove from my library
      </Button>
      {out && (
        <p className="text-13 leading-snug text-muted-foreground">
          You can remove it once it’s back.
        </p>
      )}
      <ConfirmDialog
        open={open}
        onOpenChange={setOpen}
        title={`Remove ${title} from your library?`}
        confirmLabel="Remove it"
        keepLabel="Keep it"
        onConfirm={remove}
      >
        Your friends stop seeing it. Its loan history goes with it. This can’t
        be undone.
      </ConfirmDialog>
    </>
  );
}
