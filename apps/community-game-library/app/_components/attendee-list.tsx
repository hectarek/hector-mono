import { List, ListItem } from "@/app/_components/list-row";
import { Piece } from "@/app/_components/piece";
import type { NameAndPiece } from "@/src/entities/models/user-profile.model";

type Goer = NameAndPiece & { guestCount: number };

// Each person, then a row for each guest they bring, keyed by who brings them.
function rowsOf(going: readonly Goer[]) {
  const rows: { key: string; person: Goer; guest: boolean }[] = [];
  for (const person of going) {
    rows.push({ key: person.userId, person, guest: false });
    for (let guest = 1; guest <= person.guestCount; guest += 1) {
      rows.push({
        key: `${person.userId}-guest-${guest}`,
        person,
        guest: true,
      });
    }
  }
  return rows;
}

// Who's going to a night, as its host sees them (D7): each person's piece and name, "You" for the
// member, "Host" under the host and "Bringing 1 guest" under someone who is, then a row for each
// guest, a smaller pawn in their member's color named for them (screens.md rule 9).
export function AttendeeList({
  going,
  hostId,
  viewerId,
}: {
  going: readonly Goer[];
  hostId: string;
  viewerId: string;
}) {
  const nameOf = (person: Goer) =>
    person.userId === viewerId ? "You" : person.name;
  return (
    <List>
      {rowsOf(going).map(({ key, person, guest }) =>
        guest ? (
          <ListItem key={key}>
            <Piece shape="pawn" color={person.pieceColor} size={14} />
            <span className="text-15 font-bold">
              {person.userId === viewerId ? "Your" : `${person.name}’s`} guest
            </span>
          </ListItem>
        ) : (
          <ListItem key={key}>
            <Piece
              shape={person.pieceShape}
              color={person.pieceColor}
              size={20}
            />
            <span className="flex min-w-0 flex-1 flex-col gap-0.5">
              <span className="text-15 font-bold">{nameOf(person)}</span>
              {person.userId === hostId ? (
                <span className="text-xs text-muted-foreground">Host</span>
              ) : (
                person.guestCount > 0 && (
                  <span className="text-xs text-muted-foreground">
                    Bringing {person.guestCount}{" "}
                    {person.guestCount === 1 ? "guest" : "guests"}
                  </span>
                )
              )}
            </span>
          </ListItem>
        ),
      )}
    </List>
  );
}
