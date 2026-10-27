// What the mocks' updates set updatedAt to, as the table's do (base.repository.ts
// nextUpdatedAt): now, or a millisecond on from the value it holds when now isn't later.
export function nextUpdatedAt(previous: Date): Date {
  return new Date(Math.max(Date.now(), previous.getTime() + 1));
}
