import { Button } from "@repo/ui/components/button";
import Image from "next/image";
import Link from "next/link";
import { connection } from "next/server";
import { AppHeader } from "@/app/_components/app-header";
import { Group } from "@/app/_components/group";
import { PhoneIcon, SignOutIcon } from "@/app/_components/icons";
import { List, ListRow } from "@/app/_components/list-row";
import { PageColumn } from "@/app/_components/page-column";
import { Piece } from "@/app/_components/piece";
import { Stamp } from "@/app/_components/stamp";
import { TabCount } from "@/app/_components/tab-count";
import { gate } from "@/app/_lib/account";
import { SIGN_OUT_HREF } from "@/app/_lib/auth-paths";
import { getInjection } from "@/di/container";
import { UnauthorizedError } from "@/src/entities/errors/common";
import { signedInLine } from "@/src/entities/ways-in";

const games = (count: number) =>
  count === 0 ? "No games yet" : count === 1 ? "1 game" : `${count} games`;

// E5: the member's own page, reached from the piece at the top. Its profile first, then the rows
// the app's other pages add as they're built: My library (U7) with how many games are in it, Past
// loans (U16), Notices I get (U11), Admin (U9), Delete my account (U22), About the catalog (U24),
// and the privacy policy and terms of use. Account says how the member signs in, and the email.
export default async function YouPage() {
  await connection();
  const { user } = await gate("app");
  const { profile, photoUrl } = await getInjection("IGetProfileController")(
    { userId: user.id },
    user.id,
  );
  // My library as its page reads it, for the row's count: the games before any filter.
  const library = await getInjection("IListMyLibraryController")({}, user.id);
  // The admin's row (DE-25), with the suggestions waiting: anyone else is refused, and has none.
  const waiting = await getInjection("IListSuggestionsController")(
    user.id,
  ).catch((err: unknown) => {
    if (err instanceof UnauthorizedError) {
      return null;
    }
    throw err;
  });
  // How the account signs in, for Account's first line (Hector, 2026-11-25).
  const waysIn = await getInjection("IListWaysInController")(user.id);

  return (
    <PageColumn
      width="read"
      header={<AppHeader back={{ href: "/", label: "Library" }} />}
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
              profile.name.charAt(0)
            )}
          </span>
          <Piece
            shape={profile.pieceShape}
            color={profile.pieceColor}
            size={36}
          />
          <div className="flex min-w-0 flex-1 flex-col items-start gap-2">
            <h1 className="text-2xl leading-tight font-bold wrap-break-word">
              {profile.name}
            </h1>
            <Button
              size="sm"
              variant="secondary"
              nativeButton={false}
              render={<Link href="/you/edit" transitionTypes={["go-deeper"]} />}
            >
              Edit profile and piece
            </Button>
          </div>
        </div>
        {profile.phone && (
          <div className="flex flex-col gap-1 border-t-2 border-dashed border-foreground pt-2.5">
            <p className="flex items-center gap-2 font-mono text-sm font-medium">
              <PhoneIcon />
              {profile.phone}
            </p>
            <p className="text-xs text-muted-foreground">
              Only your friends, and the other person in a loan, see it.
            </p>
          </div>
        )}
      </section>

      <Group label="Games and loans" overList>
        <List>
          <ListRow href="/my-library" aside={games(library.total)}>
            <span className="text-15 font-bold">My library</span>
          </ListRow>
          <ListRow href="/loans/past">
            <span className="text-15 font-bold">Past loans</span>
          </ListRow>
        </List>
      </Group>

      <Group label="The app" overList>
        <List>
          <ListRow href="/you/notices">
            <span className="text-15 font-bold">Notices I get</span>
          </ListRow>
          <ListRow href="/start/home-screen?from=you">
            <span className="text-15 font-bold">
              Put the app on my home screen
            </span>
          </ListRow>
          <ListRow href="/you/catalog">
            <span className="text-15 font-bold">About the catalog</span>
          </ListRow>
          <ListRow href="/privacy">
            <span className="text-15 font-bold">Privacy policy</span>
          </ListRow>
          <ListRow href="/terms">
            <span className="text-15 font-bold">Terms of use</span>
          </ListRow>
          {waiting && (
            <ListRow
              href="/admin"
              stamp={<Stamp tone="navy">Admin</Stamp>}
              aside={
                waiting.length > 0 && (
                  <>
                    <TabCount count={waiting.length} on="row" />
                    <span className="sr-only">{waiting.length} waiting</span>
                  </>
                )
              }
            >
              <span className="text-15 font-bold">Admin</span>
            </ListRow>
          )}
        </List>
      </Group>

      <Group label="Account" overList>
        <ul className="flex flex-col rounded-lg border-2 border-foreground bg-card *:border-dashed *:border-foreground *:not-first:border-t-2">
          <li className="px-3 py-2.5 font-mono text-xs font-medium wrap-break-word text-muted-foreground">
            {signedInLine(waysIn, user.email)}
          </li>
          <li>
            {/* A plain link, so it loads the whole page as Neon's own links do and is never
                prefetched: the sign-out page ends the session. */}
            <a
              href={SIGN_OUT_HREF}
              className="flex min-h-12 items-center gap-3 px-3 py-2.5 text-15 font-bold text-foreground hover:text-destructive"
            >
              <SignOutIcon />
              Sign out
            </a>
          </li>
          <ListRow href="/you/delete">
            <span className="text-15 font-bold">Delete my account</span>
          </ListRow>
        </ul>
      </Group>
    </PageColumn>
  );
}
