// How a form saves only what it changed, and meets a conflict (R22, docs/build-plan.md KTD15). A
// form holds each field as typed text, and keeps the record as it opened. A save sends only the
// fields changed since then, against the updatedAt read with it, so a field someone else changed
// meanwhile is left as they set it.

// The fields typed differently from how the form opened: all a save sends.
export function editedFields<K extends string>(
  fields: Record<K, string>,
  opened: Record<K, string>,
): K[] {
  return keysOf(fields).filter((key) => fields[key] !== opened[key]);
}

// After a conflict, the form stays open on the record as it is now: a field left alone takes its
// current value, a field typed keeps what was typed, and the fields that changed since the form
// opened are listed, so a save against the current updatedAt is made knowing them.
export function rebased<K extends string>(
  fields: Record<K, string>,
  opened: Record<K, string>,
  current: Record<K, string>,
): { fields: Record<K, string>; changed: K[] } {
  const typed = new Set(editedFields(fields, opened));
  const next = { ...fields };
  for (const key of keysOf(current)) {
    if (!typed.has(key)) {
      next[key] = current[key];
    }
  }
  return {
    fields: next,
    changed: keysOf(current).filter((key) => current[key] !== opened[key]),
  };
}

function keysOf<K extends string>(record: Record<K, string>): K[] {
  return Object.keys(record) as K[];
}
