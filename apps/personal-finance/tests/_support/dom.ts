// A browser (happy-dom) for the screen tests (*.test.tsx), preloaded by `bun run
// test:screens`. That pass runs each file in a fresh global (Bun's --isolate): happy-dom
// replaces fetch, Request, Headers and the timers, which the rest of the suite needs as Bun
// has them. Job-search's harness, on this app's port.
import { afterEach } from "bun:test";
import { GlobalRegistrator } from "@happy-dom/global-registrator";

GlobalRegistrator.register({ url: "http://localhost:3104/" });

// Loaded once the document is in place, and here rather than in a hook: Testing Library adds
// hooks of its own as it loads, which bun:test allows only outside a test.
const { cleanup, configure } = await import("@testing-library/react");

// A wait (findBy…, waitFor) gets 3 seconds rather than Testing Library's 1, which a debounced
// announcement plus a slow CI runner can outrun. It stays under Bun's 5-second test timeout,
// so a wait that fails still prints the page.
configure({ asyncUtilTimeout: 3_000 });

// Each test starts with an empty page: Testing Library unmounts what it rendered (running the
// effects' cleanups), and anything else a test added goes too.
afterEach(() => {
  cleanup();
  document.body.replaceChildren();
});
