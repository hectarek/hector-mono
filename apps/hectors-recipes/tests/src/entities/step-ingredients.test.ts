import { describe, expect, it } from "bun:test";
import { stepIngredients } from "@/src/entities/step-ingredients";

// Lines and steps from Hector's recipes (A Better Turkey Chili, Beef Stew).
const lines = [
  "vegetable oil",
  "large onion",
  "large green bell pepper",
  "garlic",
  "ground turkey",
  "crushed tomatoes (28-ounce)",
  "kidney beans (15-ounce)",
  "black beans (15-ounce)",
  "Salt and pepper",
].map((name) => ({ name }));
const used = (step: string) =>
  stepIngredients(step, lines).map((line) => line.name);

describe("stepIngredients", () => {
  it("finds lines by name, singular or plural", () => {
    expect(used("Add garlic and cook for 1 minute more.")).toEqual(["garlic"]);
    expect(used("Add the ground turkey and brown it.")).toEqual([
      "ground turkey",
    ]);
    expect(used("Season with salt and pepper.")).toEqual(["Salt and pepper"]);
  });

  it("finds a line by its last word when no other line shares it", () => {
    expect(used("Heat the oil in a large pot.")).toEqual(["vegetable oil"]);
    expect(used("Add the onion and bell pepper; cook until softened.")).toEqual(
      ["large onion", "large green bell pepper"],
    );
    expect(used("Stir in the tomatoes.")).toEqual([
      "crushed tomatoes (28-ounce)",
    ]);
  });

  // D68: "the beans" is both cans, but "the oil" could be either of two.
  it("finds every line sharing a last word the step says in the plural", () => {
    expect(used("Add the beans.")).toEqual([
      "kidney beans (15-ounce)",
      "black beans (15-ounce)",
    ]);
    expect(used("Add the kidney beans.")).toEqual(["kidney beans (15-ounce)"]);
    // "pepper" here is the bell pepper's, not the salt and pepper's.
    expect(used("Add the onion and bell peppers.")).toEqual([
      "large onion",
      "large green bell pepper",
    ]);
    const oils = [{ name: "olive oil" }, { name: "toasted sesame oil" }];
    expect(stepIngredients("Heat the oil.", oils)).toEqual([]);
  });

  it("finds an ingredient listed twice by its shared name", () => {
    const butters = [
      { name: "unsalted butter" },
      { name: "unsalted butter (cut into cubes)" },
    ];
    expect(stepIngredients("Melt the butter.", butters)).toEqual(butters);
    // Not where the word is inside another line's name.
    const peppers = [
      { name: "ground black pepper" },
      { name: "ground black pepper" },
      { name: "red pepper flakes" },
    ];
    expect(
      stepIngredients("Add the red pepper flakes.", peppers).map(
        (line) => line.name,
      ),
    ).toEqual(["red pepper flakes"]);
  });

  it("finds a line by the word that names it, when no other line has it", () => {
    const chicken = [
      { name: "boneless skinless chicken breasts" },
      { name: "olive oil" },
    ];
    const usedOf = (step: string, of = chicken) =>
      stepIngredients(step, of).map((line) => line.name);
    expect(usedOf("Add the chicken and brown it.")).toEqual([
      "boneless skinless chicken breasts",
    ]);
    expect(
      usedOf("Add the chicken.", [...chicken, { name: "chicken broth" }]),
    ).toEqual([]);
    // A step's "baking sheet" isn't the baking powder.
    expect(usedOf("Line a baking sheet.", [{ name: "baking powder" }])).toEqual(
      [],
    );
    // "large" and "red" describe it; "bell" is the word that names it.
    expect(
      usedOf("In a large bowl", [{ name: "large red bell pepper" }]),
    ).toEqual([]);
  });

  it("finds a name with 'or' by either side", () => {
    // Each beside a line it could be mistaken for.
    const either = [
      { name: "soy sauce or liquid aminos" },
      { name: "dark soy sauce" },
      { name: "black or pinto beans" },
      { name: "kidney beans" },
    ];
    const usedOf = (step: string) =>
      stepIngredients(step, either).map((line) => line.name);
    expect(usedOf("Stir in the soy sauce.")).toEqual([
      "soy sauce or liquid aminos",
    ]);
    // A one-word side takes the last side's last word: black beans.
    expect(usedOf("Add the black beans.")).toEqual(["black or pinto beans"]);
  });

  // From the review of Hector's recipes: "the sauce" was mostly one the recipe makes.
  it("doesn't find a line by a loose last word alone", () => {
    const soy = [{ name: "low-sodium soy sauce" }];
    expect(stepIngredients("Pour in the sauce.", soy)).toEqual([]);
    expect(stepIngredients("Add the soy sauce.", soy)).toEqual(soy);
  });

  it("matches whole words only", () => {
    expect(used("Bring salted water to a boil.")).toEqual([]);
  });

  // Found in Phase 21's screenshots: "slice the green onions" listed the onion too.
  it("doesn't find a name that's only part of a longer line's name", () => {
    const onions = [{ name: "onion" }, { name: "green onions" }];
    const usedOf = (step: string) =>
      stepIngredients(step, onions).map((line) => line.name);
    expect(usedOf("Slice the green onions for serving.")).toEqual([
      "green onions",
    ]);
    expect(usedOf("Add the onion, then the green onions.")).toEqual([
      "onion",
      "green onions",
    ]);
    expect(usedOf("Dice the onion.")).toEqual(["onion"]);
  });
});
