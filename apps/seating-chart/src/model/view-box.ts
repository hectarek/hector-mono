// The part of the plan the canvas shows, in plan inches: an SVG viewBox. Zoom is measured
// against the box that fits the whole room, which is 100%.

export type Box = { x: number; y: number; w: number; h: number };
type Point = { x: number; y: number };

const MIN_ZOOM = 0.25;
const MAX_ZOOM = 8;
/** Room around the room's walls when it's fitted, in inches. */
const FIT_MARGIN_INCHES = 48;

export function fitBox(room: {
  widthInches: number;
  lengthInches: number;
}): Box {
  return {
    x: -FIT_MARGIN_INCHES,
    y: -FIT_MARGIN_INCHES,
    w: room.widthInches + 2 * FIT_MARGIN_INCHES,
    h: room.lengthInches + 2 * FIT_MARGIN_INCHES,
  };
}

export function zoomOf(box: Box, fit: Box): number {
  return fit.w / box.w;
}

/**
 * Zooms by `factor` (2 is twice as close) keeping the point `at` where it is on screen,
 * within 25% and 800% of the fitted view.
 */
export function zoomBox(box: Box, fit: Box, factor: number, at: Point): Box {
  const zoom = Math.min(
    MAX_ZOOM,
    Math.max(MIN_ZOOM, zoomOf(box, fit) * factor),
  );
  const w = fit.w / zoom;
  const h = (box.h / box.w) * w;
  const scale = w / box.w;
  return {
    x: at.x - (at.x - box.x) * scale,
    y: at.y - (at.y - box.y) * scale,
    w,
    h,
  };
}

export function panBox(box: Box, dx: number, dy: number): Box {
  return { ...box, x: box.x - dx, y: box.y - dy };
}

export function centerOf(box: Box): Point {
  return { x: box.x + box.w / 2, y: box.y + box.h / 2 };
}
