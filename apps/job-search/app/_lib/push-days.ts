import { addDays, mondayOf } from "@/src/entities/week";

// The days a next step can be given in one tap, from today: Today's sheet (Push, and Done's
// When) and a list's step with no date (the UX plan's UX3 and UX6).
export function pushDays(today: string) {
  return [
    { label: "Tomorrow", day: addDays(today, 1) },
    { label: "In 3 days", day: addDays(today, 3) },
    { label: "Next Monday", day: addDays(mondayOf(today), 7) },
    { label: "In a week", day: addDays(today, 7) },
  ];
}
