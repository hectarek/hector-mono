import Link from "next/link";
import type { ReactNode } from "react";
import { type CopyLine, CopyLines } from "@/app/_components/copy-state";
import { ForwardIcon } from "@/app/_components/icons";
import { RowName } from "@/app/_components/list-row";
import { Piece } from "@/app/_components/piece";
import { Stamp } from "@/app/_components/stamp";
import type { CopyStamp } from "@/src/entities/loan";
import type { NameAndPiece } from "@/src/entities/models/user-profile.model";

// A copy in a game's Copies (B5, B11, B13): its owner's 20px piece, "Sam’s copy", the lines its
// state gives, and the person looking's own stamp. A copy with a page for the person looking (their
// own, or the request they sent) is one link with a chevron, as ListRow; the rest show their state
// where they stand, with the button it offers at the right (Borrow, Join the line, Leave the line).
export function CopyRow({
  name,
  owner,
  lines,
  stamp,
  href,
  action,
}: {
  name: string;
  owner: NameAndPiece;
  lines: readonly CopyLine[];
  stamp: CopyStamp | null;
  href?: string;
  action?: ReactNode;
}) {
  const body: ReactNode = (
    <>
      <Piece shape={owner.pieceShape} color={owner.pieceColor} size={20} />
      <span className="flex min-w-0 flex-1 flex-wrap items-center gap-x-3 gap-y-1.5">
        <span className="flex min-w-0 flex-auto flex-col gap-0.5">
          <RowName>{name}</RowName>
          <CopyLines lines={lines} />
        </span>
        {stamp && <Stamp tone={stamp.tone}>{stamp.word}</Stamp>}
        {action}
      </span>
    </>
  );
  return (
    <li>
      {href ? (
        <Link
          href={href}
          className="flex min-h-12 items-center gap-2.5 px-3 py-2.5 text-foreground hover:text-destructive focus-visible:-outline-offset-3"
        >
          {body}
          <ForwardIcon />
        </Link>
      ) : (
        <div className="flex items-center gap-2.5 px-3 py-2.5">{body}</div>
      )}
    </li>
  );
}

const ORDINALS = ["", "second", "third", "fourth", "fifth"];

// "Your copy", "Sam’s copy", and "Sam’s second copy" for an owner's next copy of the game (B13).
export function copyName(owner: string | null, place: number): string {
  const whose = owner === null ? "Your" : `${owner}’s`;
  const which = place > 1 ? `${ORDINALS[place - 1] ?? `${place}th`} ` : "";
  return `${whose} ${which}copy`;
}
