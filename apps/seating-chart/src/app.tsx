import type { JSX } from "@solidjs/web";
import { createSignal, onSettled } from "solid-js";
import { ItemList } from "./components/item-list";
import { Notices } from "./components/notices";
import { Palette } from "./components/palette";
import { PlanCanvas } from "./components/plan-canvas";
import { SidePanel } from "./components/side-panel";
import { TopBar } from "./components/top-bar";
import {
  type Box,
  centerOf,
  fitBox,
  panBox,
  zoomBox,
  zoomOf,
} from "./model/view-box";
import { createPlanStore, PlanContext } from "./state/plan-store";

const ZOOM_STEP = 1.25;

export function App(): JSX.Element {
  const store = createPlanStore();
  // null means "fit the room", so the fitted view follows the room when its size changes.
  const [view, setView] = createSignal<Box | null>(null);
  const fit = () => fitBox(store.plan().room);
  const box = () => view() ?? fit();
  const zoom = (factor: number, at = centerOf(box())) =>
    setView(zoomBox(box(), fit(), factor, at));

  onSettled(() => {
    // Undo and redo everywhere but in a text field, which keeps its own undo.
    const onKey = (e: KeyboardEvent) => {
      if (!(e.metaKey || e.ctrlKey)) return;
      if (
        e.target instanceof Element &&
        e.target.closest("input, textarea, select")
      )
        return;
      const key = e.key.toLowerCase();
      if (key === "z" && e.shiftKey) store.redo();
      else if (key === "z") store.undo();
      else if (key === "y") store.redo();
      else return;
      e.preventDefault();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  });

  return (
    <PlanContext value={store}>
      <div class="flex h-dvh flex-col bg-background text-foreground">
        <TopBar
          zoomPercent={Math.round(zoomOf(box(), fit()) * 100)}
          onZoomIn={() => zoom(ZOOM_STEP)}
          onZoomOut={() => zoom(1 / ZOOM_STEP)}
          onFit={() => setView(null)}
        />
        <Notices />
        <div class="flex min-h-0 flex-1">
          <aside
            aria-label="Add and find"
            class="hidden w-64 shrink-0 flex-col gap-6 overflow-y-auto border-border border-r-2 bg-card p-4 md:flex"
          >
            <Palette center={centerOf(box())} />
            <ItemList />
          </aside>
          <main class="relative min-w-0 flex-1 bg-muted">
            <PlanCanvas
              box={box()}
              onPan={(dx, dy) => setView(panBox(box(), dx, dy))}
              onZoom={(factor, at) => zoom(factor, at)}
            />
          </main>
          <SidePanel />
        </div>
      </div>
    </PlanContext>
  );
}
