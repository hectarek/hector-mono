import type { Fixture, Table } from "./saved-file";

// Plan coordinates are inches from the room's top-left corner, x to the right and y down.
// A positive rotation turns a shape clockwise on screen.

/** How far a seat's center sits beyond the table's edge. */
const CHAIR_OFFSET_INCHES = 12;
/** A seat drawn as a circle this wide, so bounds include the chairs. */
export const CHAIR_DIAMETER_INCHES = 18;

type Point = { x: number; y: number };
type Side = "top" | "right" | "bottom" | "left";
type Bounds = { left: number; top: number; right: number; bottom: number };

export function rotate(point: Point, degrees: number): Point {
  const radians = (degrees * Math.PI) / 180;
  const cos = Math.cos(radians);
  const sin = Math.sin(radians);
  return { x: point.x * cos - point.y * sin, y: point.x * sin + point.y * cos };
}

export function snapToGrid(value: number, gridInches: number): number {
  return Math.round(value / gridInches) * gridInches;
}

/**
 * How many seats each side of a rectangle or square table gets. One side puts every seat on
 * the top side (a head table faces the room); long sides split them top and bottom; all sides
 * shares them by side length, giving leftover seats to the longer sides first.
 */
export function seatsPerSide(table: Table): Record<Side, number> {
  const n = table.seatCount;
  const sides =
    table.seatSides ?? (table.shape === "square" ? "all-sides" : "long-sides");
  if (sides === "one-side") return { top: n, right: 0, bottom: 0, left: 0 };
  if (sides === "long-sides") {
    return {
      top: Math.ceil(n / 2),
      right: 0,
      bottom: Math.floor(n / 2),
      left: 0,
    };
  }

  const w = table.widthInches;
  const d = table.depthInches;
  const perimeter = 2 * (w + d);
  const shares: { side: Side; exact: number }[] = [
    { side: "top", exact: (n * w) / perimeter },
    { side: "bottom", exact: (n * w) / perimeter },
    { side: "right", exact: (n * d) / perimeter },
    { side: "left", exact: (n * d) / perimeter },
  ];
  const counts: Record<Side, number> = { top: 0, right: 0, bottom: 0, left: 0 };
  for (const share of shares) counts[share.side] = Math.floor(share.exact);
  const leftover =
    n - (counts.top + counts.right + counts.bottom + counts.left);
  // A stable sort keeps top before bottom and right before left when remainders tie.
  const byRemainder = [...shares].sort(
    (a, b) => b.exact - Math.floor(b.exact) - (a.exact - Math.floor(a.exact)),
  );
  for (const share of byRemainder.slice(0, leftover)) counts[share.side] += 1;
  return counts;
}

/** Evenly spaced centers along a side of `length`, measured from the side's middle. */
function along(count: number, length: number): number[] {
  return Array.from(
    { length: count },
    (_, i) => (length * (i + 0.5)) / count - length / 2,
  );
}

/**
 * Each seat's center relative to the table's center, before the table turns, in seat order.
 * Seat 0 is at the top of a round table and at the top side's left end of a rectangle or
 * square; the rest follow clockwise.
 */
export function seatOffsets(table: Table): Point[] {
  if (table.shape === "round") {
    const radius = table.widthInches / 2 + CHAIR_OFFSET_INCHES;
    return Array.from({ length: table.seatCount }, (_, i) => {
      const angle = (2 * Math.PI * i) / table.seatCount;
      return { x: Math.sin(angle) * radius, y: -Math.cos(angle) * radius };
    });
  }
  const counts = seatsPerSide(table);
  const halfW = table.widthInches / 2;
  const halfD = table.depthInches / 2;
  return [
    ...along(counts.top, table.widthInches).map((x) => ({
      x,
      y: -(halfD + CHAIR_OFFSET_INCHES),
    })),
    ...along(counts.right, table.depthInches).map((y) => ({
      x: halfW + CHAIR_OFFSET_INCHES,
      y,
    })),
    ...along(counts.bottom, table.widthInches)
      .reverse()
      .map((x) => ({ x, y: halfD + CHAIR_OFFSET_INCHES })),
    ...along(counts.left, table.depthInches)
      .reverse()
      .map((y) => ({ x: -(halfW + CHAIR_OFFSET_INCHES), y })),
  ];
}

/** Where each seat's center is in the plan, after the table turns, in seat order. */
export function seatPositions(table: Table): Point[] {
  return seatOffsets(table).map((offset) => {
    const turned = rotate(offset, table.rotationDegrees);
    return { x: table.xInches + turned.x, y: table.yInches + turned.y };
  });
}

/** How far past its edges an item reaches: a table's chairs, or nothing for a fixture. */
export function chairReach(item: Table | Fixture): number {
  return "seatCount" in item
    ? CHAIR_OFFSET_INCHES + CHAIR_DIAMETER_INCHES / 2
    : 0;
}

/** The box a table (chairs included) or a fixture covers in the plan, after rotation. */
export function itemBounds(item: Table | Fixture): Bounds {
  const pad = chairReach(item);
  const halfW = item.widthInches / 2 + pad;
  const halfD = item.depthInches / 2 + pad;

  if (item.shape === "round" || item.shape === "circle") {
    return {
      left: item.xInches - halfW,
      top: item.yInches - halfD,
      right: item.xInches + halfW,
      bottom: item.yInches + halfD,
    };
  }

  const corners = [
    { x: -halfW, y: -halfD },
    { x: halfW, y: -halfD },
    { x: halfW, y: halfD },
    { x: -halfW, y: halfD },
  ].map((corner) => rotate(corner, item.rotationDegrees));
  const xs = corners.map((c) => c.x);
  const ys = corners.map((c) => c.y);
  return {
    left: item.xInches + Math.min(...xs),
    top: item.yInches + Math.min(...ys),
    right: item.xInches + Math.max(...xs),
    bottom: item.yInches + Math.max(...ys),
  };
}

/** A room-sized length: 66 → 5′ 6″, 60 → 5′. */
export function formatFeet(inches: number): string {
  const feet = Math.floor(inches / 12);
  const rest = inches - feet * 12;
  if (feet === 0) return `${rest}″`;
  return rest === 0 ? `${feet}′` : `${feet}′ ${rest}″`;
}

function overlaps(a: Bounds, b: Bounds): boolean {
  return (
    a.left < b.right && a.right > b.left && a.top < b.bottom && a.bottom > b.top
  );
}

/**
 * Where to put a new item so it covers nothing already placed: its own spot if that's clear,
 * else the nearest clear spot in widening rings around it, two grid steps apart, starting to
 * its right and going clockwise. A spot inside the room wins over one outside it; with no
 * clear spot at all, the item stays where it was asked to go.
 */
export function freeSpot(
  item: Table | Fixture,
  others: readonly (Table | Fixture)[],
  room: { widthInches: number; lengthInches: number; gridInches: number },
): { xInches: number; yInches: number } {
  const step = room.gridInches * 2;
  const rings = Math.ceil(Math.max(room.widthInches, room.lengthInches) / step);
  const placed = others.map(itemBounds);
  let outside: { xInches: number; yInches: number } | null = null;

  for (let ring = 0; ring <= rings; ring++) {
    const spots: { dx: number; dy: number; angle: number }[] = [];
    for (let dy = -ring; dy <= ring; dy++) {
      for (let dx = -ring; dx <= ring; dx++) {
        if (Math.max(Math.abs(dx), Math.abs(dy)) !== ring) continue;
        const angle = (Math.atan2(dy, dx) + 2 * Math.PI) % (2 * Math.PI);
        spots.push({ dx, dy, angle });
      }
    }
    spots.sort((a, b) => a.angle - b.angle);
    for (const { dx, dy } of spots) {
      const spot = {
        xInches: item.xInches + dx * step,
        yInches: item.yInches + dy * step,
      };
      const bounds = itemBounds({ ...item, ...spot });
      if (placed.some((other) => overlaps(bounds, other))) continue;
      const inside =
        bounds.left >= 0 &&
        bounds.top >= 0 &&
        bounds.right <= room.widthInches &&
        bounds.bottom <= room.lengthInches;
      if (inside) return spot;
      outside ??= spot;
    }
  }
  return outside ?? { xInches: item.xInches, yInches: item.yInches };
}
