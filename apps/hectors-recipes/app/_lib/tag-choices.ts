// The recipe form's tags (docs/ux-plan.md D33): the book's tags as chips to toggle, plus any
// added with New tag. Saved tags are trimmed and lowercased (the recipe schema), so typed ones
// are tidied the same way here, and one that matches a chip picks that chip.

export function tagChoices(suggested: string[], chosen: string[]): string[] {
  return [...suggested, ...chosen.filter((tag) => !suggested.includes(tag))];
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
