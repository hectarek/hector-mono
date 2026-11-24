import { readFileSync } from "node:fs";
import path from "node:path";
import { parseEnv } from "node:util";
import { defineConfig, devices } from "@playwright/test";

// U25's browser flows (docs/build-plan.md KTD22), as recipes' are. Not one of .claude/launch.json's
// ports (3102, 3206), so a preview server is never the one tested.
const PORT = 3302;

// .env holds the test project's values only (AGENTS.md, Environments). They're given to the check
// and the dev server directly: Next takes a value from an env file only when the key isn't set
// already, so .env.development.local can't swap the database under the flows.
function testEnv(): Record<string, string> {
  const contents = readFileSync(path.join(__dirname, ".env"), "utf8");
  return Object.fromEntries(
    Object.entries(parseEnv(contents)).map(([key, value]) => [
      key,
      value ?? "",
    ]),
  );
}

export default defineConfig({
  testDir: "./tests/flows",
  testMatch: "**/*.flow.ts",
  // A dev server compiles each page on its first visit.
  timeout: 300_000,
  expect: { timeout: 20_000 },
  workers: 1,
  use: {
    baseURL: `http://localhost:${PORT}`,
    trace: "retain-on-failure",
    // A tap waiting for something that never comes fails here, with a trace, rather than waiting
    // out the test.
    actionTimeout: 30_000,
    reducedMotion: "reduce",
  },
  projects: [{ name: "phone", use: { ...devices["Pixel 7"] } }],
  webServer: {
    // The check stops the run unless the database carries the test project's comment and auth is
    // on its endpoint (scripts/check-test-database.ts). It runs without Bun's own .env loading, so
    // it sees what the server is given.
    command: `bun --no-env-file scripts/check-test-database.ts && node_modules/.bin/next dev --port ${PORT}`,
    url: `http://localhost:${PORT}/welcome`,
    env: testEnv(),
    // Never a server that's already running: it could be using other settings.
    reuseExistingServer: false,
    timeout: 180_000,
  },
});
