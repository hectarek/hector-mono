import {
  createContext,
  createEffect,
  createMemo,
  createSignal,
  createStore,
  flush,
  onSettled,
  reconcile,
  snapshot,
} from "solid-js";
import { downloadText } from "../download";
import { freeSpot } from "../model/geometry";
import {
  createHistory,
  type History,
  record,
  redo,
  undo,
} from "../model/history";
import {
  createFixture,
  createTable,
  nextTableLabel,
  type TablePresetId,
} from "../model/presets";
import {
  createSavedFile,
  type Fixture,
  needsExportReminder,
  type Plan,
  parseSavedFile,
  prepareExport,
  type SavedFile,
  type Table,
} from "../model/saved-file";
import { loadSavedFile, saveSavedFile } from "../model/storage";

// The plan the app edits (the spec's KTD5). Every change goes through a named action. A change
// is written to the store, then a plain copy of the whole file is recorded in the undo history,
// and autosave writes the history's present to localStorage. A drag writes to the store as it
// moves and records one step when it ends.

type Item = Table | Fixture;
type KeyValueStore = Pick<Storage, "getItem" | "setItem" | "removeItem">;
type Point = { xInches: number; yInches: number };

type Notice = {
  tone: "info" | "error";
  text: string;
  download?: { fileName: string; text: string };
};

const SAVE_DELAY_MS = 300;
const BLOCKED =
  "This browser blocks saving, so the plan lasts only until the page closes. Export it to keep a copy.";

function activePlan(file: SavedFile): Plan {
  const plan = file.plans.find((p) => p.id === file.activePlanId);
  // The saved file's schema refuses a file whose active plan is missing.
  if (!plan) throw new Error("The saved file has no active plan");
  return plan;
}

export function findItem(plan: Plan, id: string): Item | undefined {
  return (
    plan.tables.find((t) => t.id === id) ??
    plan.fixtures.find((f) => f.id === id)
  );
}

function browserStorage(): KeyValueStore | null {
  try {
    return window.localStorage;
  } catch {
    return null;
  }
}

function startingState(
  storage: KeyValueStore | null,
  now: Date,
): { file: SavedFile; notice: Notice | null } {
  if (!storage)
    return {
      file: createSavedFile(now),
      notice: { tone: "error", text: BLOCKED },
    };
  const loaded = loadSavedFile(storage, now);
  switch (loaded.status) {
    case "loaded":
      return { file: loaded.file, notice: null };
    case "empty":
      return { file: createSavedFile(now), notice: null };
    case "unavailable":
      return {
        file: createSavedFile(now),
        notice: { tone: "error", text: BLOCKED },
      };
    case "unreadable":
      return {
        file: createSavedFile(now),
        notice: {
          tone: "error",
          text: `The saved plan couldn't be read, so this is a new one. The old data is still in this browser; download it to keep it. ${loaded.reason}`,
          download: {
            fileName: "seating-chart-unreadable.json",
            text: storage.getItem(loaded.keptAt) ?? "",
          },
        },
      };
  }
}

export function createPlanStore() {
  const storage = browserStorage();
  const start = startingState(storage, new Date());
  const [state, setState] = createStore<{ file: SavedFile }>({
    file: structuredClone(start.file),
  });
  const [history, setHistory] = createSignal<History<SavedFile>>(
    createHistory(start.file),
  );
  const [selectedId, setSelectedId] = createSignal<string | null>(null);
  const [notice, setNotice] = createSignal<Notice | null>(start.notice);

  const plan = createMemo(() => activePlan(state.file));
  const seatedAt = createMemo(() => {
    const counts = new Map<string, number>();
    for (const guest of plan().guests) {
      if (guest.tableId)
        counts.set(guest.tableId, (counts.get(guest.tableId) ?? 0) + 1);
    }
    return counts;
  });

  let saveTimer: ReturnType<typeof setTimeout> | undefined;
  function saveNow(file: SavedFile): void {
    clearTimeout(saveTimer);
    if (!storage) return;
    const saved = saveSavedFile(storage, file);
    if (!saved.ok) setNotice({ tone: "error", text: saved.reason });
  }
  createEffect(
    () => history().present,
    (file) => {
      clearTimeout(saveTimer);
      saveTimer = setTimeout(() => saveNow(file), SAVE_DELAY_MS);
    },
    { defer: true },
  );
  onSettled(() => {
    const saveOnLeave = () => saveNow(history().present);
    window.addEventListener("pagehide", saveOnLeave);
    return () => window.removeEventListener("pagehide", saveOnLeave);
  });

  function recordPresent(): void {
    flush();
    setHistory((h) => record(h, structuredClone(snapshot(state.file))));
  }

  function commit(change: (draft: Plan) => void): void {
    setState((s) => {
      const draft = activePlan(s.file);
      change(draft);
      draft.updatedAt = new Date().toISOString();
    });
    recordPresent();
  }

  function restore(next: History<SavedFile>): void {
    if (next === history()) return;
    setHistory(next);
    setState(reconcile({ file: structuredClone(next.present) }));
    flush();
    const id = selectedId();
    if (id && !findItem(plan(), id)) setSelectedId(null);
  }

  function changeItem(id: string, change: (item: Item) => void): void {
    commit((draft) => {
      const item = findItem(draft, id);
      if (item) change(item);
    });
  }

  const everything = () => [...plan().tables, ...plan().fixtures];
  let liveChanged = false;

  return {
    plan,
    selectedId,
    notice,
    canUndo: () => history().past.length > 0,
    canRedo: () => history().future.length > 0,
    seatedAt: (tableId: string) => seatedAt().get(tableId) ?? 0,
    lastExportedAt: () => history().present.lastExportedAt,
    needsExport: () => needsExportReminder(history().present, new Date()),
    committedFile: () => history().present,

    select: (id: string | null) => setSelectedId(id),
    dismissNotice: () => setNotice(null),

    addTable(presetId: TablePresetId, at: Point): string {
      const placed = createTable(presetId, at, plan().tables);
      const table = {
        ...placed,
        ...freeSpot(placed, everything(), plan().room),
      };
      commit((draft) => {
        draft.tables.push(table);
      });
      setSelectedId(table.id);
      flush();
      return table.id;
    },

    addFixture(kind: Fixture["kind"], at: Point): string {
      const placed = createFixture(kind, at);
      const fixture = {
        ...placed,
        ...freeSpot(placed, everything(), plan().room),
      };
      commit((draft) => {
        draft.fixtures.push(fixture);
      });
      setSelectedId(fixture.id);
      flush();
      return fixture.id;
    },

    updateTable(id: string, patch: Partial<Omit<Table, "id">>): void {
      commit((draft) => {
        const table = draft.tables.find((t) => t.id === id);
        if (table) Object.assign(table, patch);
      });
    },

    updateFixture(id: string, patch: Partial<Omit<Fixture, "id">>): void {
      commit((draft) => {
        const fixture = draft.fixtures.find((f) => f.id === id);
        if (fixture) Object.assign(fixture, patch);
      });
    },

    moveBy(id: string, dx: number, dy: number): void {
      changeItem(id, (item) => {
        item.xInches += dx;
        item.yInches += dy;
      });
    },

    rotateBy(id: string, degrees: number): void {
      changeItem(id, (item) => {
        item.rotationDegrees =
          (((item.rotationDegrees + degrees) % 360) + 360) % 360;
      });
    },

    duplicate(id: string): string | null {
      const source = findItem(plan(), id);
      if (!source) return null;
      const offset = plan().room.gridInches * 2;
      const copy: Item = {
        ...structuredClone(snapshot(source)),
        id: crypto.randomUUID(),
        xInches: source.xInches + offset,
        yInches: source.yInches + offset,
      };
      commit((draft) => {
        if ("seatCount" in copy) {
          if (copy.seatSides !== "one-side")
            copy.label = nextTableLabel(draft.tables);
          draft.tables.push(copy);
        } else {
          draft.fixtures.push(copy);
        }
      });
      setSelectedId(copy.id);
      flush();
      return copy.id;
    },

    remove(id: string): void {
      commit((draft) => {
        draft.tables = draft.tables.filter((t) => t.id !== id);
        draft.fixtures = draft.fixtures.filter((f) => f.id !== id);
        for (const guest of draft.guests) {
          if (guest.tableId === id) {
            guest.tableId = undefined;
            guest.seatIndex = undefined;
          }
        }
      });
      if (selectedId() === id) setSelectedId(null);
    },

    updatePlan(patch: {
      name?: string;
      widthInches?: number;
      lengthInches?: number;
    }): void {
      commit((draft) => {
        if (patch.name !== undefined) draft.name = patch.name;
        if (patch.widthInches !== undefined)
          draft.room.widthInches = patch.widthInches;
        if (patch.lengthInches !== undefined)
          draft.room.lengthInches = patch.lengthInches;
      });
    },

    /** A change while dragging: shown at once, recorded as one undo step by finishLiveEdit. */
    liveEdit(id: string, change: (item: Item) => void): void {
      setState((s) => {
        const item = findItem(activePlan(s.file), id);
        if (item) change(item);
      });
      liveChanged = true;
    },

    finishLiveEdit(): void {
      if (!liveChanged) return;
      liveChanged = false;
      commit(() => undefined);
    },

    undo: () => restore(undo(history())),
    redo: () => restore(redo(history())),

    exportPlan(): void {
      const out = prepareExport(history().present, new Date());
      const stamp = (file: SavedFile): SavedFile => ({
        ...file,
        lastExportedAt: out.file.lastExportedAt,
      });
      setHistory((h) => ({
        past: h.past.map(stamp),
        present: out.file,
        future: h.future.map(stamp),
      }));
      setState((s) => {
        s.file.lastExportedAt = out.file.lastExportedAt;
      });
      downloadText(out.fileName, out.text);
    },

    importText(text: string): void {
      const parsed = parseSavedFile(text);
      if (!parsed.ok) {
        setNotice({
          tone: "error",
          text: `That file wasn't imported. ${parsed.reason}`,
        });
        return;
      }
      setState(reconcile({ file: structuredClone(parsed.file) }));
      recordPresent();
      setSelectedId(null);
      setNotice({
        tone: "info",
        text: `Imported “${activePlan(parsed.file).name}”. Undo brings back the plan you had.`,
      });
    },

    download(fileName: string, text: string): void {
      downloadText(fileName, text);
    },
  };
}

export type PlanStore = ReturnType<typeof createPlanStore>;

export const PlanContext = createContext<PlanStore>();
