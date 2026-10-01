import { describe, expect, it } from "bun:test";
import {
  durationMinutes,
  pageText,
  recipeFromPage,
  servingsFrom,
} from "@/src/entities/recipe-page";

// Fixtures copy the shapes of the recipe data on the sites Hector's recipes come from
// (ux-plan P10.3), with made-up recipes: the wording is ours, the structure is theirs.
const page = (...blocks: unknown[]) =>
  `<!doctype html><html><head><title>A recipe</title>${blocks
    .map(
      (block) =>
        `<script type="application/ld+json">${typeof block === "string" ? block : JSON.stringify(block)}</script>`,
    )
    .join("")}</head><body><h1>A recipe</h1></body></html>`;

describe("recipeFromPage", () => {
  // WP Recipe Maker, as Budget Bytes and Umami Girl publish it: the recipe in an @graph, prices
  // in the lines, doubled spaces, entities in the text.
  it("reads a recipe from an @graph, tidying its lines", () => {
    const read = recipeFromPage(
      page({
        "@context": "https://schema.org",
        "@graph": [
          { "@type": "Article", headline: "Weeknight chicken" },
          {
            "@type": "Recipe",
            name: "Sticky Chili Chicken",
            description: "Sweet, hot and done in 25 minutes &#8211; really.",
            image: [
              "https://example.com/chicken-1x1.jpg",
              "https://example.com/chicken-4x3.jpg",
            ],
            recipeYield: ["4", "4 servings"],
            prepTime: "PT10M",
            cookTime: "PT15M",
            totalTime: "PT25M",
            recipeIngredient: [
              "¼ cup brown sugar ($0.12)",
              "2 tablespoons (30 ml)  olive oil, divided",
              "1 &frac12; lb chicken thighs",
              "black pepper (freshly cracked, $0.05)",
            ],
            recipeInstructions: [
              {
                "@type": "HowToStep",
                name: "Mix the glaze",
                text: "Stir the sugar and chili together.",
                url: "https://example.com/#step-1",
              },
              {
                "@type": "HowToStep",
                text: "Roast the chicken for 20 minutes, brushing on the glaze.",
              },
            ],
          },
        ],
      }),
    );
    expect(read?.imageUrl).toBe("https://example.com/chicken-1x1.jpg");
    const draft = read?.draft;
    expect(draft).toMatchObject({
      title: "Sticky Chili Chicken",
      description: "Sweet, hot and done in 25 minutes – really.",
      yieldServings: 4,
      timeMinutes: 25,
      unsure: [],
      flagged: [],
    });
    expect(
      draft?.ingredients.map(({ raw, quantity, unit, name, note }) => [
        raw,
        quantity,
        unit,
        name,
        note,
      ]),
    ).toEqual([
      ["¼ cup brown sugar", 0.25, "cup", "brown sugar", null],
      [
        "2 tablespoons (30 ml) olive oil, divided",
        2,
        "tbsp",
        "olive oil",
        "divided",
      ],
      ["1 ½ lb chicken thighs", 1.5, "lb", "chicken thighs", null],
      [
        "black pepper (freshly cracked)",
        null,
        null,
        "black pepper (freshly cracked)",
        null,
      ],
    ]);
    expect(draft?.steps).toEqual([
      {
        text: "Stir the sugar and chili together.",
        timerMinutes: null,
        section: null,
      },
      {
        text: "Roast the chicken for 20 minutes, brushing on the glaze.",
        timerMinutes: 20,
        section: null,
      },
    ]);
  });

  // Ricardo: steps grouped under HowToSection headings (D35), hours in the times.
  it("keeps the page's step sections, and runs numbering on through them", () => {
    const read = recipeFromPage(
      page({
        "@context": "http://schema.org",
        "@type": "Recipe",
        name: "Jam Doughnuts",
        recipeYield: "12 serving(s)",
        prepTime: "PT45M",
        cookTime: "PT15M",
        totalTime: "PT1H",
        recipeIngredient: ["2 cups flour", "1 cup milk"],
        recipeInstructions: [
          {
            "@type": "HowToSection",
            name: "Doughnuts",
            itemListElement: [
              { "@type": "HowToStep", text: "Mix the dough." },
              { "@type": "HowToStep", text: "Let it rise for 1 hour." },
            ],
          },
          {
            "@type": "HowToSection",
            name: "Filling",
            itemListElement: [{ "@type": "HowToStep", text: "Fill with jam." }],
          },
        ],
      }),
    );
    expect(read?.draft.yieldServings).toBe(12);
    expect(read?.draft.timeMinutes).toBe(60);
    expect(read?.draft.steps).toEqual([
      { text: "Mix the dough.", timerMinutes: null, section: "Doughnuts" },
      {
        text: "Let it rise for 1 hour.",
        timerMinutes: 60,
        section: "Doughnuts",
      },
      { text: "Fill with jam.", timerMinutes: null, section: "Filling" },
    ]);
  });

  // Taste of Home: an ImageObject, "4 servings", a comma-listed cuisine.
  it("takes an image object's address and a yield written with its unit", () => {
    const read = recipeFromPage(
      page({
        "@context": "https://schema.org",
        "@type": "Recipe",
        name: "Beef Rice Bowls",
        image: {
          "@type": "ImageObject",
          url: "https://example.com/bowl.jpg",
          width: 1200,
        },
        recipeYield: "4 servings",
        totalTime: "PT15M",
        recipeIngredient: ["1 pound lean ground beef (90% lean)"],
        recipeInstructions: [
          {
            "@type": "HowToStep",
            name: "Brown the beef.",
            text: "Brown the beef.",
          },
        ],
      }),
    );
    expect(read?.imageUrl).toBe("https://example.com/bowl.jpg");
    expect(read?.draft).toMatchObject({ yieldServings: 4, timeMinutes: 15 });
  });

  // Bon Appétit and Forks Over Knives: a yield that isn't servings, no total time, lines
  // with leading spaces, and minutes past 60 with no hours.
  it("leaves out a yield that isn't servings, and adds prep and cook when there's no total", () => {
    const read = recipeFromPage(
      page({
        "@context": "https://schema.org/",
        "@type": ["Recipe", "NewsArticle"],
        name: "Banana Loaf",
        recipeYield: "Makes 1 loaf",
        prepTime: "PT10M",
        cookTime: "PT65M",
        recipeIngredient: ["  4 ripe bananas", "  "],
        recipeInstructions: [
          { "@type": "HowToStep", name: "", text: "Mash the bananas." },
        ],
      }),
    );
    expect(read?.draft).toMatchObject({ yieldServings: null, timeMinutes: 75 });
    expect(read?.draft.ingredients.map((line) => line.raw)).toEqual([
      "4 ripe bananas",
    ]);
  });

  // Shapes that used to lose a recipe's time, photo or servings (P14.9).
  it("takes a cook or prep time on its own as the time", () => {
    const time = (fields: Record<string, string>) =>
      recipeFromPage(
        page({
          "@type": "Recipe",
          name: "Toast",
          recipeIngredient: ["2 slices bread"],
          ...fields,
        }),
      )?.draft.timeMinutes;
    expect(time({ cookTime: "PT25M" })).toBe(25);
    expect(time({ prepTime: "PT10M" })).toBe(10);
    expect(time({})).toBeNull();
  });

  it("finds a photo by a relative path or an image object's contentUrl", () => {
    const photo = (image: unknown) =>
      recipeFromPage(
        page({
          "@type": "Recipe",
          name: "Toast",
          recipeIngredient: ["2 slices bread"],
          image,
        }),
        "https://example.com/recipes/toast",
      )?.imageUrl;
    expect(photo("/images/toast.jpg")).toBe(
      "https://example.com/images/toast.jpg",
    );
    expect(photo("toast.jpg")).toBe("https://example.com/recipes/toast.jpg");
    expect(
      photo({
        "@type": "ImageObject",
        contentUrl: "https://cdn.example.com/t.jpg",
      }),
    ).toBe("https://cdn.example.com/t.jpg");
    expect(photo("javascript:alert(1)")).toBeNull();
    expect(
      photo({ "@type": "ImageObject", url: "", contentUrl: "/t.jpg" }),
    ).toBe("https://example.com/t.jpg");
  });

  it("reads recipe data with a raw line break inside a string", () => {
    const read = recipeFromPage(
      page(
        '{"@type": "Recipe", "name": "Toast", "recipeIngredient": ["2 slices\nbread"], "description": "Crisp\tand hot"}',
      ),
    );
    expect(read?.draft.ingredients.map((line) => line.raw)).toEqual([
      "2 slices bread",
    ]);
  });

  it("splits steps given as one block of text or HTML", () => {
    const steps = (recipeInstructions: unknown) =>
      recipeFromPage(
        page({
          "@type": "Recipe",
          name: "Toast",
          recipeIngredient: ["2 slices bread"],
          recipeInstructions,
        }),
      )?.draft.steps.map((step) => step.text);
    expect(steps("1. Toast the bread.\n2. Butter it.")).toEqual([
      "Toast the bread.",
      "Butter it.",
    ]);
    expect(
      steps("<ol><li>Toast the bread.</li><li>Butter it.</li></ol>"),
    ).toEqual(["Toast the bread.", "Butter it."]);
    expect(steps(["Toast the bread.", "Butter it."])).toEqual([
      "Toast the bread.",
      "Butter it.",
    ]);
  });

  it("finds nothing on a page without a recipe, or with only broken data", () => {
    expect(
      recipeFromPage(page({ "@type": "BreadcrumbList", itemListElement: [] })),
    ).toBeNull();
    expect(recipeFromPage(page("{ not json"))).toBeNull();
    expect(
      recipeFromPage("<html><body>No data here.</body></html>"),
    ).toBeNull();
    // A recipe with no ingredients is too little to fill the form with.
    expect(
      recipeFromPage(page({ "@type": "Recipe", name: "Mystery" })),
    ).toBeNull();
  });
});

describe("durationMinutes", () => {
  it.each([
    ["PT25M", 25],
    ["PT1H", 60],
    ["PT1H5M", 65],
    ["PT115M", 115],
    ["P0DT2H30M", 150],
    ["PT0S", null],
    ["soon", null],
    [undefined, null],
  ])("%p is %p minutes", (duration, minutes) => {
    expect(durationMinutes(duration)).toBe(minutes);
  });
});

describe("servingsFrom", () => {
  it.each([
    ["4", 4],
    [6, 6],
    [["4", "4 servings"], 4],
    ["4 servings", 4],
    ["18 serving(s)", 18],
    ["Serves 6", 6],
    ["Serves 4-6", 4],
    ["Serves: 4", 4],
    ["Servings: 6", 6],
    ["Makes 4 servings", 4],
    ["Yield: 8 servings", 8],
    ["4.0", 4],
    ["Makes 1 loaf", null],
    ["Makes 24", null],
    ['Makes two 9" logs', null],
    ["24 cookies", null],
    [undefined, null],
  ])("%p serves %p", (recipeYield, servings) => {
    expect(servingsFrom(recipeYield)).toBe(servings);
  });
});

describe("pageText", () => {
  it("keeps the words a person sees, a line per block, without scripts or styles", () => {
    expect(
      pageText(
        "<html><head><title>T</title><style>p{}</style></head><body><nav>Home</nav>" +
          "<h1>Toast</h1><script>track()</script><ul><li>2 slices bread</li>" +
          "<li>Butter &amp; jam</li></ul><p>Toast it.<br>Eat it.</p></body></html>",
      ),
    ).toBe("Home\nToast\n2 slices bread\nButter & jam\nToast it.\nEat it.");
  });

  it("caps a long page", () => {
    expect(pageText(`<p>${"word ".repeat(10_000)}</p>`, 100)).toHaveLength(100);
  });
});

// A page built to be slow to read: tags that never close, at the fetcher's 3 MB cap. Before
// P14.1 each unclosed tag was scanned to the end of the page, so time grew with the square of
// its size (a 200 KB page took 26 s).
describe("reading a crafted page", () => {
  const unclosed = (tag: string) =>
    tag.repeat(Math.ceil(3_000_000 / tag.length));

  it.each([
    ['<script type="application/ld+json">'],
    ["<svg>"],
    ["<!--"],
    ["<head>"],
    ["<p"],
    ["<"],
  ])("takes one pass over a page of %p", (tag) => {
    const html = unclosed(tag);
    const started = performance.now();
    recipeFromPage(html);
    pageText(html);
    expect(performance.now() - started).toBeLessThan(1_000);
  });

  // The page's recipe data is read without AI, rate limit or a person waiting on a model,
  // so its fields get the same care (P14 review).
  it.each([
    [
      "steps as one block of <li",
      { recipeInstructions: "<li".repeat(100_000) },
    ],
    ["a step of [", { recipeInstructions: ["[".repeat(300_000)] }],
    ["a step of [a](", { recipeInstructions: ["[a](".repeat(75_000)] }],
    ["a line of commas", { recipeIngredient: [`a${", ".repeat(150_000)}x`] }],
    [
      "a line of bare commas",
      { recipeIngredient: [`${",".repeat(300_000)}x`] },
    ],
    ["a yield of spaces", { recipeYield: `serves${" ".repeat(300_000)}x` }],
    [
      "thousands of lines",
      { recipeIngredient: Array(20_000).fill("1 cup flour") },
    ],
  ])("takes one pass over recipe data with %s", (_, fields) => {
    const html = page({
      "@type": "Recipe",
      name: "Toast",
      recipeIngredient: ["2 slices bread"],
      ...fields,
    });
    const started = performance.now();
    recipeFromPage(html);
    expect(performance.now() - started).toBeLessThan(1_000);
  });

  it("ends a <head> left open where the <body> starts, as a browser does", () => {
    expect(
      pageText("<html><head><title>Toast</title><body><p>Butter it.</p>"),
    ).toBe("Butter it.");
  });

  it("still reads what comes before an unclosed tag, and skips what's inside it", () => {
    expect(pageText("<p>Toast</p><script>track(")).toBe("Toast");
    expect(pageText("<p>Toast</p><svg><text>Logo")).toBe("Toast");
    expect(pageText("<p>Toast</p><!-- note <p>Hidden</p>")).toBe("Toast");
  });
});
