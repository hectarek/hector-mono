import { Button } from "@repo/ui/components/button";
import Link from "next/link";
import { redirect } from "next/navigation";
import { connection } from "next/server";
import { FriendRow } from "@/app/_components/friend-row";
import { List } from "@/app/_components/list-row";
import { Piece } from "@/app/_components/piece";
import { gate } from "@/app/_lib/account";
import { getInjection } from "@/di/container";
import { InputParseError, NotFoundError } from "@/src/entities/errors/common";

// The friend whose link brought the member here, or nothing when the address names nobody who's
// their friend.
async function loadFriend(friendId: string, userId: string) {
  try {
    return (
      await getInjection("IGetProfileController")({ userId: friendId }, userId)
    ).profile;
  } catch (err) {
    if (err instanceof NotFoundError || err instanceof InputParseError) {
      return null;
    }
    throw err;
  }
}

// A5, step 2 of 3, after joining through a friend link (R49): you're friends with whoever sent
// it, and their friends are a tap away. Without a friend in the address, setting up goes on to
// step 3.
export default async function FriendsStepPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  await connection();
  const account = await gate("app");
  const { friend: friendId } = await searchParams;
  const friend =
    typeof friendId === "string"
      ? await loadFriend(friendId, account.user.id)
      : null;
  if (!friend) {
    redirect("/start/home-screen");
  }
  const people = await getInjection("IListPeopleYouMayKnowController")(
    account.user.id,
  );

  return (
    <>
      <p
        data-ink="smudge"
        className="font-mono text-2xs font-medium tracking-wider uppercase"
      >
        Step 2 of 3
      </p>
      <span aria-hidden="true" className="flex items-end gap-1">
        {account.state === "ready" && (
          <Piece
            shape={account.me.pieceShape}
            color={account.me.pieceColor}
            size={36}
          />
        )}
        <Piece shape={friend.pieceShape} color={friend.pieceColor} size={36} />
      </span>
      <h1 className="text-2xl leading-tight font-bold">
        You and {friend.name} are friends
      </h1>
      <p className="text-sm leading-snug text-muted-foreground">
        You can see {friend.name}’s library and game nights, and {friend.name}{" "}
        can see yours.
      </p>
      {people.length > 0 && (
        <section className="flex flex-col gap-2">
          <h2 className="font-heading text-15 font-bold tracking-wide uppercase">
            People you may know
          </h2>
          <List>
            {people.map(({ person, via, yourRequestId }) => (
              <FriendRow
                key={person.userId}
                person={person}
                via={via}
                request={
                  yourRequestId
                    ? { kind: "yours", id: yourRequestId }
                    : { kind: "none" }
                }
              />
            ))}
          </List>
          <p className="text-xs text-muted-foreground">
            They get a request to accept.
          </p>
        </section>
      )}
      <Button
        size="lg"
        nativeButton={false}
        render={<Link href="/start/home-screen" />}
        className="mt-1"
      >
        Next
      </Button>
    </>
  );
}
