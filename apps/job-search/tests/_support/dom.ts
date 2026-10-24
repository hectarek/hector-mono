// A browser (happy-dom) for the screen tests (*.test.tsx), preloaded by `bun run
// test:screens` after preload.ts. That pass runs each file in a fresh global (Bun's
// --isolate): happy-dom replaces fetch, Request, Headers and the timers, which the rest of
// the suite needs as Bun has them. Recipes' harness.
import { afterEach } from "bun:test";
import { GlobalRegistrator } from "@happy-dom/global-registrator";

GlobalRegistrator.register({ url: "http://localhost:3101/" });

// Loaded once the document is in place, and here rather than in a hook: Testing Library adds
// hooks of its own as it loads, which bun:test allows only outside a test.
const { cleanup } = await import("@testing-library/react");

// Each test starts with an empty page: Testing Library unmounts what it rendered (running the
// effects' cleanups), and what renderOnServer added goes too.
afterEach(() => {
  cleanup();
  document.body.replaceChildren();
});
