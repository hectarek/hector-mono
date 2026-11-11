import { describe, expect, it } from "bun:test";
import { render } from "@testing-library/react";
import { TrackMap } from "@/app/_components/track-map";
import type { Season } from "@/src/entities/models/settings.model";

// A fictional season of 91 days with two checkpoints, as the design system's TrackMap draws it.
const SEASON: Season = {
  start: "2026-11-02",
  finish: "2027-02-01",
  checkpoints: [
    { on: "2026-11-13", name: "Portfolio live" },
    { on: "2026-12-18", name: "Five screens" },
  ],
};

const track = (today: string, season = SEASON) =>
  render(<TrackMap season={season} today={today} />);

describe("the season's track (R9 as revised 2026-11-10)", () => {
  it("says where today falls: its day of the sector, and the checkpoint the sector ends at", () => {
    const view = track("2026-11-05");

    expect(view.getByRole("img").getAttribute("aria-label")).toBe(
      "The season as a track, from Nov 2 to Feb 1. Today is day 4 of sector 1 of 3, which ends at the Nov 13 checkpoint, Portfolio live.",
    );
  });

  it("labels the start, each checkpoint's gate and the finish with the day and the leg's length", () => {
    const view = track("2026-11-05");

    const labels = [...view.container.querySelectorAll("text")].map(
      (label) => label.textContent,
    );
    expect(labels).toEqual(
      expect.arrayContaining([
        "NOV 2",
        "S1 · NOV 13 · 11D",
        "S2 · DEC 18 · 35D",
        "FINISH · FEB 1 · 45D",
        "YOU",
      ]),
    );
    expect(view.container.querySelectorAll("line")).toHaveLength(2);
  });

  it("runs the road in signal to today's share of the season", () => {
    const run = (today: string) =>
      track(today)
        .container.querySelector("path[pathLength]")
        ?.getAttribute("stroke-dasharray");

    expect(run("2026-11-02")).toBe("0 100");
    expect(run("2027-02-01")).toBe("100 100");
    expect(run("2026-12-17")).toBe(`${(45 / 91) * 100} 100`);
  });

  it("names the finish as the end of the last sector", () => {
    const view = track("2027-01-01");

    expect(view.getByRole("img").getAttribute("aria-label")).toBe(
      "The season as a track, from Nov 2 to Feb 1. Today is day 15 of sector 3 of 3, which ends at the finish on Feb 1.",
    );
  });

  it("holds the car at the start before the season, and at the finish after it", () => {
    const car = (today: string) =>
      track(today).container.querySelector("circle:last-of-type");

    const before = track("2026-10-30");
    expect(before.getByRole("img").getAttribute("aria-label")).toBe(
      "The season as a track, from Nov 2 to Feb 1. It starts on Nov 2.",
    );
    expect(car("2026-10-30")?.getAttribute("cx")).toBe("14");
    expect(car("2027-03-01")?.getAttribute("cx")).toBe("306");
  });

  it("draws no gates for a season with no checkpoints", () => {
    const view = track("2026-11-05", { ...SEASON, checkpoints: [] });

    expect(view.container.querySelectorAll("line")).toHaveLength(0);
    expect(view.getByText("FINISH · FEB 1 · 91D")).toBeTruthy();
  });
});
