// The experiment's test cases: each game in games.json with the text of its English Wikipedia
// article, as the trial used it: the opening, then the sections about how the game plays, capped
// at 1,500 words. The text is fetched once into ../.cache/, which git ignores: Wikipedia's text
// is CC BY-SA and stays out of this repo.
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const HERE = dirname(fileURLToPath(import.meta.url));
const CACHE = join(HERE, "..", ".cache");
const API = "https://en.wikipedia.org/w/api.php";
// Wikimedia asks scripts for a User-Agent that says how to reach their author, and for one
// request at a time.
const USER_AGENT =
  "CommunityGameLibraryEvals/1.0 (https://github.com/hectarek/hector-mono)";
const PAUSE_MS = 1000;
const KEEP =
  /gameplay|game ?play|^game$|rules|how to play|^play|playing|mechanic|objective|overview|set-?up|components|contents|equipment|description|^the game|turn|scoring|winning/i;
const WORD_CAP = 1500;

/** @typedef {{ title: string, article: string, why: string }} Game */

/** @param {string} text */
function countWords(text) {
  return text.split(/\s+/).filter(Boolean).length;
}

/**
 * An article's plain text cut to what a description is written from: the opening, then each
 * top-level section whose heading is about play, until the word cap.
 * @param {string} extract
 */
export function playText(extract) {
  const [lead = "", ...sections] = extract.split(/\n(?===+ [^=].*? =+\s*\n)/);
  /** @type {string[]} */
  const kept = [];
  let keeping = false;
  for (const section of sections) {
    const heading = section.match(/^(=+) (.*?) =+/);
    if (!heading) {
      continue;
    }
    if (heading[1].length === 2) {
      keeping = KEEP.test(heading[2]);
    }
    if (keeping) {
      kept.push(section.trim());
    }
  }
  let text = lead.trim();
  for (const section of kept) {
    const room = WORD_CAP - countWords(text);
    if (countWords(section) > room) {
      const cut = section.split(/\s+/).slice(0, Math.max(0, room)).join(" ");
      return `${text}\n\n${cut}`;
    }
    text = `${text}\n\n${section}`;
  }
  return text;
}

/** @param {string} article */
async function fetchExtract(article) {
  const params = new URLSearchParams({
    action: "query",
    prop: "extracts",
    explaintext: "1",
    exsectionformat: "wiki",
    redirects: "1",
    format: "json",
    formatversion: "2",
    titles: article,
  });
  const response = await fetch(`${API}?${params}`, {
    headers: { "User-Agent": USER_AGENT },
  });
  if (!response.ok) {
    throw new Error(`Wikipedia answered ${response.status} for "${article}"`);
  }
  const page = (await response.json()).query?.pages?.[0];
  if (!page?.extract) {
    throw new Error(`Wikipedia has no article "${article}"`);
  }
  return /** @type {string} */ (page.extract);
}

/** @param {string} article */
function cacheFile(article) {
  const name = article
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
  return join(CACHE, `${name}.txt`);
}

/** promptfoo calls this for the test cases (promptfooconfig.yaml, tests). */
export async function loadArticles() {
  /** @type {Game[]} */
  const games = JSON.parse(await readFile(join(HERE, "games.json"), "utf8"));
  await mkdir(CACHE, { recursive: true });
  const tests = [];
  for (const game of games) {
    const file = cacheFile(game.article);
    let text = await readFile(file, "utf8").catch(() => null);
    if (text === null) {
      text = playText(await fetchExtract(game.article));
      await writeFile(file, text);
      await new Promise((resolve) => setTimeout(resolve, PAUSE_MS));
    }
    tests.push({ description: game.title, vars: { title: game.title, text } });
  }
  return tests;
}
