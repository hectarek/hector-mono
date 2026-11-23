import type { Metadata } from "next";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { connection } from "next/server";
import { LinkGone } from "@/app/_components/link-gone";
import { getAccount } from "@/app/_lib/account";
import { getCurrentUserId } from "@/app/_lib/current-user";
import { previewMetadata } from "@/app/_lib/link-previews";
import { OpenInBrowser } from "@/app/(auth)/welcome/welcome-screen";
import { getInjection } from "@/di/container";
import { InputParseError, NotFoundError } from "@/src/entities/errors/common";
import { inAppBrowserOf } from "@/src/entities/in-app-browser";
import { formatDate, PLAN_TIME_ZONE, todayIn } from "@/src/entities/week";
import { InviteLanding } from "./link-screens";
import { OpenLink } from "./open-link";

// A friend's link shows Y2's preview in a chat app, the same for every link (U23).
export const metadata: Metadata = previewMetadata("friend");

const GONE = "This link no longer works. Ask your friend for a new one.";

// The day a working link stops working, for A3, or null for one that doesn't work.
async function worksUntil(token: string): Promise<string | null> {
  try {
    const { expiresAt } = await getInjection("ICheckFriendLinkController")({
      token,
    });
    return formatDate(
      todayIn(PLAN_TIME_ZONE, expiresAt),
      todayIn(PLAN_TIME_ZONE),
    );
  } catch (err) {
    if (err instanceof NotFoundError || err instanceof InputParseError) {
      return null;
    }
    throw err;
  }
}

// A friend link, /f/<token> (R49, KTD18; screens.md). Signed out: A3, or A9 inside a chat app's
// own browser, where most links are opened. Signed in: friends at once, then the friend's page.
// It opens signed out (proxy.ts), and waits on connection() before it reads the session.
export default async function FriendLinkPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  await connection();
  const { token } = await params;
  const path = `/f/${encodeURIComponent(token)}`;

  if (!(await getCurrentUserId())) {
    if (inAppBrowserOf((await headers()).get("user-agent"))) {
      return <OpenInBrowser />;
    }
    const until = await worksUntil(token);
    return until ? (
      <InviteLanding path={path} worksUntil={until} />
    ) : (
      <LinkGone line={GONE} next={{ href: "/welcome", label: "Welcome" }} />
    );
  }

  const account = await getAccount();
  if (account?.state === "removed") {
    redirect("/removed");
  }
  return (
    <OpenLink token={token} settingUp={account?.state === "needs-profile"} />
  );
}
