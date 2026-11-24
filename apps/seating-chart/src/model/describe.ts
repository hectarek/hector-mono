import { formatFeet } from "./geometry";
import type { Fixture, Table } from "./saved-file";

/** What a screen reader says for an item in the "On the plan" list (the spec's R9). */
export function describeItem(item: Table | Fixture, seated: number): string {
  if ("seatCount" in item) {
    const shape =
      item.shape === "rectangle"
        ? `rectangle ${item.widthInches} by ${item.depthInches} inches`
        : `${item.shape} ${item.widthInches} inches`;
    return `${item.label}, ${shape}, ${seated} of ${item.seatCount} seats filled`;
  }
  const size =
    item.shape === "circle"
      ? `${formatFeet(item.widthInches)} across`
      : `${formatFeet(item.widthInches)} by ${formatFeet(item.depthInches)}`;
  return `${item.label}, ${size}`;
}

/** Tables by number, then named tables, then shapes, as the list shows them. */
export function listOrder(plan: {
  tables: Table[];
  fixtures: Fixture[];
}): (Table | Fixture)[] {
  const tableNumber = (table: Table) => {
    const match = /^Table (\d+)$/.exec(table.label);
    return match ? Number(match[1]) : Number.POSITIVE_INFINITY;
  };
  const tables = [...plan.tables].sort(
    (a, b) => tableNumber(a) - tableNumber(b) || a.label.localeCompare(b.label),
  );
  const fixtures = [...plan.fixtures].sort((a, b) =>
    a.label.localeCompare(b.label),
  );
  return [...tables, ...fixtures];
}
