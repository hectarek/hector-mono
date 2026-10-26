import { z } from "zod";

// Times come with their offset (docs/build-plan.md KTD18): "2026-10-23T09:00:00-04:00", or "Z" for
// UTC. Read as the instant they name.
export const timeSchema = z.iso
  .datetime({
    offset: true,
    error: "Use an ISO time with an offset, like 2026-10-23T09:00:00-04:00",
  })
  .transform((value) => new Date(value));
