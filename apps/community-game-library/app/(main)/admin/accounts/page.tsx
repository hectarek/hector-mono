import { connection } from "next/server";
import { AppHeader } from "@/app/_components/app-header";
import { Group } from "@/app/_components/group";
import { PageColumn } from "@/app/_components/page-column";
import { gate } from "@/app/_lib/account";
import { RemoveAccount } from "@/app/(main)/admin/accounts/remove-account";
import { adminRead } from "@/app/(main)/admin/admin-reads";
import { LibrarySearch } from "@/app/(main)/library-search";
import { getInjection } from "@/di/container";

// G8, Remove an account (R41): the admin finds the account by name (?q= holds what's typed),
// picks it, and removes it after its dialog. Anyone but the admin gets Not found.
export default async function RemoveAccountPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  await connection();
  const { user } = await gate("app");
  const { q } = await searchParams;
  const search = typeof q === "string" ? q : "";
  const accounts = await adminRead(() =>
    getInjection("IListAccountsController")({ search }, user.id),
  );

  return (
    <PageColumn
      width="read"
      header={<AppHeader back={{ href: "/admin", label: "Admin" }} />}
    >
      <div className="flex flex-col gap-1">
        <h1 className="text-2xl leading-7 font-bold">Remove an account</h1>
        <p className="text-13 leading-snug text-muted-foreground">
          For an account that misuses the app. The person’s games disappear from
          their friends’ libraries.
        </p>
      </div>
      <Group label="Find the account">
        <LibrarySearch initial={search} path="/admin/accounts" label="Name" />
        {search.trim() !== "" && accounts.length === 0 && (
          <p className="text-13 text-muted-foreground">
            No account has that name.
          </p>
        )}
      </Group>
      {accounts.length > 0 && (
        <RemoveAccount
          key={search}
          accounts={accounts.map(({ profile, games, openLoans }) => ({
            userId: profile.userId,
            name: profile.name,
            pieceShape: profile.pieceShape,
            pieceColor: profile.pieceColor,
            joined: profile.createdAt.toISOString(),
            games,
            openLoans,
          }))}
        />
      )}
    </PageColumn>
  );
}
