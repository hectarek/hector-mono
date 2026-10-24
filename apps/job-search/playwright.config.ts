import { defineConfig, devices } from "@playwright/test";

// Not one of .claude/launch.json's ports (3100, 3101, 3201–3205), nor recipes' flows' (3300).
const PORT = 3301;

export default defineConfig({
  testDir: "./tests/flows",
  testMatch: "**/*.flow.ts",
  // A dev server compiles each page on its first visit.
  timeout: 180_000,
  expect: { timeout: 15_000 },
  workers: 1,
  use: {
    baseURL: `http://localhost:${PORT}`,
    trace: "retain-on-failure",
    // A step waiting for something that never comes fails here, with a trace, rather than
    // waiting out the test's 3 minutes and looking hung.
    actionTimeout: 30_000,
  },
  projects: [
    {
      name: "chromium",
      use: {
        ...devices["Desktop Chrome"],
        // Playwright's own full Chromium, with the page tools' API (WebMCP) turned on, as Claude's
        // browser profile has it (docs/agent-access.md).
        channel: "chromium",
        launchOptions: { args: ["--enable-features=WebMCP"] },
      },
    },
  ],
  webServer: {
    // next dev reads the app's .env, which holds the Neon test project's settings only
    // (docs/build-plan.md KTD17).
    command: `node_modules/.bin/next dev --port ${PORT}`,
    url: `http://localhost:${PORT}/welcome`,
    // Never a server that's already running: it could be using other settings.
    reuseExistingServer: false,
    timeout: 180_000,
  },
});
