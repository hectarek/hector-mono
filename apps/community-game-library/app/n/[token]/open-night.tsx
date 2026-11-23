"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { LinkGone } from "@/app/_components/link-gone";
import { callResultAction } from "@/app/_lib/call-action";
import { openNightLink } from "@/app/actions/nights";

// A signed-in visitor's night link (R30, KTD18): the page sends the link once it's open, which
// puts them on the night's list, then opens the night, or setting up for a new member, whose
// Nights shows it once they're in. A link preview or a prefetch never runs this, since it's sent
// from the browser, not by the page's load.
export function OpenNight({
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
      const result = await callResultAction(() => openNightLink(token));
      if (!("gameNightId" in result) || result.gameNightId === undefined) {
        setError(result.error);
        return;
      }
      router.replace(
        settingUp ? "/start/profile" : `/nights/${result.gameNightId}`,
      );
    })();
  }, [token, settingUp, router]);

  if (error) {
    return (
      <LinkGone line={error} next={{ href: "/nights", label: "Nights" }} />
    );
  }
  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-md flex-col gap-3 px-4 pt-4 pb-6">
      <p className="font-heading text-xl leading-none font-bold uppercase">
        Community Game Library
      </p>
      <p role="status" className="mt-3 text-sm text-muted-foreground">
        Opening the night…
      </p>
    </main>
  );
}
