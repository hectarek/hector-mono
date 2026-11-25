"use client";

import { Button } from "@repo/ui/components/button";
import { Skeleton } from "@repo/ui/components/skeleton";
import { useEffect, useState } from "react";
import { ConfirmDialog } from "@/app/_components/confirm-dialog";
import { LinkIcon, ShareIcon } from "@/app/_components/icons";
import { ShareAndCopy } from "@/app/_components/share-button";
import { Sheet } from "@/app/_components/sheet";
import { callResultAction } from "@/app/_lib/call-action";
import { notify } from "@/app/_lib/notify";
import { getFriendLink, makeFriendLink } from "@/app/actions/friends";
import { FRIEND_LINK_MESSAGE } from "@/src/entities/share-message";

// The link as the sheet shows it: its address on the site the page was opened at
// ("communitygamelibrary.com/f/K7Q2-HARB"), the whole address to share, and the day it stops
// working.
type ShownLink = { address: string; url: string; worksUntil: string };

function shownAt({
  token,
  worksUntil,
}: {
  token: string;
  worksUntil: string;
}): ShownLink {
  const { host, origin } = window.location;
  return {
    address: `${host}/f/${token}`,
    url: `${origin}/f/${token}`,
    worksUntil,
  };
}

// Share my friend link (E1, A7, and All friends before any friends): your friend link (E2, R49)
// opens as a sheet over the page you're on, a drawer on a phone and a dialog from 768px.
export function ShareMyFriendLink({
  icon = false,
  className,
}: {
  // E1 draws the share icon on it; A7's box doesn't.
  icon?: boolean;
  // Where it sits: `self-start` keeps it at its own width in a column (E1).
  className?: string;
}) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <Button
        type="button"
        variant="secondary"
        className={className}
        onClick={() => setOpen(true)}
      >
        {icon && <ShareIcon data-icon="inline-start" />}
        Share my friend link
      </Button>
      <FriendLinkSheet open={open} onOpenChange={setOpen} />
    </>
  );
}

// The sheet alone, open as Friends arrives at ?show=friend-link, where /friends/link, from before
// the sheet, sends links and bookmarks. Friends puts it first, where it stays mounted while the
// page changes under it (a request accepted turns No friends yet into the box with the button),
// and React keeps its state while Next.js hides the page and shows it again, so it opens once.
export function FriendLinkOnArrival() {
  const [open, setOpen] = useState(true);
  useEffect(() => {
    // Once it's open, the address loses ?show=friend-link without a navigation, so only this
    // arrival opens it: a reload, Back once Next.js has let the page go, or the installed app
    // reopening there shows Friends alone. Next.js's router follows the browser's own history
    // calls once an effect of its own has taught it to, and on a first load that effect can run
    // after this one, in the same commit; a call before it would leave an entry Back can't
    // restore. A microtask comes after them all.
    queueMicrotask(() => {
      const address = new URL(window.location.href);
      if (address.searchParams.get("show") !== "friend-link") return;
      address.searchParams.delete("show");
      window.history.replaceState(
        null,
        "",
        `${address.pathname}${address.search}${address.hash}`,
      );
    });
  }, []);
  return <FriendLinkSheet open={open} onOpenChange={setOpen} />;
}

// E2's sheet. The link is read each time it opens (getFriendLink), not with the page, so the
// pages that offer it read nothing more, and it never keeps a link that has stopped working:
// reopened, it shows the last one while it checks.
function FriendLinkSheet({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const [link, setLink] = useState<ShownLink>();
  const [error, setError] = useState<string>();

  useEffect(() => {
    if (!open) return;
    let showing = true;
    // A new try, so the last one's error doesn't show while it runs.
    setError(undefined);
    void (async () => {
      const result = await callResultAction(getFriendLink);
      if (!showing) return;
      if (result.error !== undefined) {
        setError(result.error);
        return;
      }
      setLink(shownAt(result));
    })();
    return () => {
      showing = false;
    };
  }, [open]);

  return (
    <Sheet open={open} onOpenChange={onOpenChange} title="Your friend link">
      {link ? (
        <>
          <p className="flex items-center gap-2.5 rounded-md border-2 border-foreground bg-secondary p-3">
            <LinkIcon className="shrink-0" />
            <span className="min-w-0 font-mono text-xs font-medium wrap-anywhere">
              {link.address}
            </span>
          </p>
          <ShareAndCopy text={FRIEND_LINK_MESSAGE} url={link.url} />
          <p className="font-mono text-xs font-medium text-muted-foreground">
            Works until {link.worksUntil}
          </p>
        </>
      ) : error ? (
        <p role="alert" className="text-xs text-destructive">
          {error}
        </p>
      ) : (
        // The address, the two buttons and the date's line, until the link comes.
        <div role="status" aria-busy="true" className="flex flex-col gap-3.5">
          <span className="sr-only">Loading</span>
          <Skeleton className="h-12 w-full" />
          <Skeleton className="h-12 w-full" />
          <Skeleton className="h-4 w-40" />
        </div>
      )}
      <p className="text-13 leading-snug text-muted-foreground">
        Anyone who opens it and signs in becomes your friend at once, so share
        it only with people you’d lend a game to.
      </p>
      <div className="flex flex-col gap-1 border-t-2 border-dashed border-foreground pt-1.5">
        <MakeNewLink onMade={setLink} />
        <p className="text-xs text-muted-foreground">
          The link you already shared stops working.
        </p>
      </div>
    </Sheet>
  );
}

// Make a new link, after "Make a new link?" (screens.md, Actions that ask first): the link
// already shared stops working, and the sheet shows the new one.
function MakeNewLink({ onMade }: { onMade: (link: ShownLink) => void }) {
  const [asking, setAsking] = useState(false);

  async function make() {
    const result = await callResultAction(makeFriendLink);
    if (result.error !== undefined) {
      return result.error;
    }
    onMade(shownAt(result));
    if (result.message) notify(result.message);
    return undefined;
  }

  return (
    <>
      <Button
        type="button"
        variant="link"
        onClick={() => setAsking(true)}
        className="self-start"
      >
        Make a new link
      </Button>
      <ConfirmDialog
        open={asking}
        onOpenChange={setAsking}
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
