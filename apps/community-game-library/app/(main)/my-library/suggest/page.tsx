import { connection } from "next/server";
import { AppHeader } from "@/app/_components/app-header";
import { PageColumn } from "@/app/_components/page-column";
import { gate } from "@/app/_lib/account";
import { SuggestForm } from "@/app/(main)/my-library/suggest/suggest-form";

// B9, Suggest a game (R4): opened from a search that found nothing, with what was typed. The way
// back is that search: the Library's, or Add games' (`from=add`).
export default async function SuggestPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  await connection();
  await gate("app");
  const { title, from } = await searchParams;
  const typed = typeof title === "string" ? title.trim().slice(0, 200) : "";
  const search = typed ? `?q=${encodeURIComponent(typed)}` : "";
  const back = from === "add" ? `/my-library/add${search}` : `/${search}`;

  return (
    <PageColumn
      width="read"
      header={<AppHeader back={{ href: back, label: "Search" }} />}
    >
      <h1 className="text-2xl leading-7 font-bold">Suggest a game</h1>
      <p className="text-sm leading-5">
        {typed && <>We couldn’t find “{typed}”. </>}
        Tell us what it is, and the admin will add it or tell you why not. If
        it’s added, it lands in your library.
      </p>
      <SuggestForm title={typed} />
    </PageColumn>
  );
}
