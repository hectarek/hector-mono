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
import { FriendRow } from "@/app/_components/friend-row";
import { Group } from "@/app/_components/group";
import { ShareIcon } from "@/app/_components/icons";
import { List, ListRow, RowFacts, RowName } from "@/app/_components/list-row";
import { PageColumn } from "@/app/_components/page-column";
import { Piece } from "@/app/_components/piece";
import { gate } from "@/app/_lib/account";
import { getInjection } from "@/di/container";

const games = (count: number) =>
  count === 0 ? "No games yet" : count === 1 ? "1 game" : `${count} games`;

const shareLink = (
  <Button
    variant="secondary"
    nativeButton={false}
    render={<Link href="/friends/link" transitionTypes={["go-deeper"]} />}
    className="self-start"
  >
    <ShareIcon data-icon="inline-start" />
    Share my friend link
  </Button>
);

// Friends (E1; R49): requests to you, your friend link, requests you sent, your friends, and
// people you may know. Nobody is searched for: a member brings people in with their link.
export default async function FriendsPage() {
  await connection();
  const { user } = await gate("app");
  const { requestsToYou, requestsYouSent, friends, peopleYouMayKnow } =
    await getInjection("IListFriendsController")(user.id);
  const [onlyAsker] = requestsToYou;

  return (
    <PageColumn width="read" header={<AppHeader title="Friends" />}>
      {requestsToYou.length > 0 && (
        <Group
          label={`Wants to be your friend · ${requestsToYou.length}`}
          overList
        >
          <List>
            {requestsToYou.map(({ requestId, person, via }) => (
              <FriendRow
                key={requestId}
                person={person}
                via={via}
                request={{ kind: "to-you", id: requestId }}
              />
            ))}
          </List>
          <p className="text-xs text-muted-foreground">
            {requestsToYou.length === 1 && onlyAsker
              ? `${onlyAsker.person.name} isn’t told if you decline.`
              : "They aren’t told if you decline."}
          </p>
        </Group>
      )}

      {friends.length === 0 ? (
        <Empty>
          <EmptyHeader>
            <EmptyTitle>No friends yet</EmptyTitle>
            <EmptyDescription>
              Share your friend link. Whoever opens it becomes your friend at
              once.
            </EmptyDescription>
          </EmptyHeader>
          <EmptyContent>{shareLink}</EmptyContent>
        </Empty>
      ) : (
        <Empty>
          <EmptyHeader>
            <EmptyTitle>Bring in the rest of your group</EmptyTitle>
            <EmptyDescription>
              Share your friend link in the group chat. Whoever opens it becomes
              your friend at once.
            </EmptyDescription>
          </EmptyHeader>
          <EmptyContent>{shareLink}</EmptyContent>
        </Empty>
      )}

      {requestsYouSent.length > 0 && (
        <Group label={`Requests you sent · ${requestsYouSent.length}`} overList>
          <List>
            {requestsYouSent.map(({ requestId, person, via }) => (
              <FriendRow
                key={requestId}
                person={person}
                via={via}
                request={{ kind: "yours", id: requestId }}
              />
            ))}
          </List>
        </Group>
      )}

      {friends.length > 0 && (
        <Group label={`Your friends · ${friends.length}`} overList>
          <List>
            {friends.map(({ person, games: count }) => (
              <ListRow
                key={person.userId}
                href={`/friends/${person.userId}`}
                thumb={
                  <Piece shape={person.pieceShape} color={person.pieceColor} />
                }
              >
                <RowName>{person.name}</RowName>
                <RowFacts>{games(count)}</RowFacts>
              </ListRow>
            ))}
          </List>
        </Group>
      )}

      {peopleYouMayKnow.length > 0 && (
        <Group label="People you may know" overList>
          <List>
            {peopleYouMayKnow.map(({ person, via, night }) => (
              <FriendRow
                key={person.userId}
                person={person}
                via={via}
                night={night}
                request={{ kind: "none" }}
              />
            ))}
          </List>
          <p className="text-xs text-muted-foreground">
            They get a request to accept.
          </p>
          <p className="text-xs text-muted-foreground">
            Looking for someone else? Send them your friend link.
          </p>
        </Group>
      )}
    </PageColumn>
  );
}
