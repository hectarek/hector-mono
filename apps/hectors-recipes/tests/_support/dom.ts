// A browser (happy-dom) for a screen test. Import it first in the file, so React and
// Testing Library load with a document. Screen tests (*.test.tsx) run on their own, each file
// in a fresh global (`bun run test:screens`, Bun's --isolate): happy-dom replaces fetch,
// Request, Headers and the timers, and its Headers hide cookies as a browser's do, which the
// rest of the suite can't have.
import { afterEach } from "bun:test";
import { GlobalRegistrator } from "@happy-dom/global-registrator";

GlobalRegistrator.register({ url: "http://localhost:3000/" });

// Each test starts with an empty page.
afterEach(async () => {
  const { cleanup } = await import("@testing-library/react");
  cleanup();
});
