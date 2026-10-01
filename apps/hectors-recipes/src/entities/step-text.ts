// A recipe's markdown instructions as itemized steps (ux-plan D24): each top-level numbered
// or bulleted item is a step, its wrapped lines joined, and a paragraph between lists is a
// step of its own; without a list, each paragraph is.
// Labels that only number the steps ("### Step 2", "**Step 2**", "Step 2:") and dividers go;
// other headings become a bold step of their own, which `withSections` makes a section. A
// heading line is a step of its own even with no blank line around it (`startsSection`).
// Inline markdown (bold, links) stays in the step's text.
const LIST_ITEM = /^(?:\d+[.)]|[-*])\s+/;
// "### Step 2", or a plain "Step 2:" line.
const STEP_HEADING = /^(?:#+\s*)?step\s+\d+\s*:?$/i;
const STEP_LABEL = /^\*\*step\s+\d+:?\*\*\s*/i;
const DIVIDER = /^(?:-{3,}|\*{3,}|_{3,})$/;

export function stepsFromMarkdown(markdown: string): string[] {
  const lines = markdown.split("\n");
  const hasList = lines.some((line) => LIST_ITEM.test(line));
  const steps: string[] = [];
  let current: string[] = [];
  let afterBlank = false;

  const finish = () => {
    const text = current
      .join(" ")
      .replace(/\s+/g, " ")
      .trim()
      .replace(STEP_LABEL, "");
    if (text) steps.push(text);
    current = [];
  };

  for (const line of lines) {
    const trimmed = line.trim();
    if (STEP_HEADING.test(trimmed) || DIVIDER.test(trimmed)) {
      finish();
    } else if (/^#+\s/.test(trimmed)) {
      finish();
      current.push(`**${trimmed.replace(/^#+\s*/, "")}**`);
      finish();
    } else if (
      !/^\s/.test(line) &&
      !LIST_ITEM.test(line) &&
      startsSection(trimmed, current)
    ) {
      finish();
      current.push(trimmed);
      finish();
    } else if (hasList ? LIST_ITEM.test(line) : !trimmed) {
      finish();
      current.push(trimmed.replace(LIST_ITEM, ""));
    } else if (trimmed) {
      // In a list, an unindented line after a blank one is a new paragraph, not the item's.
      if (hasList && afterBlank && !/^\s/.test(line)) finish();
      current.push(trimmed);
    }
    afterBlank = !trimmed;
  }
  finish();
  return steps;
}

// Whether a line is a heading that splits off where it is: a bold one always; a plain one
// ending in a colon only where a paragraph could start, so a wrapped sentence that happens to
// end in a colon stays whole. A list item ending in a colon is the item (its marker goes), and
// `withSections` makes it a section.
function startsSection(line: string, before: string[]): boolean {
  if (!sectionTitle(line)) return false;
  const last = before.at(-1);
  return line.startsWith("**") || last === undefined || /[.!?:]$/.test(last);
}

// A step that's only a heading names the steps under it (D35): bold only ("**Bechamel/Mornay
// Sauce Method:**", "**TIP**"), or a short plain line ending in a colon ("For the sauce:").
// Its title, without the bold or the colon; null for a real step, including a short bold
// instruction ("**Don't overmix!**"), which ends like a sentence.
const BOLD_HEADING = /^\*\*([^*]{1,60}?):?\*\*:?$/;
const PLAIN_HEADING = /^([^.!?*:]{1,40}):$/;

export function sectionTitle(step: string): string | null {
  const text = step.trim();
  const title = (BOLD_HEADING.exec(text) ??
    PLAIN_HEADING.exec(text))?.[1]?.trim();
  return title && !/[.!?]$/.test(title) ? title : null;
}

export type MethodStep = { text: string; section: string | null };

// Steps with their sections: a heading followed by a step becomes the section of the steps
// after it. A heading with no step of its own (the last, or one before another heading) stays
// a step, so no words are lost.
export function withSections(steps: string[]): MethodStep[] {
  const method: MethodStep[] = [];
  let section: string | null = null;
  steps.forEach((text, index) => {
    const next = steps[index + 1];
    const title = sectionTitle(text);
    if (title && next !== undefined && sectionTitle(next) === null) {
      section = title;
    } else {
      method.push({ text, section });
    }
  });
  return method;
}

export type StepGroup<T> = {
  section: string | null;
  first: number;
  steps: T[];
};

// Runs of steps that share a section, to show its heading once over them. `first` is the
// number of a run's first step, so numbering runs on across sections (D35).
export function stepGroups<T extends { section: string | null }>(
  steps: T[],
): StepGroup<T>[] {
  const groups: StepGroup<T>[] = [];
  steps.forEach((step, index) => {
    const last = groups.at(-1);
    if (last && last.section === step.section) {
      last.steps.push(step);
    } else {
      groups.push({ section: step.section, first: index + 1, steps: [step] });
    }
  });
  return groups;
}
