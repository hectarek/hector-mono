import { OpenSeat, Piece } from "@/app/_components/piece";
import type { PieceColor, PieceShape } from "@/src/entities/piece";

export type SeatedPerson = {
  id: string;
  shape: PieceShape;
  color: PieceColor;
  // Guests without accounts they bring (R47).
  guests?: number;
};

type Seat =
  | {
      key: string;
      kind: "person" | "guest";
      shape: PieceShape;
      color: PieceColor;
    }
  | { key: string; kind: "open" };

function seatsFor(people: SeatedPerson[], open: number): Seat[] {
  const seats: Seat[] = [];
  for (const person of people) {
    seats.push({
      key: person.id,
      kind: "person",
      shape: person.shape,
      color: person.color,
    });
    for (let guest = 1; guest <= (person.guests ?? 0); guest += 1) {
      seats.push({
        key: `${person.id}-guest-${guest}`,
        kind: "guest",
        shape: "pawn",
        color: person.color,
      });
    }
  }
  for (let seat = 1; seat <= open; seat += 1) {
    seats.push({ key: `open-${seat}`, kind: "open" });
  }
  return seats;
}

// Who's coming to a game night (the design system's Seats): a row of 24px pieces on one
// baseline, people first, each guest a 16px pawn in their member's color right after them
// (screens.md rule 9), then a dashed pawn per open seat. It wraps when the seats don't fit,
// and past `max` pieces it ends in "+18" (a night's card shows 12, screens.md's limits). The
// caller writes the count and the names under it, so the row is hidden from screen readers.
export function Seats({
  people,
  open,
  max,
}: {
  people: SeatedPerson[];
  open: number;
  max?: number;
}) {
  const seats = seatsFor(people, open);
  const shown = max === undefined ? seats : seats.slice(0, max);
  const more = seats.length - shown.length;
  return (
    <div aria-hidden="true" className="flex flex-wrap items-end gap-1.75">
      {shown.map((seat) =>
        seat.kind === "open" ? (
          <OpenSeat key={seat.key} />
        ) : (
          <Piece
            key={seat.key}
            shape={seat.shape}
            color={seat.color}
            size={seat.kind === "guest" ? 16 : 24}
          />
        ),
      )}
      {more > 0 && (
        <span className="font-mono text-13 font-medium">+{more}</span>
      )}
    </div>
  );
}
