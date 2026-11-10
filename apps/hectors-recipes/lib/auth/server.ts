import { createNeonAuth } from "@neondatabase/auth/next/server";

const baseUrl = process.env.NEON_AUTH_BASE_URL;
const cookieSecret = process.env.NEON_AUTH_COOKIE_SECRET;

if (!baseUrl || !cookieSecret) {
  throw new Error(
    "Missing required auth env vars: NEON_AUTH_BASE_URL, NEON_AUTH_COOKIE_SECRET",
  );
}

// How long the signed copy of the session (the session_data cookie) is trusted before the
// proxy checks with Neon Auth again: a day (docs/ux-plan.md D101). Sessions run 7 days from
// their last update and Better Auth updates one at most once a day, so a check within the day
// couldn't extend the session anyway. The SDK's 5 minutes was shorter than the usual gap
// between opens, which put the check, and a database wake, on almost every open. The cost: a
// session ended from elsewhere keeps working on this device for up to a day. The SDK never lets
// the copy outlive the session itself.
const SESSION_COPY_SECONDS = 24 * 60 * 60;

export const auth = createNeonAuth({
  baseUrl,
  cookies: {
    secret: cookieSecret,
    sessionDataTtl: SESSION_COPY_SECONDS,
  },
});
