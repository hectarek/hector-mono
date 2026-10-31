import { z } from "zod";

// Where a job came from (R5): a job board, a referral, a recruiter. One list of Hector's, which
// add_source adds to and jobs pick from.
export type LeadSource = { id: string; name: string };

// list_sources takes nothing.
export const listSourcesSchema = z.object({});

// add_source's input: the source's name as it should show, with runs of spaces made one.
export const addSourceSchema = z.object({
  name: z
    .string()
    .trim()
    .min(1, { error: "A source needs a name" })
    .max(80, { error: "At most 80 characters" })
    .transform((name) => name.replace(/\s+/g, " ")),
});
export type AddSourceInput = z.output<typeof addSourceSchema>;

// What add_source answers: the source with that name, and whether this call added it. A name
// already listed, in any case, is that source rather than a new one (U5).
export type AddedSource = { source: LeadSource; created: boolean };

// A name as sources compare: case and runs of spaces ignored.
export function sourceNameKey(name: string): string {
  return name.normalize("NFKC").toLowerCase().replace(/\s+/g, " ").trim();
}
