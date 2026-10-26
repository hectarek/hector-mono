// Text in code-point order, as Postgres sorts it with `collate "C"`: the order the repositories ask
// for and their mocks keep, so the two agree whatever the database's own collation.
export function byCodePoint(a: string, b: string): number {
  if (a === b) {
    return 0;
  }
  return a < b ? -1 : 1;
}
