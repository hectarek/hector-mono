// Runs before every test file (bunfig.toml [test].preload).
import { mock } from "bun:test";
import { unstable_isUnrecognizedActionError } from "next/dist/client/components/unrecognized-action-error";
import { testDb } from "@/tests/_support/database";
import { fakeNeonAuth } from "@/tests/_support/neon-auth";
import { NotFoundPage, nextState, Redirected } from "@/tests/_support/next";

// Bun loads .env for tests too. Drop the app's credentials and account settings so no test
// can reach the test project's database, auth or Google, and so tests behave the same with
// or without a .env.
for (const key of [
  "DATABASE_URL",
  "NEON_AUTH_BASE_URL",
  "NEON_AUTH_COOKIE_SECRET",
  "OWNER_USER_ID",
  "AGENT_USER_ID",
  "GOOGLE_OAUTH_CLIENT_ID",
  "GOOGLE_OAUTH_CLIENT_SECRET",
  "GOOGLE_CALENDAR_ACCOUNT_EMAIL",
  "CALENDAR_TOKEN_KEY",
]) {
  delete process.env[key];
}

// The real repositories and transaction manager (the database tests use them) talk to PGlite,
// never Neon.
mock.module("@/db", () => ({ db: testDb }));

// The real module throws at import without those variables, and would reach Neon. Tests read
// the session through MockAuthService, except the auth page, which reads it from this stand-in's
// getSession (set neonAuth.session); the auth route forwards to the stand-in too.
mock.module("@/lib/auth/server", () => ({ auth: fakeNeonAuth }));

mock.module("next/navigation", () => ({
  redirect: (url: string): never => {
    throw new Redirected(url);
  },
  notFound: (): never => {
    throw new NotFoundPage();
  },
  // A screen's router: where it was told to go, for the test to read.
  useRouter: () => ({
    push: (href: string) => {
      nextState.pushed.push(href);
    },
    refresh: () => {
      nextState.refreshed += 1;
    },
  }),
  // The real check: the page tools' wrapper (app/_lib/call-action.ts) tells by it that a deploy
  // removed an action.
  unstable_isUnrecognizedActionError,
}));

// Outside Next.js there's no page to refresh: tests read the paths an action revalidated.
mock.module("next/cache", () => ({
  revalidatePath: (path: string) => {
    nextState.revalidated.push(path);
  },
}));

// next/font only works inside Next's compiler; the root layout calls it at import.
const geist = () => ({ variable: "font-geist", className: "font-geist" });
mock.module("next/font/google", () => ({ Geist: geist }));
