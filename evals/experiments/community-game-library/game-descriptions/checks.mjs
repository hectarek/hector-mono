// The descriptions' automatic checks, one promptfoo assertion each (promptfooconfig.yaml names
// them). They hold the rules in prompts/v1.json that a script can see; a person judges the rest.
// "NONE" is the answer the prompt asks for when the article says too little, so every check
// passes it, and the person judges whether it was right.

// The prompt asks for fewer than five copied words in a row; the check fails six or more, as the
// trial's did, so an everyday five-word phrase doesn't fail a description.
const COPIED_RUN_LIMIT = 6;
const WORDS = { min: 30, max: 60 };
const BANNED =
  /\b(popular|classic|beloved|iconic|famous|exciting|thrilling|immersive|engaging|strategic|depth|unique|perfect|fun|challenging|you|your)\b/i;

/** @typedef {{ pass: boolean, score: number, reason: string }} GradingResult */
/** @typedef {{ vars: { title: string, text: string } }} Context */

/** @param {string} text */
function wordsOf(text) {
  return text
    .toLowerCase()
    .replace(/[’‘]/g, "'")
    .replace(/[^a-z0-9à-ÿ' ]+/g, " ")
    .split(/\s+/)
    .filter(Boolean);
}

/** @param {string} output */
function isNone(output) {
  return /^NONE\.?$/i.test(output.trim());
}

/**
 * @param {boolean} pass
 * @param {string} reason
 * @returns {GradingResult}
 */
function graded(pass, reason) {
  return { pass, score: pass ? 1 : 0, reason };
}

/**
 * The longest run of words the description shares, in order, with the source.
 * @param {string} description
 * @param {string} source
 */
export function longestCopiedRun(description, source) {
  const words = wordsOf(description);
  const haystack = ` ${wordsOf(source).join(" ")} `;
  /** @type {string[]} */
  let longest = [];
  for (let start = 0; start < words.length; start++) {
    for (let end = start + longest.length + 1; end <= words.length; end++) {
      const run = words.slice(start, end);
      if (!haystack.includes(` ${run.join(" ")} `)) {
        break;
      }
      longest = run;
    }
  }
  return longest.join(" ");
}

/**
 * @param {string} output
 * @param {Context} context
 */
export function copiedWords(output, { vars }) {
  if (isNone(output)) {
    return graded(true, "NONE");
  }
  const run = longestCopiedRun(output, vars.text);
  const length = run ? run.split(" ").length : 0;
  return length < COPIED_RUN_LIMIT
    ? graded(true, `Longest copied run: ${length} words`)
    : graded(false, `Copied ${length} words in a row: "${run}"`);
}

/** @param {string} output */
export function wordCount(output) {
  if (isNone(output)) {
    return graded(true, "NONE");
  }
  const count = wordsOf(output).length;
  return graded(
    count >= WORDS.min && count <= WORDS.max,
    `${count} words, for ${WORDS.min} to ${WORDS.max}`,
  );
}

/** @param {string} output */
export function bannedWords(output) {
  const found = output.match(BANNED);
  return found
    ? graded(false, `Uses "${found[0]}"`)
    : graded(true, "No banned words");
}

/** @param {string} output */
export function noEmDash(output) {
  return output.includes("—")
    ? graded(false, "Has an em dash")
    : graded(true, "No em dash");
}

/**
 * @param {string} output
 * @param {Context} context
 */
export function opensWithTitle(output, { vars }) {
  return output.trim().toLowerCase().startsWith(vars.title.toLowerCase())
    ? graded(false, "Opens with the game's title")
    : graded(true, "Doesn't open with the title");
}
