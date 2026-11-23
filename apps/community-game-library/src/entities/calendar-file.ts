// A night's calendar file (KTD24, R35): one iCalendar event (RFC 5545) with the night's title, its
// times in UTC, and its place and address, made when it's downloaded. A night with no end has no
// DTEND, which calendars read as starting then. Nothing keeps it in sync: a night that changes is
// downloaded again, and the same UID lets a calendar know it's the same event.
import type { GameNight } from "./models/game-night.model";

const CRLF = "\r\n";

// "20261121T000000Z"
function utc(at: Date): string {
  return at
    .toISOString()
    .replace(/[-:]/g, "")
    .replace(/\.\d{3}/, "");
}

// Text as a property's value holds it: backslashes, semicolons, commas and line breaks escaped.
function escaped(text: string): string {
  return text
    .replace(/\\/g, "\\\\")
    .replace(/;/g, "\\;")
    .replace(/,/g, "\\,")
    .replace(/\r?\n/g, "\\n");
}

// A line folded at 75 octets, each continuation starting with a space, never inside a character
// (RFC 5545 §3.1).
function folded(line: string): string {
  const encoder = new TextEncoder();
  const parts: string[] = [];
  let part = "";
  let octets = 0;
  for (const char of line) {
    const size = encoder.encode(char).length;
    // The first line holds 75 octets; the ones after it 74, after their space.
    if (octets + size > (parts.length === 0 ? 75 : 74)) {
      parts.push(part);
      part = "";
      octets = 0;
    }
    part += char;
    octets += size;
  }
  parts.push(part);
  return parts.join(`${CRLF} `);
}

export function calendarFile(
  night: Pick<
    GameNight,
    "id" | "title" | "startsAt" | "endsAt" | "place" | "address" | "cancelledAt"
  >,
  // The night's page, and when the file is made.
  { url, now }: { url: string; now: Date },
): string {
  const location = [night.place, night.address].filter(Boolean).join(", ");
  const lines = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//Community Game Library//Game nights//EN",
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
    "BEGIN:VEVENT",
    `UID:${night.id}@communitygamelibrary.com`,
    `DTSTAMP:${utc(now)}`,
    `DTSTART:${utc(night.startsAt)}`,
    ...(night.endsAt ? [`DTEND:${utc(night.endsAt)}`] : []),
    `SUMMARY:${escaped(night.title)}`,
    ...(location ? [`LOCATION:${escaped(location)}`] : []),
    `DESCRIPTION:${escaped(url)}`,
    `URL:${url}`,
    `STATUS:${night.cancelledAt ? "CANCELLED" : "CONFIRMED"}`,
    "END:VEVENT",
    "END:VCALENDAR",
  ];
  return `${lines.map(folded).join(CRLF)}${CRLF}`;
}

// "bens-birthday-games.ics": the night's title as a file name, or "game-night.ics".
export function calendarFileName(title: string): string {
  const name = title
    .normalize("NFKD")
    .replace(/[̀-ͯ'’]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
  return `${name || "game-night"}.ics`;
}
