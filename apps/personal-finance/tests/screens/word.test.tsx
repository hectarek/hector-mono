import { describe, expect, it } from "bun:test";
import { fireEvent, render, screen } from "@testing-library/react";
import { renderToStaticMarkup } from "react-dom/server";
import { Word } from "@/app/_components/word";
import { WORDS } from "@/src/content/words";

describe("a money word's first use", () => {
  it("is a link to its glossary entry before the page's code loads", () => {
    expect(renderToStaticMarkup(<Word slug="budget">budget</Word>)).toContain(
      'href="/words#budget"',
    );
  });

  it("shows its definition in place when tapped, without leaving the page", async () => {
    render(
      <p>
        A <Word slug="budget">budget</Word> is a plan.
      </p>,
    );
    fireEvent.click(screen.getByText("budget"));
    const definition = await screen.findByText(WORDS.budget.definition);
    // A sideways drag inside the definition mustn't change the walkthrough's step.
    expect(definition.closest("[data-swipe-ignore]")).not.toBeNull();
    expect(window.location.hash).toBe("");
    expect(
      screen.getByRole("link", { name: "See every word" }).getAttribute("href"),
    ).toBe("/words#budget");
  });
});
