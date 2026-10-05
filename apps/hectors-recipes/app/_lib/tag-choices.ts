// The recipe form's tags (docs/ux-plan.md D33): the book's tags as chips to toggle, plus any
// added with New tag. Saved tags are trimmed and lowercased (the recipe schema), so typed ones
// are tidied the same way here, and one that matches a chip picks that chip.
import {
  TAG_CATEGORIES,
  type TagCategory,
  type TagGroups,
} from "@/src/entities/models/tag.model";

// What's in the New tag box while it's open: the text, and the group picked for it (D55).
export type NewTag = { text: string; group: TagCategory | undefined };

export function tagChoices(suggested: string[], chosen: string[]): string[] {
  return [...suggested, ...chosen.filter((tag) => !suggested.includes(tag))];
}

// The chips under their groups (D55): Meal, Cuisine and Diet, then Other (null) for tags
// without one. Each keeps the chips' order, and a group with no chips is left out.
export function groupTagChoices(
  choices: string[],
  groups: TagGroups,
): { category: TagCategory | null; tags: string[] }[] {
  return [...TAG_CATEGORIES, null]
    .map((category) => ({
      category,
      tags: choices.filter((tag) => (groups[tag] ?? null) === category),
    }))
    .filter((group) => group.tags.length > 0);
}

export function toggleTag(chosen: string[], tag: string): string[] {
  return chosen.includes(tag)
    ? chosen.filter((other) => other !== tag)
    : [...chosen, tag];
}

// Each comma-separated tag in the New tag box that isn't chosen already.
export function addTags(chosen: string[], typed: string): string[] {
  const added = typed
    .split(",")
    .map((tag) => tag.trim().replace(/\s+/g, " ").toLowerCase())
    .filter((tag) => tag && !chosen.includes(tag));
  return [...chosen, ...new Set(added)];
}

// The tags and groups with New tag's added: its tags, given its group unless they have one.
export function withNewTag(
  chosen: string[],
  groups: TagGroups,
  newTag: NewTag | null,
): { chosen: string[]; groups: TagGroups } {
  const next = addTags(chosen, newTag?.text ?? "");
  const group = newTag?.group;
  if (!group) {
    return { chosen: next, groups };
  }
  const added = next.filter((tag) => !chosen.includes(tag));
  return {
    chosen: next,
    groups: {
      ...Object.fromEntries(added.map((tag) => [tag, group])),
      ...groups,
    },
  };
}
