import { Empty, EmptyDescription } from "@repo/ui/components/empty";
import Image from "next/image";
import { connection } from "next/server";
import { AppHeader } from "@/app/_components/app-header";
import { Group } from "@/app/_components/group";
import { SearchIcon } from "@/app/_components/icons";
import { PageColumn } from "@/app/_components/page-column";
import { Piece } from "@/app/_components/piece";
import { gate } from "@/app/_lib/account";
import { adminRead } from "@/app/(main)/admin/admin-reads";
import { AnswerForm } from "@/app/(main)/admin/suggestions/[id]/answer-form";
import { getInjection } from "@/di/container";
import { formatDay, formatTime } from "@/src/entities/week";

// G2, a suggestion (R4): what was sent, whether the catalog has it (a search, the suggestion's
// title to start), and the admin's answer. Only what was sent shows (rule 14).
export default async function SuggestionPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  await connection();
  const { user } = await gate("app");
  const { id } = await params;
  const { q } = await searchParams;
  const { suggestion, by } = await adminRead(() =>
    getInjection("IGetSuggestionController")({ suggestionId: id }, user.id),
  );
  const search = typeof q === "string" ? q : suggestion.title.toLowerCase();
  const matches = await adminRead(() =>
    getInjection("IFindGamesToEditController")({ q: search }, user.id),
  );
  const who = by?.name ?? "Someone";
  const sent = new Date();
  const day = formatDay(suggestion.createdAt, sent);
  const facts = [
    ["Title", suggestion.title],
    ["Year", suggestion.year === null ? null : `${suggestion.year}`],
    ["Publisher", suggestion.publisher],
  ] as const;

  return (
    <PageColumn
      width="read"
      header={<AppHeader back={{ href: "/admin", label: "Admin" }} />}
    >
      <h1 className="text-2xl leading-7 font-bold">{suggestion.title}</h1>
      <Group label={`What ${who} sent`}>
        <div className="flex items-center gap-2.5">
          {by && (
            <Piece shape={by.pieceShape} color={by.pieceColor} size={20} />
          )}
          <span className="flex flex-col gap-0.5">
            <span className="text-15 font-bold">{who} suggested it</span>
            <span className="font-mono text-2xs font-medium text-muted-foreground">
              {`${day.charAt(0).toUpperCase()}${day.slice(1)}`},{" "}
              {formatTime(suggestion.createdAt)}
            </span>
          </span>
        </div>
        <dl className="flex flex-col gap-2">
          {facts.map(([term, value]) =>
            value === null ? null : (
              <div key={term} className="flex flex-col gap-px">
                <dt
                  className="font-mono text-2xs font-medium tracking-wider uppercase"
                  data-ink="smudge"
                >
                  {term}
                </dt>
                <dd className="text-sm">{value}</dd>
              </div>
            ),
          )}
          {suggestion.sourceUrl && (
            <div className="flex flex-col gap-px">
              <dt
                className="font-mono text-2xs font-medium tracking-wider uppercase"
                data-ink="smudge"
              >
                Link
              </dt>
              <dd className="text-sm">
                <a
                  href={suggestion.sourceUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex min-h-11 items-start font-semibold break-all text-foreground hover:text-destructive"
                >
                  <span className="border-b-2 border-dashed border-current pb-px">
                    {suggestion.sourceUrl.replace(/^https?:\/\//, "")}
                  </span>
                </a>
              </dd>
            </div>
          )}
        </dl>
        {suggestion.imageUrl && (
          <Image
            src={suggestion.imageUrl}
            alt="Photo of the box"
            width={320}
            height={240}
            unoptimized
            className="h-auto w-full rounded-sm border-2 border-foreground"
          />
        )}
      </Group>
      <Group label="Is it in the catalog?">
        <form className="flex h-11 items-center gap-2 rounded-lg border-2 border-foreground bg-secondary pl-3">
          <SearchIcon />
          <input
            type="search"
            name="q"
            aria-label="Is it in the catalog?"
            defaultValue={search}
            className="h-9 min-w-0 flex-1 bg-transparent text-15 text-foreground focus-visible:outline-none"
          />
        </form>
        {matches.length === 0 ? (
          <Empty>
            <EmptyDescription>No match in the catalog.</EmptyDescription>
          </Empty>
        ) : (
          <ul className="flex flex-col gap-1 text-sm">
            {matches.map((game) => (
              <li key={game.id}>
                {game.title}
                {game.year !== null && ` (${game.year})`}
              </li>
            ))}
          </ul>
        )}
      </Group>
      {suggestion.status === "waiting" && (
        <AnswerForm
          suggestionId={suggestion.id}
          who={who}
          matches={matches.map((game) => ({
            id: game.id,
            label:
              game.year === null ? game.title : `${game.title} (${game.year})`,
          }))}
        />
      )}
    </PageColumn>
  );
}
