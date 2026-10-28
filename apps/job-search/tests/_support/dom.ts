// A browser (happy-dom) for the screen tests (*.test.tsx), preloaded by `bun run
// test:screens` after preload.ts. That pass runs each file in a fresh global (Bun's
// --isolate): happy-dom replaces fetch, Request, Headers and the timers, which the rest of
// the suite needs as Bun has them. Recipes' harness.
import { afterEach } from "bun:test";
import { GlobalRegistrator } from "@happy-dom/global-registrator";

GlobalRegistrator.register({ url: "http://localhost:3101/" });

// Loaded once the document is in place, and here rather than in a hook: Testing Library adds
// hooks of its own as it loads, which bun:test allows only outside a test.
const { cleanup, configure } = await import("@testing-library/react");

// A wait (findBy…, waitFor) gets 3 seconds rather than Testing Library's 1: CI's runners stall
// for about a second now and then, and a debounced search (250 ms, then its call) outran the
// default (2026-10-28). It stays under Bun's 5-second test timeout, so a wait that fails still
// prints the page.
configure({ asyncUtilTimeout: 3_000 });

// Each test starts with an empty page: Testing Library unmounts what it rendered (running the
// effects' cleanups), and what renderOnServer added goes too.
afterEach(() => {
  cleanup();
  document.body.replaceChildren();
});
