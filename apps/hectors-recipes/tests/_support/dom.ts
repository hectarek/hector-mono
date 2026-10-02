// A browser (happy-dom) for the screen tests (*.test.tsx), preloaded by `bun run
// test:screens` after preload.ts. That pass runs each file in a fresh global (Bun's
// --isolate): happy-dom replaces fetch, Request, Headers and the timers, and its Headers hide
// cookies as a browser's do, which the rest of the suite can't have.
import { afterEach } from "bun:test";
import { GlobalRegistrator } from "@happy-dom/global-registrator";

GlobalRegistrator.register({ url: "http://localhost:3000/" });

// Each test starts with an empty page. A hook in a preload applies to every test; Testing
// Library is loaded here, not imported above, so it loads with the document in place.
afterEach(async () => {
  const { cleanup } = await import("@testing-library/react");
  cleanup();
});
