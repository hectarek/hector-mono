/**
 * Lighthouse CI Configuration
 *
 * Configures Lighthouse CI for automated performance testing
 * Run with: bun run lighthouse
 *
 * Note: If you get "port already in use" error, either:
 * 1. Stop existing dev server first, OR
 * 2. Set startServerCommand to null and run dev server manually
 */

module.exports = {
  ci: {
    collect: {
      url: ["http://localhost:3000"],
      // Start dev server automatically (comment out if server already running)
      startServerCommand: "bun run dev",
      startServerReadyPattern: "Ready in",
      startServerReadyTimeout: 30000,
      numberOfRuns: 3,
      // If server is already running, set this to null:
      // startServerCommand: null,
    },
    assert: {
      assertions: {
        "categories:performance": ["error", { minScore: 1 }],
        "categories:accessibility": ["error", { minScore: 1 }],
        "categories:best-practices": ["error", { minScore: 1 }],
        "categories:seo": ["error", { minScore: 1 }],
        "categories:pwa": ["error", { minScore: 1 }],
      },
    },
    upload: {
      target: "temporary-public-storage",
    },
  },
};
