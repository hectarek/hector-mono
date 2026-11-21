import { describe, expect, it } from "bun:test";
import { toSearchTitle } from "@/src/entities/search-title";

describe("toSearchTitle", () => {
  it("drops a leading the, a or an, and lowers the case", () => {
    expect(toSearchTitle("The Castles of Burgundy")).toBe(
      "castles of burgundy",
    );
    expect(toSearchTitle("A Feast for Odin")).toBe("feast for odin");
    expect(toSearchTitle("An Infamous Traffic")).toBe("infamous traffic");
  });

  it("strips accents", () => {
    expect(toSearchTitle("Café International")).toBe("cafe international");
    expect(toSearchTitle("Crème Brûlée")).toBe("creme brulee");
  });

  it("turns punctuation into spaces and keeps every word", () => {
    expect(toSearchTitle("Ticket to Ride: Europe")).toBe(
      "ticket to ride europe",
    );
    expect(toSearchTitle("Gull & Anchor")).toBe("gull anchor");
    expect(toSearchTitle("Harbor Lights: Night Tide")).toBe(
      "harbor lights night tide",
    );
  });

  it("collapses runs of spaces and trims the ends", () => {
    expect(toSearchTitle("  Moss   &  Mortar ")).toBe("moss mortar");
  });

  it("keeps an article that isn't a leading word", () => {
    expect(toSearchTitle("Theseus")).toBe("theseus");
    expect(toSearchTitle("Anachrony")).toBe("anachrony");
    expect(toSearchTitle("Return of the Heroes")).toBe("return of the heroes");
    expect(toSearchTitle("The")).toBe("the");
  });

  it("normalizes what's typed the same way, so it meets the title", () => {
    expect(toSearchTitle("the castles of burgundy")).toBe(
      toSearchTitle("The Castles of Burgundy"),
    );
    expect(toSearchTitle("cafe international")).toBe(
      toSearchTitle("Café International"),
    );
  });
});
