// A browser (happy-dom) for the screen tests (*.test.tsx), preloaded by `bun run
// test:screens` after preload.ts. That pass runs each file in a fresh global (Bun's
// --isolate): happy-dom replaces fetch, Request, Headers and the timers, and its Headers hide
// cookies as a browser's do, which the rest of the suite can't have.
import { afterEach } from "bun:test";
import { GlobalRegistrator } from "@happy-dom/global-registrator";

GlobalRegistrator.register({ url: "http://localhost:3000/" });

// Loaded once the document is in place, and here rather than in a hook: Testing Library adds
// hooks of its own as it loads, which bun:test allows only outside a test (job-search's harness).
const { cleanup, configure } = await import("@testing-library/react");

// A wait (findBy…, waitFor) gets 3 seconds rather than Testing Library's 1, as in job-search:
// on CI's runners, a server action's round trip outran the default twice (B8's Undo and B9's
// Send suggestion, 2026-11-22), though both pass in well under a second locally. It stays under
// Bun's 5-second test timeout, so a wait that fails still prints the page.
configure({ asyncUtilTimeout: 3_000 });

// Each test starts with an empty page. A hook in a preload applies to every test.
afterEach(() => {
  cleanup();
});
