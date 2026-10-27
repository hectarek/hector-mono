import { z } from "zod";

// What inputs share: times, dates, text and links, read the same way by every schema.

// Times come with their offset (docs/build-plan.md KTD18): "2026-10-23T09:00:00-04:00", or "Z" for
// UTC. Read as the instant they name.
export const timeSchema = z.iso
  .datetime({
    offset: true,
    error: "Use an ISO time with an offset, like 2026-10-23T09:00:00-04:00",
  })
  .transform((value) => new Date(value));

// Dates are "YYYY-MM-DD", in Eastern time (KTD18).
export const dateSchema = z.iso.date({ error: "Use a date like 2026-10-26" });

// Text that may be left out: trimmed and at most `max` characters, with blank or null clearing it.
export const optionalText = (max: number) =>
  z
    .string()
    .trim()
    .max(max, { error: `At most ${max} characters` })
    .transform((value) => value || null)
    .nullable();

// Text that must be given: trimmed, and from 1 to `max` characters.
export const requiredText = (max: number, missing: string) =>
  z
    .string()
    .trim()
    .min(1, { error: missing })
    .max(max, { error: `At most ${max} characters` });

// A web link: http or https only, so a link never runs script (KTD8, KTD21).
export const httpLink = (max: number) =>
  z
    .url({
      protocol: /^https?$/,
      hostname: z.regexes.domain,
      error: "Use an http or https link, like https://example.com",
    })
    .max(max, { error: `At most ${max} characters` });
