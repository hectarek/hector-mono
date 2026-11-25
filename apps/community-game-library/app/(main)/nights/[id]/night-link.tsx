"use client";

import { Button } from "@repo/ui/components/button";
import { useState } from "react";
import { ConfirmDialog } from "@/app/_components/confirm-dialog";
import { LinkIcon } from "@/app/_components/icons";
import { ShareButton } from "@/app/_components/share-button";
import { callAction } from "@/app/_lib/call-action";
import { notify } from "@/app/_lib/notify";
import { makeNightLink } from "@/app/actions/nights";
import { nightLinkMessage } from "@/src/entities/share-message";

// The night's link, on the host's page (D7; R30, KTD18): its address, who it lets in, Share, and
// Make a new link after its dialog, which ends the old one.
export function NightLink({
  gameNightId,
  title,
  address,
  url,
  attendeesCanInvite,
}: {
  gameNightId: string;
  title: string;
  // "communitygamelibrary.com/n/7QK2-MARR", and the whole address to share.
  address: string;
  url: string;
  attendeesCanInvite: boolean;
}) {
  const [asking, setAsking] = useState(false);
  return (
    <div className="flex flex-col gap-2 border-t-2 border-dashed border-foreground pt-3">
      <span
        data-ink="smudge"
        className="font-mono text-2xs font-medium tracking-wider uppercase"
      >
        The night’s link
      </span>
      <p className="flex min-h-11 items-center gap-2 rounded-lg border-2 border-foreground bg-secondary px-2.5">
        <LinkIcon className="shrink-0" />
        <span className="min-w-0 font-mono text-xs font-medium wrap-anywhere">
          {address}
        </span>
      </p>
      <p className="text-13 text-muted-foreground">
        {attendeesCanInvite
          ? "You and people going can invite by name."
          : "Only you can invite by name."}{" "}
        Anyone with the link can see the night and join while there’s room.
      </p>
      <ShareButton
        text={nightLinkMessage(title)}
        url={url}
        copied="Link copied"
        className="self-start"
      />
      <div className="flex flex-wrap items-center gap-x-2.5">
        <Button
          type="button"
          variant="link"
          className="self-start"
          onClick={() => setAsking(true)}
        >
          Make a new link
        </Button>
        <span className="text-xs text-muted-foreground">
          The old link stops working.
        </span>
      </div>
      <ConfirmDialog
        open={asking}
        onOpenChange={setAsking}
        title="Make a new link?"
        confirmLabel="Make a new link"
        keepLabel="Keep this one"
        onConfirm={async () => {
          const error = await callAction(() => makeNightLink(gameNightId));
          if (!error) {
            notify("New link made. The old one stops working.");
          }
          return error;
        }}
      >
        The link you already shared stops working.
      </ConfirmDialog>
    </div>
  );
}
