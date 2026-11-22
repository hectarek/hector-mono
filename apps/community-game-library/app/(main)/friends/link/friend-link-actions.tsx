"use client";

import { Button } from "@repo/ui/components/button";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { ConfirmDialog } from "@/app/_components/confirm-dialog";
import { ShareIcon } from "@/app/_components/icons";
import { callResultAction } from "@/app/_lib/call-action";
import { notify } from "@/app/_lib/notify";
import { shareOrCopy } from "@/app/_lib/share";
import { makeFriendLink } from "@/app/actions/friends";
import { FRIEND_LINK_MESSAGE } from "@/src/entities/share-message";

// E2's Share and Copy: the share sheet with the ready message, or the link alone on the
// clipboard (KTD18).
export function ShareFriendLink({ url }: { url: string }) {
  async function share() {
    const result = await shareOrCopy({ text: FRIEND_LINK_MESSAGE, url });
    if (result === "copied") notify("Link copied");
    if (result === "failed") notify("That didn’t copy. Try again.");
  }
  async function copy() {
    try {
      await navigator.clipboard.writeText(url);
      notify("Link copied");
    } catch {
      notify("That didn’t copy. Try again.");
    }
  }
  return (
    <div className="flex gap-2.5">
      <Button size="lg" className="flex-1" onClick={share}>
        <ShareIcon data-icon="inline-start" />
        Share
      </Button>
      <Button size="lg" variant="secondary" className="flex-1" onClick={copy}>
        Copy
      </Button>
    </div>
  );
}

// Make a new link, after "Make a new link?" (screens.md, Actions that ask first): the link
// already shared stops working.
export function MakeNewLink() {
  const router = useRouter();
  const [open, setOpen] = useState(false);

  async function make() {
    const result = await callResultAction(makeFriendLink);
    if (result?.error !== undefined) {
      return result.error;
    }
    router.refresh();
    if (result && "message" in result && result.message) {
      notify(result.message);
    }
    return undefined;
  }

  return (
    <>
      <Button
        variant="link"
        onClick={() => setOpen(true)}
        className="self-start"
      >
        Make a new link
      </Button>
      <ConfirmDialog
        open={open}
        onOpenChange={setOpen}
        title="Make a new link?"
        confirmLabel="Make a new link"
        keepLabel="Keep this one"
        onConfirm={make}
      >
        The link you already shared stops working.
      </ConfirmDialog>
    </>
  );
}
