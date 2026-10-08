import type { Space } from "@/src/entities/models/space.model";

// Where a space "lives" in the app, e.g. after joining one.
export function spaceHref(space: Pick<Space, "id" | "type">): string {
  switch (space.type) {
    case "recipe-book":
      return `/?book=${space.id}`;
    case "meal-plan":
      return `/plan?plan=${space.id}`;
  }
}

// The tab to land on once a space of this type is gone (deleted or left).
export const SPACE_TYPE_HOME: Record<Space["type"], string> = {
  "recipe-book": "/books",
  "meal-plan": "/plan",
};

export const SPACE_TYPE_LABELS: Record<Space["type"], string> = {
  "recipe-book": "recipe book",
  "meal-plan": "meal plan",
};

// What joining or deleting one covers, for sentences: a plan's grocery list comes with it.
export const SPACE_TYPE_CONTENTS: Record<Space["type"], string> = {
  "recipe-book": "recipe book",
  "meal-plan": "meal plan (with its groceries)",
};
