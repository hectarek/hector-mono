import type { JSX } from "@solidjs/web";
import { createMemo, createSignal, For, onSettled, useContext } from "solid-js";
import { formatFeet, rotate, snapToGrid } from "../model/geometry";
import type { Box } from "../model/view-box";
import { findItem, PlanContext } from "../state/plan-store";
import { FixtureShape } from "./fixture-shape";
import { focusListItem } from "./item-list";
import { TableShape } from "./table-shape";

type Point = { x: number; y: number };

type Gesture =
  | { kind: "move"; id: string; start: Point; startX: number; startY: number }
  | { kind: "rotate"; id: string }
  | {
      kind: "resize";
      id: string;
      start: Point;
      startW: number;
      startD: number;
      sx: number;
      sy: number;
      turn: number;
      sameSides: boolean;
    }
  | { kind: "pan"; last: Point }
  | { kind: "pinch"; distance: number };

type Props = {
  box: Box;
  onPan: (dx: number, dy: number) => void;
  onZoom: (factor: number, at: Point) => void;
};

const ROTATE_STEP_DEGREES = 15;
const RESIZE_STEP_INCHES = 6;
const SMALLEST_INCHES = 12;

/**
 * The room drawn to scale (the spec's KTD2): a pointer drags tables and shapes, turns and
 * resizes the selected one by its handles, drags the floor to pan, and zooms with the wheel or
 * a pinch. Keyboard use goes through the "On the plan" list, since an SVG can't hold a button.
 */
export function PlanCanvas(props: Props): JSX.Element {
  const store = useContext(PlanContext);
  let svg: SVGSVGElement | undefined;
  let gesture: Gesture | null = null;
  const touches = new Map<number, Point>();
  const [size, setSize] = createSignal({ w: 1, h: 1 });

  const room = () => store.plan().room;
  const unitsPerPixel = () =>
    Math.max(props.box.w / size().w, props.box.h / size().h);
  const gridLines = createMemo(() => {
    const { widthInches, lengthInches, gridInches } = room();
    const columns = Array.from(
      { length: Math.floor(widthInches / gridInches) + 1 },
      (_, i) => ({
        at: i * gridInches,
        major: i % 5 === 0,
      }),
    );
    const rows = Array.from(
      { length: Math.floor(lengthInches / gridInches) + 1 },
      (_, i) => ({
        at: i * gridInches,
        major: i % 5 === 0,
      }),
    );
    return { columns, rows };
  });

  function toPlan(clientX: number, clientY: number): Point | null {
    const matrix = svg?.getScreenCTM();
    if (!matrix) return null;
    const point = new DOMPoint(clientX, clientY).matrixTransform(
      matrix.inverse(),
    );
    return { x: point.x, y: point.y };
  }

  onSettled(() => {
    const el = svg;
    if (!el) return;
    const observer = new ResizeObserver(([entry]) => {
      if (entry)
        setSize({
          w: entry.contentRect.width || 1,
          h: entry.contentRect.height || 1,
        });
    });
    observer.observe(el);
    // A wheel listener has to be non-passive to stop the page scrolling, so it's added here.
    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      const at = toPlan(e.clientX, e.clientY);
      if (at) props.onZoom(Math.exp(-e.deltaY * 0.002), at);
    };
    el.addEventListener("wheel", onWheel, { passive: false });
    return () => {
      observer.disconnect();
      el.removeEventListener("wheel", onWheel);
    };
  });

  function onPointerDown(e: PointerEvent) {
    if (!svg || (e.pointerType === "mouse" && e.button !== 0)) return;
    const target = e.target instanceof Element ? e.target : null;
    const itemEl = target?.closest<SVGGElement>("[data-item-id]");
    const handle = target?.closest<SVGElement>("[data-handle]");
    const point = toPlan(e.clientX, e.clientY);
    if (!point) return;
    // Without this, the mouse-down that follows moves focus to the page, off the list item
    // focused below, and the keyboard keys stop acting on the item just picked.
    e.preventDefault();
    svg.setPointerCapture(e.pointerId);

    const id = itemEl?.dataset.itemId;
    const item = id ? findItem(store.plan(), id) : undefined;
    if (id && item) {
      store.select(id);
      focusListItem(id);
      if (handle?.dataset.handle === "rotate") {
        gesture = { kind: "rotate", id };
      } else if (handle?.dataset.handle === "resize") {
        gesture = {
          kind: "resize",
          id,
          start: point,
          startW: item.widthInches,
          startD: item.depthInches,
          sx: Number(handle.dataset.sx),
          sy: Number(handle.dataset.sy),
          turn: item.rotationDegrees,
          sameSides:
            item.shape === "round" ||
            item.shape === "square" ||
            item.shape === "circle",
        };
      } else {
        gesture = {
          kind: "move",
          id,
          start: point,
          startX: item.xInches,
          startY: item.yInches,
        };
      }
      return;
    }

    store.select(null);
    touches.set(e.pointerId, { x: e.clientX, y: e.clientY });
    const [a, b] = [...touches.values()];
    gesture =
      a && b
        ? { kind: "pinch", distance: Math.hypot(a.x - b.x, a.y - b.y) }
        : { kind: "pan", last: { x: e.clientX, y: e.clientY } };
  }

  function onPointerMove(e: PointerEvent) {
    if (!gesture) return;
    if (gesture.kind === "pan" || gesture.kind === "pinch") {
      touches.set(e.pointerId, { x: e.clientX, y: e.clientY });
      panOrPinch(e);
      return;
    }
    const point = toPlan(e.clientX, e.clientY);
    if (!point) return;
    const grid = room().gridInches;
    const free = e.altKey;

    if (gesture.kind === "move") {
      const { id, start, startX, startY } = gesture;
      const x = startX + point.x - start.x;
      const y = startY + point.y - start.y;
      store.liveEdit(id, (item) => {
        item.xInches = Math.round(free ? x : snapToGrid(x, grid));
        item.yInches = Math.round(free ? y : snapToGrid(y, grid));
      });
    } else if (gesture.kind === "rotate") {
      const item = findItem(store.plan(), gesture.id);
      if (!item) return;
      const raw =
        (Math.atan2(point.y - item.yInches, point.x - item.xInches) * 180) /
          Math.PI +
        90;
      const turn = free
        ? Math.round(raw)
        : Math.round(raw / ROTATE_STEP_DEGREES) * ROTATE_STEP_DEGREES;
      store.liveEdit(gesture.id, (target) => {
        target.rotationDegrees = ((turn % 360) + 360) % 360;
      });
    } else {
      const g = gesture;
      const local = rotate(
        { x: point.x - g.start.x, y: point.y - g.start.y },
        -g.turn,
      );
      const fit = (value: number) =>
        Math.max(
          SMALLEST_INCHES,
          Math.round(free ? value : snapToGrid(value, RESIZE_STEP_INCHES)),
        );
      let w = fit(g.startW + 2 * local.x * g.sx);
      let d = fit(g.startD + 2 * local.y * g.sy);
      if (g.sameSides) {
        const side = Math.abs(w - g.startW) >= Math.abs(d - g.startD) ? w : d;
        w = side;
        d = side;
      }
      store.liveEdit(g.id, (item) => {
        item.widthInches = w;
        item.depthInches = d;
      });
    }
  }

  function panOrPinch(e: PointerEvent) {
    const matrix = svg?.getScreenCTM();
    if (!matrix || !gesture) return;
    if (gesture.kind === "pan") {
      const scale = 1 / matrix.a;
      props.onPan(
        (e.clientX - gesture.last.x) * scale,
        (e.clientY - gesture.last.y) * scale,
      );
      gesture = { kind: "pan", last: { x: e.clientX, y: e.clientY } };
    } else if (gesture.kind === "pinch") {
      const [a, b] = [...touches.values()];
      if (!a || !b) return;
      const distance = Math.hypot(a.x - b.x, a.y - b.y);
      const at = toPlan((a.x + b.x) / 2, (a.y + b.y) / 2);
      if (at && gesture.distance > 0)
        props.onZoom(distance / gesture.distance, at);
      gesture = { kind: "pinch", distance };
    }
  }

  function onPointerEnd(e: PointerEvent) {
    touches.delete(e.pointerId);
    if (svg?.hasPointerCapture(e.pointerId))
      svg.releasePointerCapture(e.pointerId);
    if (!gesture) return;
    if (gesture.kind === "pinch") {
      const [rest] = [...touches.values()];
      gesture = rest ? { kind: "pan", last: rest } : null;
      return;
    }
    if (gesture.kind !== "pan") store.finishLiveEdit();
    gesture = null;
  }

  return (
    <svg
      ref={(el) => {
        svg = el;
      }}
      role="img"
      aria-label={`Floor plan of a ${formatFeet(room().widthInches)} by ${formatFeet(room().lengthInches)} room. Use the On the plan list to reach each table and shape by keyboard.`}
      viewBox={`${props.box.x} ${props.box.y} ${props.box.w} ${props.box.h}`}
      preserveAspectRatio="xMidYMid meet"
      class="size-full touch-none select-none"
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerEnd}
      onPointerCancel={onPointerEnd}
    >
      <defs>
        <pattern
          id="seating-hatch"
          width="16"
          height="16"
          patternUnits="userSpaceOnUse"
          patternTransform="rotate(45)"
        >
          <rect width="16" height="16" class="fill-muted" />
          <rect width="8" height="16" class="fill-accent" />
        </pattern>
      </defs>
      <rect
        width={room().widthInches}
        height={room().lengthInches}
        class="fill-background"
      />
      <For each={gridLines().columns}>
        {(line) => (
          <line
            x1={line.at}
            y1="0"
            x2={line.at}
            y2={room().lengthInches}
            class={{
              "stroke-border": line.major,
              "stroke-accent": !line.major,
            }}
            stroke-width="1"
            vector-effect="non-scaling-stroke"
          />
        )}
      </For>
      <For each={gridLines().rows}>
        {(line) => (
          <line
            x1="0"
            y1={line.at}
            x2={room().widthInches}
            y2={line.at}
            class={{
              "stroke-border": line.major,
              "stroke-accent": !line.major,
            }}
            stroke-width="1"
            vector-effect="non-scaling-stroke"
          />
        )}
      </For>
      <rect
        width={room().widthInches}
        height={room().lengthInches}
        class="pointer-events-none fill-none stroke-foreground"
        stroke-width="3"
        vector-effect="non-scaling-stroke"
      />
      <For each={store.plan().fixtures}>
        {(fixture) => (
          <FixtureShape
            fixture={fixture}
            selected={store.selectedId() === fixture.id}
            unitsPerPixel={unitsPerPixel()}
          />
        )}
      </For>
      <For each={store.plan().tables}>
        {(table) => (
          <TableShape
            table={table}
            seated={store.seatedAt(table.id)}
            selected={store.selectedId() === table.id}
            unitsPerPixel={unitsPerPixel()}
          />
        )}
      </For>
    </svg>
  );
}
