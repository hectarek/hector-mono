import { describe, expect, it, spyOn } from "bun:test";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { renderToString } from "react-dom/server";
import { GrowthCalculator } from "@/app/compound-growth/growth-calculator";

const EXAMPLE_SENTENCE =
  "Putting in $200 a month for 30 years at 7% a year, you'd have about $233,979.";

// The one live region on the page: it must hold only the headline sentence or the fix.
function liveRegion(): HTMLElement {
  const regions = document.querySelectorAll<HTMLElement>("[aria-live]");
  expect(regions.length).toBe(1);
  const [region] = regions;
  if (!region) throw new Error("No live region");
  return region;
}

// The block under the sentence: the parts, the chart and the table.
function resultBody(): HTMLElement {
  const body = screen
    .getByText("What you put in", { selector: "dt" })
    .closest("dl")?.parentElement?.parentElement;
  if (!body) throw new Error("No result body");
  return body;
}

describe("the growth calculator", () => {
  it("prerenders the example's result, with the note for a browser that can't run the page", () => {
    const html = renderToString(<GrowthCalculator />);
    expect(html).toContain(EXAMPLE_SENTENCE.replace("'", "&#x27;"));
    expect(html).toContain("They change as you type once the page has loaded");
    // The parts and the table are in the page too. recharts 3.11 draws the chart's lines only
    // once the page's code runs, so the table carries the numbers until then.
    expect(html).toContain(">$72,000</dd>");
    expect(html).toContain(">$233,979</td>");
  });

  it("drops the note once the page's code runs", () => {
    render(<GrowthCalculator />);
    expect(
      screen.queryByText(/They change as you type once the page has loaded/),
    ).toBeNull();
  });

  it("hides the result's numbers while the deposit is empty, keeping their place, and names the fix", async () => {
    render(<GrowthCalculator />);
    expect(liveRegion().textContent).toBe(EXAMPLE_SENTENCE);
    expect(resultBody().classList.contains("invisible")).toBe(false);

    fireEvent.change(screen.getByLabelText("Deposit"), {
      target: { value: "" },
    });

    // visibility: hidden keeps the block's height, and its last numbers can't be seen or read.
    expect(resultBody().classList.contains("invisible")).toBe(true);
    expect(resultBody().textContent).toContain("$233,979");
    expect(screen.getByLabelText("Deposit").getAttribute("aria-invalid")).toBe(
      "true",
    );
    await waitFor(() =>
      expect(liveRegion().textContent).toBe(
        "Enter a deposit to see what it grows to",
      ),
    );

    fireEvent.change(screen.getByLabelText("Deposit"), {
      target: { value: "$300" },
    });

    expect(resultBody().classList.contains("invisible")).toBe(false);
    expect(screen.getByLabelText("Deposit").hasAttribute("aria-invalid")).toBe(
      false,
    );
    await waitFor(() =>
      expect(liveRegion().textContent).toBe(
        "Putting in $300 a month for 30 years at 7% a year, you'd have about $350,969.",
      ),
    );
  });

  it("changes the live region once per settled edit, to the sentence alone", async () => {
    render(<GrowthCalculator />);
    const region = liveRegion();
    const seen: string[] = [];
    const observer = new MutationObserver(() => {
      seen.push(region.textContent ?? "");
    });
    observer.observe(region, {
      childList: true,
      characterData: true,
      subtree: true,
    });

    const deposit = screen.getByLabelText("Deposit");
    // Typed a key at a time, with a pause between keys shorter than the settle time.
    for (const typed of ["2", "25", "250"]) {
      fireEvent.change(deposit, { target: { value: typed } });
      await new Promise((resolve) => setTimeout(resolve, 150));
    }

    const settled =
      "Putting in $250 a month for 30 years at 7% a year, you'd have about $292,474.";
    await waitFor(() => expect(region.textContent).toBe(settled));
    // Give a second announcement time to arrive, if one were coming.
    await new Promise((resolve) => setTimeout(resolve, 700));
    observer.disconnect();
    expect([...new Set(seen)]).toEqual([settled]);
  });

  it("reads a comma in the return field as a decimal point", async () => {
    render(<GrowthCalculator />);
    fireEvent.change(screen.getByLabelText("Yearly return"), {
      target: { value: "6,5" },
    });
    await waitFor(() =>
      expect(liveRegion().textContent).toContain("at 6.5% a year"),
    );
  });

  it("in today's dollars, asks for inflation and says when inflation took more than the return gave", async () => {
    render(<GrowthCalculator />);
    expect(screen.queryByLabelText("Inflation a year")).toBeNull();

    fireEvent.click(screen.getByRole("switch"));
    expect(screen.getByLabelText("Inflation a year")).toBeTruthy();
    fireEvent.change(screen.getByLabelText("Yearly return"), {
      target: { value: "0" },
    });

    expect(
      screen.getByText("What inflation took", { selector: "dt" }),
    ).toBeTruthy();
    await waitFor(() =>
      expect(liveRegion().textContent).toContain(
        "in today's dollars, at 3% inflation: less than",
      ),
    );
  });

  it("with yearly deposits that stop early, says the money then keeps growing", async () => {
    render(<GrowthCalculator />);
    fireEvent.click(screen.getByRole("button", { name: "Each year" }));
    fireEvent.change(screen.getByLabelText("Keep putting money in for"), {
      target: { value: "10" },
    });
    await waitFor(() =>
      expect(liveRegion().textContent).toContain(
        "Putting in $200 a year for 10 years, then letting it grow until year 30, at 7% a year",
      ),
    );
  });

  it("keeps every focus stop out of the chart", () => {
    // happy-dom lays nothing out, so recharts would measure 0 by 0 and draw nothing: give the
    // chart a phone's width.
    const size = spyOn(
      HTMLElement.prototype,
      "getBoundingClientRect",
    ).mockReturnValue(new DOMRect(0, 0, 320, 256));
    render(<GrowthCalculator />);
    size.mockRestore();
    const chart = document.querySelector<HTMLElement>('[data-slot="chart"]');
    if (!chart) throw new Error("No chart");
    expect(chart.getAttribute("aria-hidden")).toBe("true");
    // The chart drew, so the check below has something to look in.
    expect(chart.querySelector("svg")).not.toBeNull();
    expect(
      chart.querySelectorAll(
        'a[href], button, input, select, textarea, [tabindex]:not([tabindex="-1"])',
      ).length,
    ).toBe(0);
  });
});
