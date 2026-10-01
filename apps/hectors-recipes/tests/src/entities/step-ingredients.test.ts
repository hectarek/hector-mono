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

  it("doesn't guess between lines that share a last word", () => {
    // "beans" could be either can; only the full name picks one.
    expect(used("Add the beans.")).toEqual([]);
    expect(used("Add the kidney beans.")).toEqual(["kidney beans (15-ounce)"]);
  });

  it("matches whole words only", () => {
    expect(used("Bring salted water to a boil.")).toEqual([]);
  });
});
