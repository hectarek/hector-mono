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
import { List, ListRow, RowFacts } from "@/app/_components/list-row";
import { PageColumn } from "@/app/_components/page-column";
import { Piece } from "@/app/_components/piece";
import { Stamp } from "@/app/_components/stamp";
import { gate } from "@/app/_lib/account";
import { noticeText } from "@/app/_lib/notice-text";
import { getInjection } from "@/di/container";
import { formatNoticeTime, PLAN_TIME_ZONE, todayIn } from "@/src/entities/week";
import { IfNew, MarkInboxRead, UnreadCount } from "./mark-read";

// Choose which notices I get: flush under the empty state's words (F2), centered under the lists
// (F1).
function ChooseNotices({ centered = false }: { centered?: boolean }) {
  return (
    <Button
      variant="link"
      nativeButton={false}
      render={<Link href="/you/notices" transitionTypes={["go-deeper"]} />}
      className={centered ? "self-center" : "self-start"}
    >
      Choose which notices I get
    </Button>
  );
}

// A notice's line as F1 sets it, 14px with its words in bold: "**Priya asked to borrow** Night
// Market", "Moss & Mortar **is due today**".
function NoticeLine({ line, bold }: { line: string; bold: string }) {
  const at = line.indexOf(bold);
  if (at < 0) return line;
  return (
    <>
      {line.slice(0, at)}
      <strong className="font-bold">{bold}</strong>
      {line.slice(at + bold.length)}
    </>
  );
}

// The dot that marks a notice that was new when the inbox opened, after its stamp (F1).
function NewDot({ id }: { id: string }) {
  return (
    <IfNew id={id}>
      <span
        aria-hidden="true"
        className="size-2.5 shrink-0 rounded-full bg-destructive"
      />
    </IfNew>
  );
}

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
          <EmptyContent>
            <ChooseNotices />
          </EmptyContent>
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
                      thumbTop
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
                        words.stamp ? (
                          <span className="flex items-center gap-3">
                            <Stamp tone={words.stamp.tone}>
                              {words.stamp.word}
                            </Stamp>
                            <NewDot id={item.notice.id} />
                          </span>
                        ) : (
                          <NewDot id={item.notice.id} />
                        )
                      }
                    >
                      <span className="text-sm leading-snug">
                        <IfNew id={item.notice.id}>
                          <span className="sr-only">Unread. </span>
                        </IfNew>
                        <NoticeLine line={words.line} bold={words.bold} />
                      </span>
                      {words.detail && (
                        <span className="text-13 leading-snug text-muted-foreground">
                          {words.detail}
                        </span>
                      )}
                      <RowFacts>
                        <span data-ink="smudge">
                          {formatNoticeTime(item.notice.createdAt, now)}
                        </span>
                      </RowFacts>
                    </ListRow>
                  );
                })}
              </List>
            </Group>
          ))}
          <ChooseNotices centered />
        </MarkInboxRead>
      )}
    </PageColumn>
  );
}
