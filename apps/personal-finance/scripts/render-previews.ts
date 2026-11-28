// Renders public/previews/<slug>-<PREVIEW_VERSION>.png for every card in PREVIEW_CARDS, by
// screenshotting docs/preview-card.html with headless Chrome (KTD5). A next/og route would need
// inline styles, which the design lint bans
// (docs/solutions/developer-experience/next-og-images-ship-as-files-made-once.md).
//
// From apps/personal-finance, with Google Chrome installed, outside the Claude Code sandbox
// (Chrome can't create its profile or socket inside it):
//   bun scripts/render-previews.ts
import { mkdtempSync, readdirSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { PREVIEW_CARDS } from "@/src/content/pages";
import { PREVIEW_VERSION, SITE_NAME } from "@/src/site";

const CHROME = "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";
const APP = join(import.meta.dir, "..");
const TEMPLATE = join(APP, "docs/preview-card.html");
const OUT = join(APP, "public/previews");

const wanted = new Set(
  PREVIEW_CARDS.map((card) => `${card.slug}-${PREVIEW_VERSION}.png`),
);
for (const file of readdirSync(OUT)) {
  if (!wanted.has(file)) rmSync(join(OUT, file));
}

for (const card of PREVIEW_CARDS) {
  const query = new URLSearchParams({
    site: SITE_NAME,
    title: card.title,
    line: card.line,
  });
  const profile = mkdtempSync(join(tmpdir(), "preview-chrome-"));
  const run = Bun.spawnSync([
    CHROME,
    "--headless=new",
    `--user-data-dir=${profile}`,
    "--hide-scrollbars",
    "--force-device-scale-factor=1",
    "--window-size=1200,630",
    "--virtual-time-budget=2000",
    `--screenshot=${join(OUT, `${card.slug}-${PREVIEW_VERSION}.png`)}`,
    `file://${TEMPLATE}?${query}`,
  ]);
  rmSync(profile, { recursive: true, force: true });
  if (run.exitCode !== 0) {
    throw new Error(`Chrome failed on ${card.slug}: ${run.stderr.toString()}`);
  }
}

console.log(`Rendered ${PREVIEW_CARDS.length} previews into ${OUT}`);
