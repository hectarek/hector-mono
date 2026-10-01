# Design

Short style guide for the portfolio. The goal: make every page feel like a single deliberate piece of work, not a shadcn template.

## The Vibe

A fresh, clean dot-grid journal. Imagine a high-quality Leuchtturm/Moleskine-style notebook — crisp neutral paper, faint dots holding the page together, mono labels written like field notes, hairline rules between sections, hand-numbered chapters, and one warm honey accent doing all the color work.

It should feel: clean, crisp, organized, hopeful, and modern. A working notebook from a builder/operator who keeps things tidy. Practical, technical, and personal — never corporate, never flashy, never aged.

Bold and opinionated through structure and typography, restrained with color and decoration.

## Voice

- Direct, pragmatic, dry.
- Plain language first; technical detail when it earns its place.
- "Builder/operator" is the through-line — someone who scopes the problem, designs the system, and ships the thing.
- Personality leans humble and curious, not corporate or hustle-y. No "passionate self-starter" energy.
- Mono labels carry the dossier feel: small, uppercase, tracking-wide. Sentences can be casual.

## Paper & Grid

The page itself is the brand element.

- The whole site sits on a subtle dot grid (~20px spacing) that visually reads as dot-grid notebook paper. The dots are very faint — present in every empty area, hidden behind cards and content surfaces.
- A barely-perceptible paper grain (SVG noise overlay) sits across the entire page. It adds the fiber/texture of real paper without going vintage.
- Cards, panels, and content blocks use the paper surface to "cover" the dots underneath, the same way writing on a notebook covers the dot grid where ink lands.
- Section eyebrows act like hand-numbered chapter markers. Hairline rules act like a deliberate page break.

The intent is fresh notebook paper, not parchment, not aged stock, not "bookish." Modern, slightly warm, optimistic.

## Typography

Three working fonts, plus one sparingly used handwriting accent:

- **`IBM Plex Mono`** is the display + label voice. Hero name, section headings, metric values, eyebrows, status chips, CTA labels, navigation links, captions. It's the personality of the site.
- **`Geist Sans`** is the body voice. Paragraphs, project descriptions, list items. Calm, neutral, gets out of the way.
- **`Instrument Serif`** appears once or twice per page in italic. The hero tagline, the about intro line, the /now intro. A single poetic moment to keep the page from feeling cold.
- **`Caveat`** (clean modern handwriting) is reserved for marginalia-level accents — at most one or two words per page. Think: a single highlighted word that feels like a quick pen note in the margin of the journal. Never used for body text, paragraphs, headings, or anything someone has to actually read at length.

CTA buttons are mono, uppercase, tracking-wide. Same treatment whether primary or outline. They read as deliberate UI elements, not generic shadcn buttons.

## Color

One color, used with intent.

- **Paper** — neutral off-white in light mode, neutral charcoal in dark mode. True grayscale (`background`, with `muted` as the second paper).
- **Ink** — soft off-black for primary text, mid-gray for secondary, faint gray for mono labels.
- **Rule** — hairline grays for borders and dividers.
- **Accent — warm honey amber.** `oklch(58% 0.15 75)` in light mode, `oklch(82% 0.16 88)` in dark mode. Used for status dots, key metric values, the period after the name, hover states, and the few signature flourishes (pulsing "available" dot, accent links, the rare handwritten word). It is the only color in the design.

If something else needs color, we make it ink, paper, or accent. Anything else dilutes the system.

## Layout & Atmosphere

- Every section uses `max-w-6xl` outer container. The hairline rule and section eyebrow always sit at this consistent edge — that's how the site reads as a continuous dossier.
- Inner narrative content (paragraphs, dl lists, single-column timelines) constrains to `max-w-3xl` or `max-w-4xl` for comfortable reading. The visual edge stays wide; the reading width stays narrow.
- Section eyebrows: a large faded mono numeral (`01`, `02`...) followed by a small mono label, set off by a hairline tick. Sequential numbering across the homepage tells the reader it's a structured document.
- Page-level dot grid + paper grain set the constant background atmosphere. Individual sections don't need to add extra dots — the page is already the journal.
- Hairline rules separate major sections (`border-t mb-8` / `border-t mb-10`, which draw in the `border` colour; a strong rule is `border-foreground/25`). No card shadows. No drop-shadows.
- Cards: hairline border + accent border on hover. Status chips show a small colored category dot.
- Asymmetric hero: name + tagline + bio + CTAs on the left, big portrait photo with a mono caption strip on the right.

## Component Hints

- **Buttons** — `size="label"` (mono, uppercase, tracked) with the `default` variant (solid ink on paper) or `outline` (hairline border). Never restyle a Button's type or colour through `className`. Tertiary is a plain mono link with an accent icon.
- **Project cards** — hairline border, accent on hover, status chip in the image corner, a key metric in the top-right of the card body in accent.
- **Proof / approach grids** — `gap-px` on a `bg-border` grid (inside `border border-border`) so cells share clean hairlines without double borders.
- **Timeline** — single hairline rule on the left, small status dot at each role, mono period label.
- **Photo** — 4:5 portrait rectangle, hairline border, mono caption strip below (`location` left, `availability` with pulsing dot right).
- **Nav** — three items (`Work`, `About`, `Contact`). Brand is `/ Hector Gonzalez`. The cursor `>` shows on hover and persists for the active route.
- **Footer** — three columns: brand attribution, site links (including `Now`), elsewhere + colophon line.

## What It Isn't

- Not a default shadcn portfolio. No purple-blue gradients, no rounded mega-buttons, no card shadow hovers, no Inter-only typography.
- Not editorial or magazine-styled. No big serif-only headings, no pull-quotes, no marginalia-as-system.
- Not a vintage / old book / parchment look. The paper is fresh and crisp, not aged or sepia.
- Not a maximalist neobrutalist site. No thick black borders, no chunky shadows.
- Not corporate. No "innovative solutions", no stock-photo energy, no hero gradient illustrations.
- Not loud with color. The accent is one color, used sparingly enough that you remember it.
- Not handwriting-heavy. Caveat is a marginalia accent, never a content choice.

## North Star

If a new component or page makes someone think "this looks like a clean modern dot-grid notebook used by a builder, with one warm signature accent," it's right. If it looks like a generic dev portfolio, a template, or an old leather-bound book, it's wrong.
