import { headers } from "next/headers";
import { connection } from "next/server";
import { AppHeader } from "@/app/_components/app-header";
import { LinkIcon } from "@/app/_components/icons";
import { PageColumn } from "@/app/_components/page-column";
import { gate } from "@/app/_lib/account";
import { getInjection } from "@/di/container";
import { formatDate, PLAN_TIME_ZONE, todayIn } from "@/src/entities/week";
import { MakeNewLink, ShareFriendLink } from "./friend-link-actions";

// Your friend link (E2; R49, KTD18): its address on this site, Share and Copy, the day it stops
// working, and Make a new link. A member with no link that works gets a new one as the page
// opens.
export default async function FriendLinkPage() {
  await connection();
  const { user } = await gate("app");
  const link = await getInjection("IGetFriendLinkController")(user.id);
  const host = (await headers()).get("host") ?? "communitygamelibrary.com";
  const local = host.startsWith("localhost") || host.startsWith("127.0.0.1");
  const address = `${host}/f/${link.token}`;
  const worksUntil = formatDate(
    todayIn(PLAN_TIME_ZONE, link.expiresAt),
    todayIn(PLAN_TIME_ZONE),
  );

  return (
    <PageColumn
      width="read"
      header={<AppHeader back={{ href: "/friends", label: "Friends" }} />}
    >
      <section className="flex flex-col gap-3.5 rounded-lg border-2 border-foreground bg-card p-4">
        <h1 className="font-heading text-22 font-bold uppercase">
          Your friend link
        </h1>
        <p className="flex items-center gap-2.5 rounded-md border-2 border-foreground bg-secondary p-3">
          <LinkIcon className="shrink-0" />
          <span className="min-w-0 font-mono text-xs font-medium wrap-anywhere">
            {address}
          </span>
        </p>
        <ShareFriendLink url={`${local ? "http" : "https"}://${address}`} />
        <p className="font-mono text-xs font-medium text-muted-foreground">
          Works until {worksUntil}
        </p>
        <p className="text-13 leading-snug text-muted-foreground">
          Anyone who opens it and signs in becomes your friend at once, so share
          it only with people you’d lend a game to.
        </p>
        <div className="flex flex-col gap-1 border-t-2 border-dashed border-foreground pt-1.5">
          <MakeNewLink />
          <p className="text-xs text-muted-foreground">
            The link you already shared stops working.
          </p>
        </div>
      </section>
    </PageColumn>
  );
}
