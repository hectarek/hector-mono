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
import { gate } from "@/app/_lib/account";
import { SIGN_OUT_HREF } from "@/app/_lib/auth-paths";
import { getInjection } from "@/di/container";
import { UnauthorizedError } from "@/src/entities/errors/common";

// E5: the member's own page, reached from the piece at the top. Its profile first, then the rows
// the app's other pages add as they're built: My library (U7), Notices I get (U11), Admin (U9),
// Delete my account (U22) and About the catalog (U24).
export default async function YouPage() {
  await connection();
  const { user } = await gate("app");
  const { profile, photoUrl } = await getInjection("IGetProfileController")(
    { userId: user.id },
    user.id,
  );
  // The admin's row (DE-25), with the suggestions waiting: anyone else is refused, and has none.
  const waiting = await getInjection("IListSuggestionsController")(
    user.id,
  ).catch((err: unknown) => {
    if (err instanceof UnauthorizedError) {
      return null;
    }
    throw err;
  });

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
              render={<Link href="/you/edit" />}
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
          {waiting && (
            <ListRow
              href="/admin"
              stamp={<Stamp tone="navy">Admin</Stamp>}
              aside={
                waiting.length > 0 && (
                  <span
                    role="img"
                    aria-label={`${waiting.length} waiting`}
                    className="text-13 font-bold text-destructive"
                  >
                    {waiting.length}
                  </span>
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
          <li className="px-3 py-2.5 font-mono text-xs font-medium text-muted-foreground">
            Signed in as {user.email}
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
