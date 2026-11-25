"use client";

import { RadioGroup, RadioGroupItem } from "@repo/ui/components/radio-group";
import { Piece } from "@/app/_components/piece";
import {
  PIECE_COLORS,
  PIECE_SHAPES,
  type PieceColor,
  type PieceShape,
} from "@/src/entities/piece";

const CHOICE =
  "flex cursor-pointer flex-col items-center gap-1.5 rounded-lg pt-2 pb-1.5 has-data-checked:outline-2 has-data-checked:outline-dashed has-data-checked:outline-foreground";

const CAPTION = "font-mono text-10 font-medium uppercase";

const LABEL = "font-mono text-2xs font-medium tracking-wider uppercase";

// A member's piece (R51; A4, E6): a shape of four and a color of ten, each a radio under its
// drawing, so the form sends them as `pieceShape` and `pieceColor`. The big piece beside the
// words is the one chosen, and is drawn by the form.
export function PiecePicker({
  shape,
  color,
  onShape,
  onColor,
}: {
  shape: PieceShape;
  color: PieceColor;
  onShape: (shape: PieceShape) => void;
  onColor: (color: PieceColor) => void;
}) {
  return (
    <>
      <div className="flex flex-col gap-2">
        <span id="piece-shape-label" data-ink="smudge" className={LABEL}>
          Shape
        </span>
        <RadioGroup
          name="pieceShape"
          value={shape}
          onValueChange={(value) => onShape(value as PieceShape)}
          aria-labelledby="piece-shape-label"
          className="grid-cols-4"
        >
          {PIECE_SHAPES.map((option) => (
            <label
              key={option}
              htmlFor={`piece-shape-${option}`}
              className={CHOICE}
            >
              <Piece shape={option} color={color} size={24} />
              <RadioGroupItem id={`piece-shape-${option}`} value={option} />
              <span data-ink="smudge" className={CAPTION}>
                {option}
              </span>
            </label>
          ))}
        </RadioGroup>
      </div>
      <div className="flex flex-col gap-2">
        <span id="piece-color-label" data-ink="smudge" className={LABEL}>
          Color
        </span>
        <RadioGroup
          name="pieceColor"
          value={color}
          onValueChange={(value) => onColor(value as PieceColor)}
          aria-labelledby="piece-color-label"
          className="grid-cols-5"
        >
          {PIECE_COLORS.map((option) => (
            <label
              key={option}
              htmlFor={`piece-color-${option}`}
              className={CHOICE}
            >
              <span
                aria-hidden="true"
                data-color={option}
                className="size-7 rounded-full border-2 border-foreground"
              />
              <RadioGroupItem id={`piece-color-${option}`} value={option} />
              <span data-ink="smudge" className={CAPTION}>
                {option}
              </span>
            </label>
          ))}
        </RadioGroup>
      </div>
    </>
  );
}
