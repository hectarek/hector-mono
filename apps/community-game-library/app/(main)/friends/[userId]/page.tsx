import { Empty, EmptyDescription } from "@repo/ui/components/empty";
import Image from "next/image";
import { notFound } from "next/navigation";
import { connection } from "next/server";
import { AppHeader } from "@/app/_components/app-header";
import { GameCardRow } from "@/app/_components/game-row";
import { Group } from "@/app/_components/group";
import { PhoneIcon } from "@/app/_components/icons";
import { LibraryList } from "@/app/_components/library-list";
import { List } from "@/app/_components/list-row";
import { NightRow } from "@/app/_components/night-row";
import { PageColumn } from "@/app/_components/page-column";
import { Piece } from "@/app/_components/piece";
import { gate } from "@/app/_lib/account";
import { getInjection } from "@/di/container";
import { InputParseError, NotFoundError } from "@/src/entities/errors/common";
import { parseLibraryView } from "@/src/entities/library-filters";
import { formatSince, PLAN_TIME_ZONE, todayIn } from "@/src/entities/week";
import { UnfriendButton } from "./unfriend-button";

type SearchParams = Record<string, string | string[] | undefined>;

// A friend's page, or Not found for anyone who isn't the member's friend (AE8) and for an id
// that isn't one.
async function loadFriend(
  friendId: string,
  params: SearchParams,
  userId: string,
) {
  try {
    return await getInjection("IGetFriendController")(friendId, params, userId);
  } catch (err) {
    if (err instanceof NotFoundError || err instanceof InputParseError) {
      notFound();
    }
    throw err;
  }
}

const games = (count: number) => (count === 1 ? "1 game" : `${count} games`);

// "A and B", "A, B and C".
const listed = (parts: string[]) =>
  parts.length < 2
    ? (parts[0] ?? "")
    : `${parts.slice(0, -1).join(", ")} and ${parts.at(-1)}`;

// E4's lines (R50 and its audit line): what stops, the nights coming up that each is taken off
// (U19), what stays open, and that the friend isn't told.
function unfriendLines(
  name: string,
  between: Awaited<ReturnType<typeof loadFriend>>["between"],
): string[] {
  // "Sam is taken off Heavy games at mine, and you off Sam’s nights", as E4 draws it: each comes
  // off the other's nights, named where there are some.
  const yourNights = between.nights
    .filter(({ yours }) => yours)
    .map(({ title }) => title);
  const theirNights = between.nights
    .filter(({ yours }) => !yours)
    .map(({ title }) => title);
  const theirs = theirNights.length ? listed(theirNights) : `${name}’s nights`;
  const nights = yourNights.length
    ? [`${name} is taken off ${listed(yourNights)}, and you off ${theirs}.`]
    : theirNights.length
      ? [`You’re taken off ${theirs}.`]
      : [];
  const staying = between.staying.map(({ title, yours }) =>
    yours
      ? `${title} stays on your Loans until ${name} gives it back.`
      : `${title} stays on your Loans until it’s back with ${name}.`,
  );
  const requests = between.withdrawn.map(({ title, yours }) =>
    yours ? `${name}’s request for ${title}` : `Your request for ${title}`,
  );
  const cancelled = between.cancelled.map(
    ({ title }) => `${title} isn’t picked up yet, so that loan is called off.`,
  );
  return [
    "You stop seeing each other’s libraries and game nights.",
    ...nights,
    ...staying,
    ...(requests.length
      ? [
          `${listed(requests)} ${requests.length === 1 ? "is" : "are"} withdrawn, and you leave each other’s lines.`,
        ]
      : []),
    ...cancelled,
    `${name} isn’t told. You can become friends again with a friend link.`,
  ];
}

// A friend's page (E3; R10, R40): their photo, piece, name, phone and when you became friends,
// their library in the Library's one list (U8), each copy as you see it, the nights coming up
// that they're going to and you can see (U18), and Unfriend with E4's dialog.
export default async function FriendPage({
  params,
  searchParams,
}: {
  params: Promise<{ userId: string }>;
  searchParams: Promise<SearchParams>;
}) {
  await connection();
  const { user } = await gate("app");
  const { userId: friendId } = await params;
  const query = await searchParams;
  const { profile, photoUrl, since, library, between } = await loadFriend(
    friendId,
    query,
    user.id,
  );
  const { name } = profile;
  const nights = await getInjection("IListNightsController")(user.id, {
    goingUserId: friendId,
  });
  const today = todayIn(PLAN_TIME_ZONE);

  return (
    <PageColumn
      width="read"
      header={<AppHeader back={{ href: "/friends", label: "Friends" }} />}
    >
      <section className="flex flex-col gap-2.5 rounded-lg border-2 border-foreground bg-card p-3.5">
        <div className="flex items-center gap-3">
          <span
            aria-hidden="true"
            className="relative flex size-13 shrink-0 items-center justify-center overflow-hidden rounded-full border-2 border-foreground bg-secondary font-heading text-26 leading-none font-bold uppercase"
          >
            {photoUrl ? (
              <Image
                src={photoUrl}
                alt=""
                fill
                unoptimized
                className="object-cover"
              />
            ) : (
              name.charAt(0)
            )}
          </span>
          <Piece
            shape={profile.pieceShape}
            color={profile.pieceColor}
            size={36}
          />
          <div className="flex min-w-0 flex-1 flex-col gap-0.5">
            <h1 className="text-2xl leading-tight font-bold wrap-break-word">
              {name}
            </h1>
            <p className="font-mono text-xs font-medium text-muted-foreground">
              Friends since {formatSince(since)}
            </p>
            <p className="font-mono text-xs font-medium text-muted-foreground">
              {games(library.total)}
            </p>
          </div>
        </div>
        {profile.phone && (
          <div className="flex flex-col items-start border-t-2 border-dashed border-foreground pt-1">
            <a
              href={`tel:${profile.phone.replace(/[^\d+]/g, "")}`}
              aria-label={`Call ${name}, ${profile.phone}`}
              className="flex min-h-11 items-center gap-1.5 font-mono text-13 font-medium text-foreground hover:text-destructive"
            >
              <PhoneIcon />
              <span className="border-b-2 border-dashed border-current pb-px">
                {profile.phone}
              </span>
            </a>
            <p className="text-xs text-muted-foreground">
              Only {name}’s friends, and the other person in a loan, see it.
            </p>
          </div>
        )}
      </section>

      <Group label={`${name}’s library`} overList>
        <LibraryList
          path={`/friends/${friendId}`}
          view={parseLibraryView(query)}
          // The count is of games, not copies, as My library's is (B6).
          list={{
            ...library,
            shown: new Set(library.items.map(({ game }) => game.id)).size,
          }}
          owners={[]}
          viewerId={user.id}
          whose={{ friend: name }}
          empty={
            <Empty>
              <EmptyDescription>
                {name} hasn’t added games yet.
              </EmptyDescription>
            </Empty>
          }
        >
          {library.items.map(({ game, card, copy }) => (
            <GameCardRow
              key={copy.id}
              game={game}
              card={card}
              href={`/games/${game.id}`}
              owners={false}
            />
          ))}
        </LibraryList>
      </Group>

      {nights.length > 0 && (
        <Group label={`Game nights ${name} is going to`} overList>
          <List>
            {nights.map((card) => (
              <NightRow key={card.night.id} card={card} today={today} />
            ))}
          </List>
        </Group>
      )}

      <section className="flex flex-col gap-2 rounded-lg border-2 border-foreground bg-card px-3.5 py-3">
        <h2 className="font-heading text-15 font-bold tracking-wide text-destructive uppercase">
          Friendship
        </h2>
        <p className="text-13 leading-snug text-muted-foreground">
          You see each other’s libraries and game nights.
        </p>
        <UnfriendButton
          friendId={friendId}
          name={name}
          lines={unfriendLines(name, between)}
        />
      </section>
    </PageColumn>
  );
}
