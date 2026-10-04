import { readFileSync } from "node:fs";
import path from "node:path";
import { parseEnv } from "node:util";
import { defineConfig, devices } from "@playwright/test";

// Not one of .claude/launch.json's ports (3100, 3201–3205): those servers use production's .env.
const PORT = 3300;

// The test project's settings, given to the dev server directly. Next takes a value from .env
// only when the key isn't already set, so these win over .env's production ones.
function testEnv(): Record<string, string> {
  let contents: string;
  try {
    contents = readFileSync(path.join(__dirname, ".env.test"), "utf8");
  } catch (error) {
    throw new Error(
      "Browser tests need .env.test, the hectors-recipes-test project's settings (see AGENTS.md).",
      { cause: error },
    );
  }
  return Object.fromEntries(
    Object.entries(parseEnv(contents)).map(([key, value]) => [
      key,
      value ?? "",
    ]),
  );
}

// A read with the real AI costs a few cents (docs/ux-plan.md H25), so it's asked for:
// `FLOWS_AI=1 bun run test:flows` runs the flows tagged @ai with the AI key. Otherwise they're
// skipped and the key is left out, so nothing else can spend it.
const withAi = process.env["FLOWS_AI"] === "1";
const env = testEnv();

export default defineConfig({
  testDir: "./tests/flows",
  testMatch: "**/*.flow.ts",
  grepInvert: withAi ? undefined : /@ai/,
  // A dev server compiles each page on its first visit.
  timeout: 180_000,
  expect: { timeout: 15_000 },
  workers: 1,
  use: {
    baseURL: `http://localhost:${PORT}`,
    trace: "retain-on-failure",
  },
  projects: [{ name: "phone", use: { ...devices["Pixel 7"] } }],
  webServer: {
    // The check runs without Bun's own .env loading, so it sees only what's passed here; Next
    // runs on Node, which loads no env files of its own.
    command: `bun --no-env-file scripts/check-test-database.ts && node_modules/.bin/next dev --port ${PORT}`,
    url: `http://localhost:${PORT}/welcome`,
    env: withAi ? env : { ...env, AI_GATEWAY_API_KEY: "" },
    // Never a server that's already running: it could be using production's settings.
    reuseExistingServer: false,
    timeout: 180_000,
  },
});
