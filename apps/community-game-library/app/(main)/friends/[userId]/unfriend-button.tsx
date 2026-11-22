"use client";

import { Button } from "@repo/ui/components/button";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { ConfirmDialog } from "@/app/_components/confirm-dialog";
import { callResultAction } from "@/app/_lib/call-action";
import { notify } from "@/app/_lib/notify";
import { unfriend } from "@/app/actions/friends";

// Unfriend Sam, and E4's dialog: what stops, what stays open, and that Sam isn't told (R50).
// Once it's done, Friends opens with the message.
export function UnfriendButton({
  friendId,
  name,
  lines,
}: {
  friendId: string;
  name: string;
  // E4's lines, worked out by the page from what's between the two.
  lines: string[];
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);

  async function confirm() {
    const result = await callResultAction(() => unfriend(friendId, name));
    if (result?.error !== undefined) {
      return result.error;
    }
    router.push("/friends");
    if (result && "message" in result && result.message) {
      notify(result.message);
    }
    return undefined;
  }

  return (
    <>
      <Button
        variant="destructive"
        onClick={() => setOpen(true)}
        className="self-start"
      >
        Unfriend {name}
      </Button>
      <ConfirmDialog
        open={open}
        onOpenChange={setOpen}
        title={`Unfriend ${name}?`}
        confirmLabel={`Unfriend ${name}`}
        keepLabel={`Keep ${name}`}
        onConfirm={confirm}
      >
        <ul className="flex flex-col gap-2.5">
          {lines.map((line) => (
            <li key={line}>{line}</li>
          ))}
        </ul>
      </ConfirmDialog>
    </>
  );
}
