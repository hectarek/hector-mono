import { Button } from "@repo/ui/components/button";
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyTitle,
} from "@repo/ui/components/empty";
import Link from "next/link";
import { connection } from "next/server";
import { AppHeader } from "@/app/_components/app-header";
import { Group } from "@/app/_components/group";
import { BellIcon } from "@/app/_components/icons";
import { List, ListRow, RowFacts, RowName } from "@/app/_components/list-row";
import { PageColumn } from "@/app/_components/page-column";
import { Piece } from "@/app/_components/piece";
import { Stamp } from "@/app/_components/stamp";
import { gate } from "@/app/_lib/account";
import { noticeText } from "@/app/_lib/notice-text";
import { getInjection } from "@/di/container";
import { formatNoticeTime, PLAN_TIME_ZONE, todayIn } from "@/src/entities/week";
import { IfNew, MarkInboxRead, UnreadCount } from "./mark-read";

const notices = (
  <Button
    variant="link"
    nativeButton={false}
    render={<Link href="/you/notices" />}
    className="self-start"
  >
    Choose which notices I get
  </Button>
);

// The inbox (F1, and F2 when it's empty; R25 to R27): the member's notices, newest first, in
// Today and Earlier, each opening its thing's page, with what was new marked. It marks them all
// read once it's open, and what was new stays marked until the member leaves (mark-read.tsx).
// The groups switched off in Notices I get aren't here.
export default async function InboxPage() {
  await connection();
  const { user } = await gate("app");
  const items = await getInjection("IListInboxController")(user.id);
  const now = new Date();
  const today = todayIn(PLAN_TIME_ZONE, now);
  const unreadIds = items.flatMap(({ notice }) =>
    notice.readAt === null ? [notice.id] : [],
  );
  const reader = { userId: user.id, today };
  const groups = [
    {
      label: "Today",
      items: items.filter(
        ({ notice }) => todayIn(PLAN_TIME_ZONE, notice.createdAt) === today,
      ),
    },
    {
      label: "Earlier",
      items: items.filter(
        ({ notice }) => todayIn(PLAN_TIME_ZONE, notice.createdAt) !== today,
      ),
    },
  ].filter((group) => group.items.length > 0);

  return (
    <PageColumn
      width="read"
      header={<AppHeader back={{ href: "/", label: "Library" }} />}
    >
      <h1 className="text-2xl leading-7 font-bold">Inbox</h1>
      {items.length === 0 ? (
        <Empty>
          <EmptyHeader>
            <EmptyTitle>Nothing here yet</EmptyTitle>
            <EmptyDescription>
              Requests, due dates and game-night news land here.
            </EmptyDescription>
          </EmptyHeader>
          <EmptyContent>{notices}</EmptyContent>
        </Empty>
      ) : (
        <MarkInboxRead unreadIds={unreadIds}>
          <UnreadCount />
          {groups.map((group) => (
            <Group key={group.label} label={group.label} overList>
              <List>
                {group.items.map((item) => {
                  const words = noticeText(item, reader);
                  return (
                    <ListRow
                      key={item.notice.id}
                      href={words.href}
                      thumb={
                        item.actor ? (
                          <Piece
                            shape={item.actor.pieceShape}
                            color={item.actor.pieceColor}
                          />
                        ) : (
                          <BellIcon className="shrink-0" />
                        )
                      }
                      stamp={
                        words.stamp && (
                          <Stamp tone={words.stamp.tone}>
                            {words.stamp.word}
                          </Stamp>
                        )
                      }
                    >
                      <RowName>
                        <IfNew id={item.notice.id}>
                          <span className="sr-only">Unread. </span>
                        </IfNew>
                        {words.line}
                      </RowName>
                      {words.detail && (
                        <span className="text-13 leading-snug">
                          {words.detail}
                        </span>
                      )}
                      <RowFacts>
                        <IfNew id={item.notice.id}>
                          <span
                            aria-hidden="true"
                            className="mr-1.5 inline-block size-2 rounded-full bg-destructive"
                          />
                        </IfNew>
                        {formatNoticeTime(item.notice.createdAt, now)}
                      </RowFacts>
                    </ListRow>
                  );
                })}
              </List>
            </Group>
          ))}
          {notices}
        </MarkInboxRead>
      )}
    </PageColumn>
  );
}
