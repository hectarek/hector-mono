import { z } from "zod";

// The typed environment, checked when the server boots. Without DATABASE_URL the spike runs
// on an in-memory PGlite database seeded with fictional games, so it works with no Neon
// project; without the two Neon Auth values, sign-in is switched off.
export default {
  server: {
    DATABASE_URL: z.string().url().optional(),
    NEON_AUTH_BASE_URL: z.string().url().optional(),
    NEON_AUTH_COOKIE_SECRET: z.string().min(32).optional(),
  },
  client: {
    VITE_APP_NAME: z.string().min(1).default("Game Library"),
  },
};
