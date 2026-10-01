/**
 * Lighthouse CI Configuration
 *
 * Audits a production build (next build + next start), not the dev server.
 * Run from apps/hector-portfolio: bun run lighthouse
 *
 * Note: next start serves on port 3000, so stop anything already using it first.
 */

module.exports = {
  ci: {
    collect: {
      url: ["http://localhost:3000"],
      startServerCommand: "bun run build && bun run start",
      startServerReadyPattern: "Ready in",
      // Covers the build as well as the server start.
      startServerReadyTimeout: 120000,
      numberOfRuns: 3,
    },
    assert: {
      assertions: {
        "categories:performance": ["error", { minScore: 1 }],
        "categories:accessibility": ["error", { minScore: 1 }],
        "categories:best-practices": ["error", { minScore: 1 }],
        "categories:seo": ["error", { minScore: 1 }],
      },
    },
    // Reports stay on this machine (gitignored); temporary-public-storage would publish them.
    upload: {
      target: "filesystem",
      outputDir: ".lighthouseci/reports",
    },
  },
};
