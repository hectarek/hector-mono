// Keys for a loading skeleton's repeated rows. The rows never reorder, but React keys must
// not be array indexes (Biome's noArrayIndexKey), so each gets a fixed name.
export function placeholders(count: number): string[] {
  return Array.from(
    { length: count },
    (_, index) => `placeholder-${index + 1}`,
  );
}
