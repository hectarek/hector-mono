import { describe, expect, it } from "bun:test";
import { calendarFile, calendarFileName } from "@/src/entities/calendar-file";

type CalendarNight = Parameters<typeof calendarFile>[0];

const NIGHT: CalendarNight = {
  id: "00000000-0000-4000-8000-000000000402",
  title: "Heavy games at mine",
  startsAt: new Date("2026-11-20T19:00:00-05:00"),
  endsAt: new Date("2026-11-20T22:30:00-05:00"),
  place: "Robin’s place",
  address: "9 Juniper Court",
  cancelledAt: null,
};
const PAGE = `https://communitygamelibrary.com/nights/${NIGHT.id}`;
const NOW = new Date("2026-11-10T14:30:00Z");
const file = (night: Partial<CalendarNight> = {}) =>
  calendarFile({ ...NIGHT, ...night }, { url: PAGE, now: NOW });
// The lines as a calendar reads them, each continuation joined back on.
const unfolded = (text: string) => text.replace(/\r\n /g, "").split("\r\n");
const lineOf = (text: string, name: string) =>
  unfolded(text).find((line) => line.startsWith(`${name}:`));

describe("a night's calendar file (KTD24, R35)", () => {
  it("writes one event with the night's title, its times in UTC, and its place and address", () => {
    expect(unfolded(file())).toEqual([
      "BEGIN:VCALENDAR",
      "VERSION:2.0",
      "PRODID:-//Community Game Library//Game nights//EN",
      "CALSCALE:GREGORIAN",
      "METHOD:PUBLISH",
      "BEGIN:VEVENT",
      `UID:${NIGHT.id}@communitygamelibrary.com`,
      "DTSTAMP:20261110T143000Z",
      "DTSTART:20261121T000000Z",
      "DTEND:20261121T033000Z",
      "SUMMARY:Heavy games at mine",
      "LOCATION:Robin’s place\\, 9 Juniper Court",
      `DESCRIPTION:${PAGE}`,
      `URL:${PAGE}`,
      "STATUS:CONFIRMED",
      "END:VEVENT",
      "END:VCALENDAR",
      "",
    ]);
  });

  it("ends every line with CRLF", () => {
    const text = file();
    expect(text.endsWith("\r\n")).toBe(true);
    expect(text.replace(/\r\n/g, "").includes("\n")).toBe(false);
  });

  it.each([
    ["Catan, pizza; more", "SUMMARY:Catan\\, pizza\\; more"],
    ["Back\\slash", "SUMMARY:Back\\\\slash"],
    ["Two\nlines", "SUMMARY:Two\\nlines"],
  ])("escapes %j in its text", (title, line) => {
    expect(lineOf(file({ title }), "SUMMARY")).toBe(line);
  });

  it("folds a line longer than 75 octets, never inside a character", () => {
    const title = "Über ".repeat(30).trim();
    const text = file({ title });
    const encoder = new TextEncoder();
    for (const line of text.split("\r\n")) {
      expect(encoder.encode(line).length).toBeLessThanOrEqual(75);
    }
    expect(text).toContain("\r\n ");
    expect(lineOf(text, "SUMMARY")).toBe(`SUMMARY:${title}`);
  });

  it("has no end for a night with none, and no location for a night with no place", () => {
    const text = file({ endsAt: null, place: "", address: null });
    expect(lineOf(text, "DTEND")).toBeUndefined();
    expect(lineOf(text, "LOCATION")).toBeUndefined();
  });

  it("says CANCELLED for a cancelled night", () => {
    expect(
      lineOf(file({ cancelledAt: new Date("2026-11-12T12:00:00Z") }), "STATUS"),
    ).toBe("STATUS:CANCELLED");
  });

  it.each([
    ["Heavy games at mine", "heavy-games-at-mine.ics"],
    ["Ben’s birthday games", "bens-birthday-games.ics"],
    ["Café night!", "cafe-night.ics"],
    ["!!!", "game-night.ics"],
  ])("names the file for %j", (title, name) => {
    expect(calendarFileName(title)).toBe(name);
  });
});
