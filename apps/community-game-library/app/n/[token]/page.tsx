import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { connection } from "next/server";
import { LinkGone } from "@/app/_components/link-gone";
import { getAccount } from "@/app/_lib/account";
import { getCurrentUserId } from "@/app/_lib/current-user";
import { OpenInBrowser } from "@/app/(auth)/welcome/welcome-screen";
import { getInjection } from "@/di/container";
import { InputParseError, NotFoundError } from "@/src/entities/errors/common";
import { inAppBrowserOf } from "@/src/entities/in-app-browser";
import {
  formatDate,
  formatTime,
  PLAN_TIME_ZONE,
  todayIn,
} from "@/src/entities/week";
import { NightLinkLanding } from "./night-link-screen";
import { OpenNight } from "./open-night";

const GONE = "This link no longer works. Ask the host for a new one.";

// What D14 shows of a working link's night, or null for a link that doesn't work.
async function nightOfLink(token: string) {
  try {
    return await getInjection("ICheckNightLinkController")({ token });
  } catch (err) {
    if (err instanceof NotFoundError || err instanceof InputParseError) {
      return null;
    }
    throw err;
  }
}

// "6 seats · 2 open", "6 seats · full", "6 seats · full, with a waitlist" (D14).
function seatsWords(night: {
  capacity: number;
  seatsOpen: number;
  waitlisted: number;
}): string {
  const open =
    night.seatsOpen > 0
      ? `${night.seatsOpen} open`
      : night.waitlisted > 0
        ? "full, with a waitlist"
        : "full";
  return `${night.capacity} seats · ${open}`;
}

// A night's link, /n/<token> (R30, KTD18; screens.md). Signed out: D14, or A9 inside a chat app's
// own browser. Signed in: on the night's list, then the night. It opens signed out (proxy.ts), and
// waits on connection() before it reads the session.
export default async function NightLinkPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  await connection();
  const { token } = await params;
  const path = `/n/${encodeURIComponent(token)}`;

  if (!(await getCurrentUserId())) {
    if (inAppBrowserOf((await headers()).get("user-agent"))) {
      return <OpenInBrowser />;
    }
    const night = await nightOfLink(token);
    if (!night) {
      return (
        <LinkGone line={GONE} next={{ href: "/welcome", label: "Welcome" }} />
      );
    }
    const today = todayIn(PLAN_TIME_ZONE);
    return (
      <NightLinkLanding
        path={path}
        title={night.title}
        when={`${formatDate(todayIn(PLAN_TIME_ZONE, night.startsAt), today)} · ${formatTime(night.startsAt)}`}
        seats={seatsWords(night)}
      />
    );
  }

  const account = await getAccount();
  if (account?.state === "removed") {
    redirect("/removed");
  }
  return (
    <OpenNight token={token} settingUp={account?.state === "needs-profile"} />
  );
}
