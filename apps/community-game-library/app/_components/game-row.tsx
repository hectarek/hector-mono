import Link from "next/link";
import { CoverThumb } from "@/app/_components/cover-thumb";
import { IOwnIt } from "@/app/_components/i-own-it";
import { InMyBox } from "@/app/_components/in-my-box";
import {
  ListItem,
  ListRow,
  RowFacts,
  RowLine,
  RowName,
} from "@/app/_components/list-row";
import { Piece } from "@/app/_components/piece";
import { Stamp } from "@/app/_components/stamp";
import type { GameCard } from "@/src/entities/game-card";
import { cardLine, catalogLine } from "@/src/entities/game-facts";
import type { Game } from "@/src/entities/models/game.model";
import { coverColorOf } from "@/src/entities/piece";

// A game's card in a list (B1, and B10's first group): its thumb, title, players and time, whose
// copies, its state, and the member's own stamp; the whole row opens the game's page. The same
// row on every list it appears in (screens.md, Limits to build for). A friend's library (E3)
// leaves out whose: they're all the friend's.
export function GameCardRow({
  game,
  card,
  href,
  owners = true,
}: {
  game: Game;
  card: GameCard;
  href: string;
  owners?: boolean;
}) {
  const facts = cardLine(game);
  return (
    <ListRow
      href={href}
      thumb={<CoverThumb color={coverColorOf(game)} imageUrl={game.imageUrl} />}
      stamp={<Stamp tone={card.stamp.tone}>{card.stamp.word}</Stamp>}
    >
      <RowName>{game.title}</RowName>
      {facts && <RowFacts>{facts}</RowFacts>}
      {owners && (
        <RowLine>
          <span className="flex shrink-0 items-end gap-0.75">
            {card.owners.map((owner) => (
              <Piece
                key={owner.userId}
                shape={owner.pieceShape}
                color={owner.pieceColor}
                size={11}
              />
            ))}
          </span>
          {card.ownerLine}
        </RowLine>
      )}
      <RowLine>{card.stateLine}</RowLine>
    </ListRow>
  );
}

// A catalog game in search (B10's second group, B8): its thumb, its title underlined, then the
// year and the first publisher, or for an expansion whose base game you don't own, "Add Harbor
// Lights first". It opens the game's page. Its action sits beside the link: I own it on a base
// game, In my box on an expansion of one you own. On Add games' one list a game you own already
// is stamped Yours, so it isn't added twice by mistake; a second copy starts on its copy's page.
export function CatalogRow({
  game,
  yours,
  base,
  href,
}: {
  game: Game;
  yours: boolean;
  base: { title: string; yours: boolean; boxed: boolean } | null;
  href: string;
}) {
  const line = catalogLine(game);
  return (
    <ListItem>
      <Link
        href={href}
        transitionTypes={["go-deeper"]}
        className="flex min-w-0 flex-1 items-center gap-3 text-foreground hover:text-destructive focus-visible:-outline-offset-3"
      >
        <CoverThumb color={coverColorOf(game)} imageUrl={game.imageUrl} />
        <span className="flex min-w-0 flex-auto flex-col gap-0.5">
          <RowName>
            <span className="mb-0.75 border-b-2 border-dashed border-current pb-px">
              {game.title}
            </span>
          </RowName>
          {line && (
            <RowFacts>
              {base?.yours ? `${line} of ${base.title}` : line}
            </RowFacts>
          )}
          {base && !base.yours && <RowFacts>Add {base.title} first</RowFacts>}
        </span>
      </Link>
      {game.type === "expansion" ? (
        base?.yours && <InMyBox gameId={game.id} boxed={base.boxed} />
      ) : (
        <IOwnIt gameId={game.id} yours={yours} />
      )}
    </ListItem>
  );
}
