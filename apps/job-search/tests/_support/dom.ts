// A browser (happy-dom) for the screen tests (*.test.tsx), preloaded by `bun run
// test:screens` after preload.ts. That pass runs each file in a fresh global (Bun's
// --isolate): happy-dom replaces fetch, Request, Headers and the timers, which the rest of
// the suite needs as Bun has them. Recipes' harness, without Testing Library's React
// renderer until a screen test renders a client component.
import { afterEach } from "bun:test";
import { GlobalRegistrator } from "@happy-dom/global-registrator";

GlobalRegistrator.register({ url: "http://localhost:3101/" });

// Each test starts with an empty page.
afterEach(() => {
  document.body.replaceChildren();
});
