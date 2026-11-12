// Builds public/sw.js, the service worker (docs/ux-plan.md P31.2), before `next build`.
// Its version is the commit being built (Vercel's VERCEL_GIT_COMMIT_SHA), so each deploy's
// worker differs from the last: the browser installs it, and it drops the last deploy's saved
// pages. Without a commit (a local build), the time stands in.
const version = process.env.VERCEL_GIT_COMMIT_SHA ?? `local-${Date.now()}`;

const result = await Bun.build({
  entrypoints: [`${import.meta.dir}/../service-worker/worker.ts`],
  outdir: `${import.meta.dir}/../public`,
  naming: "sw.js",
  target: "browser",
  format: "iife",
  minify: true,
  define: { SERVICE_WORKER_VERSION: JSON.stringify(version) },
});

if (!result.success) {
  throw new AggregateError(result.logs, "Building the service worker failed");
}
