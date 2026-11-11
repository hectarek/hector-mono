import type { Season } from "./models/settings.model";
import { daysBetween } from "./week";

// A leg of the search season's track (R9 as revised 2026-11-10, the design system's TrackMap):
// the stretch from the start or a checkpoint to the next checkpoint or the finish, with its length
// in days and how far along the season its end falls, from 0 to 1.
export type Leg = {
  // 1 for the first leg, from the start to the first checkpoint.
  sector: number;
  startsOn: string;
  endsOn: string;
  // The checkpoint it ends at, or null for the leg that ends at the finish.
  name: string | null;
  days: number;
  share: number;
};

// Where a day falls in the season: how far along it is, from 0 at the start to 1 at the finish,
// and within the season, the leg it's on and its day of that leg. Before the start and after the
// finish it sits at either end, on no leg.
export type SeasonPlace =
  | { when: "before"; share: 0 }
  | { when: "after"; share: 1 }
  | { when: "during"; share: number; leg: Leg; day: number };

// The season's legs in order: one to each checkpoint, then one to the finish.
export function legsOf({ start, finish, checkpoints }: Season): Leg[] {
  const total = daysBetween(start, finish);
  const ends = [...checkpoints, { on: finish, name: null }];
  return ends.map(({ on, name }, index) => {
    const startsOn = ends[index - 1]?.on ?? start;
    return {
      sector: index + 1,
      startsOn,
      endsOn: on,
      name,
      days: daysBetween(startsOn, on),
      share: daysBetween(start, on) / total,
    };
  });
}

// Where today falls. A leg runs from its first day up to the day before it ends, so a
// checkpoint's day is the next leg's first, and the last leg holds the finish's day too.
export function placeOf(season: Season, today: string): SeasonPlace {
  if (today < season.start) {
    return { when: "before", share: 0 };
  }
  if (today > season.finish) {
    return { when: "after", share: 1 };
  }
  const share =
    daysBetween(season.start, today) / daysBetween(season.start, season.finish);
  for (const leg of legsOf(season)) {
    if (today < leg.endsOn || leg.endsOn === season.finish) {
      return {
        when: "during",
        share,
        leg,
        day: daysBetween(leg.startsOn, today) + 1,
      };
    }
  }
  // The last leg ends at the finish, so the loop has always answered by here.
  return { when: "after", share: 1 };
}
