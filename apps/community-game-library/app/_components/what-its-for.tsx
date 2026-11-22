import { DicePair } from "@/app/_components/dice";
import { Piece } from "@/app/_components/piece";

// A1's and A3's three lines on what the app is for.
export function WhatItsFor() {
  return (
    <ul className="mt-4 flex flex-col rounded-lg border-2 border-foreground bg-card *:border-dashed *:border-foreground *:not-first:border-t-2">
      <li className="flex items-center gap-3.5 p-3.5">
        <span
          aria-hidden="true"
          className="flex h-11 w-21 shrink-0 items-end justify-center gap-1"
        >
          <Piece shape="house" color="brick" size={24} />
          <Piece shape="house" color="ocean" size={24} />
          <Piece shape="pawn" color="mustard" size={24} />
        </span>
        <span className="flex-1 text-15 leading-snug font-semibold">
          See what your friends own.
        </span>
      </li>
      <li className="flex items-center gap-3.5 p-3.5">
        <span
          aria-hidden="true"
          className="flex w-21 shrink-0 flex-col gap-0.5"
        >
          <span className="flex">
            <span className="flex flex-1 justify-center">
              <Piece shape="pawn" color="mustard" size={16} />
            </span>
            <span className="flex-3" />
          </span>
          <span className="flex">
            <span className="h-4 flex-1 border-2 border-foreground bg-secondary" />
            <span className="h-4 flex-1 border-2 border-l-0 border-foreground bg-secondary" />
            <span className="h-4 flex-1 border-2 border-l-0 border-foreground bg-secondary" />
            <span className="h-4 flex-1 border-2 border-l-0 border-foreground bg-destructive" />
          </span>
        </span>
        <span className="flex-1 text-15 leading-snug font-semibold">
          Borrow a game and know when it’s due.
        </span>
      </li>
      <li className="flex items-center gap-3.5 p-3.5">
        <span className="flex w-21 shrink-0 justify-center">
          <DicePair onBone />
        </span>
        <span className="flex-1 text-15 leading-snug font-semibold">
          Plan a game night and pick what to play.
        </span>
      </li>
    </ul>
  );
}
