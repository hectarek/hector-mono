"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { LinkGone } from "@/app/_components/link-gone";
import { callResultAction } from "@/app/_lib/call-action";
import { notify } from "@/app/_lib/notify";
import { openFriendLink } from "@/app/actions/friends";

// A signed-in visitor's friend link (R49, KTD18): the page sends the link once it's open, so the
// two are friends at once, then goes to the friend's page, or to setting up for a new member,
// who meets the friend at step 2. A link preview or a prefetch never runs this, since it's sent
// from the browser, not by the page's load.
export function OpenLink({
  token,
  settingUp,
}: {
  token: string;
  // A new member with no profile yet goes on to A4.
  settingUp: boolean;
}) {
  const router = useRouter();
  const sent = useRef(false);
  const [error, setError] = useState<string>();

  useEffect(() => {
    if (sent.current) return;
    sent.current = true;
    void (async () => {
      const result = await callResultAction(() => openFriendLink(token));
      if (!("friendId" in result) || result.friendId === undefined) {
        setError(result.error);
        return;
      }
      if (settingUp) {
        router.replace(`/start/profile?friend=${result.friendId}`);
        return;
      }
      router.replace(`/friends/${result.friendId}`);
      notify(`You and ${result.name} are friends.`);
    })();
  }, [token, settingUp, router]);

  if (error) {
    return (
      <LinkGone line={error} next={{ href: "/friends", label: "Friends" }} />
    );
  }
  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-md flex-col gap-3 px-4 pt-4 pb-6">
      <p className="font-heading text-xl leading-none font-bold uppercase">
        Community Game Library
      </p>
      <p role="status" className="mt-3 text-sm text-muted-foreground">
        Making you friends…
      </p>
    </main>
  );
}
