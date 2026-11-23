import { Button } from "@repo/ui/components/button";
import Link from "next/link";
import { AppHeader } from "@/app/_components/app-header";
import { PageColumn } from "@/app/_components/page-column";

const SOURCE_LINK =
  "font-bold underline decoration-dashed decoration-2 underline-offset-4";

// About the catalog (U24, the row Y1 draws on You): where the catalog's games and their facts come
// from (docs/catalog-data.md, The plan), the sources' credit, and the way in for a game it lacks.
// It reads nothing, so it prerenders whole.
export default function AboutCatalogPage() {
  return (
    <PageColumn
      width="read"
      header={<AppHeader back={{ href: "/you", label: "You" }} />}
    >
      <div className="flex flex-col gap-1.5">
        <h1 className="text-2xl leading-7 font-bold">About the catalog</h1>
        <p className="text-13 leading-snug text-muted-foreground">
          Every game you add to your library comes from the catalog. It holds
          the published board, card and party games on Wikidata. Where Wikidata
          lacks a fact, such as the players or the play time, it comes from the
          game’s page on English Wikipedia.
        </p>
      </div>
      <p className="text-15">
        Game facts from{" "}
        <a
          href="https://www.wikidata.org"
          target="_blank"
          rel="noreferrer"
          className={SOURCE_LINK}
        >
          Wikidata
        </a>{" "}
        and{" "}
        <a
          href="https://en.wikipedia.org"
          target="_blank"
          rel="noreferrer"
          className={SOURCE_LINK}
        >
          Wikipedia
        </a>
        .
      </p>
      <Button
        variant="link"
        nativeButton={false}
        render={<Link href="/my-library/suggest" />}
        className="self-start"
      >
        Can’t find a game? Suggest one
      </Button>
    </PageColumn>
  );
}
