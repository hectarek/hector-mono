import { Track, type TrackSpace } from "@/app/_components/track";
import type { PieceColor, PieceShape } from "@/src/entities/piece";
import { addDays, daysBetween, formatWeekday } from "@/src/entities/week";

const weekday = (day: string) => formatWeekday(day).toUpperCase();

// A loan's spaces on the design system's Track: a space a day up to a week (from today, or from the
// pick-up while it's still to come, to the due day), a space a week after that, the due space red,
// and, once it's late, the last days up to the due one and a "+2" space where the piece stands.
export function trackSpaces(
  pickedUpOn: string,
  dueOn: string,
  today: string,
): { spaces: TrackSpace[]; today: number } {
  const late = daysBetween(dueOn, today);
  if (late > 0) {
    const days = [2, 1, 0]
      .map((back) => addDays(dueOn, -back))
      .filter((day) => day >= pickedUpOn);
    const spaces: TrackSpace[] = [
      ...days.map((day) => ({
        id: day,
        label: weekday(day),
        due: day === dueOn,
      })),
      { label: `+${late}`, late: true },
    ];
    return { spaces, today: spaces.length - 1 };
  }
  const period = daysBetween(pickedUpOn, dueOn);
  if (period <= 7) {
    const start = today > pickedUpOn ? today : pickedUpOn;
    const spaces = Array.from(
      { length: daysBetween(start, dueOn) + 1 },
      (_, index) => {
        const day = addDays(start, index);
        return { id: day, label: weekday(day), due: day === dueOn };
      },
    );
    return { spaces, today: Math.max(0, daysBetween(start, today)) };
  }
  const weeks = Math.ceil(period / 7);
  return {
    spaces: Array.from({ length: weeks }, (_, index) => ({
      label: `WK ${index + 1}`,
      due: index === weeks - 1,
    })),
    today: Math.min(
      weeks - 1,
      Math.max(0, Math.floor(daysBetween(pickedUpOn, today) / 7)),
    ),
  };
}

// The track of a loan that's out, or of one about to be picked up on a day (C3's preview), with the
// borrower's piece on today. The page says the dates in text (aria-hidden track).
export function LoanTrack({
  pickedUpOn,
  dueOn,
  today,
  borrower,
}: {
  pickedUpOn: string;
  dueOn: string;
  today: string;
  borrower: { pieceShape: PieceShape; pieceColor: PieceColor };
}) {
  const track = trackSpaces(pickedUpOn, dueOn, today);
  return (
    <Track
      spaces={track.spaces}
      today={track.today}
      borrower={{ shape: borrower.pieceShape, color: borrower.pieceColor }}
    />
  );
}
