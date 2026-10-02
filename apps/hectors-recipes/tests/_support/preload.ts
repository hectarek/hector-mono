// Runs before every test file (bunfig.toml [test].preload).
import { mock } from "bun:test";
import { testDb } from "@/tests/_support/database";
import { NotFoundPage, nextState, Redirected } from "@/tests/_support/next";

// Bun loads .env for tests too. Drop the real credentials so no test can reach the
// live database, auth service, Ably or the AI Gateway, and so tests behave the same with or
// without a .env.
for (const key of [
  "DATABASE_URL",
  "NEON_AUTH_BASE_URL",
  "NEON_AUTH_COOKIE_SECRET",
  "ABLY_API_KEY",
  "AI_GATEWAY_API_KEY",
  "VERCEL_OIDC_TOKEN",
]) {
  delete process.env[key];
}

// Real repositories (only the database tests use them) talk to PGlite, never Neon.
mock.module("@/db", () => ({ db: testDb }));

// The real module throws at import without those variables; tests use MockAuthService.
mock.module("@/lib/auth/server", () => ({ auth: {} }));

mock.module("next/cache", () => ({
  revalidatePath: (path: string) => {
    nextState.revalidated.push(path);
  },
}));

mock.module("next/navigation", () => ({
  redirect: (url: string): never => {
    throw new Redirected(url);
  },
  notFound: (): never => {
    throw new NotFoundPage();
  },
  // For the screen tests: a router that records where it was sent.
  useRouter: () => ({
    push: (url: string) => {
      nextState.pushed.push(url);
    },
    replace: (url: string) => {
      nextState.pushed.push(url);
    },
    back: () => {},
    forward: () => {},
    refresh: () => {},
    prefetch: () => {},
  }),
  usePathname: () => "/",
  useSearchParams: () => new URLSearchParams(),
}));

mock.module("@/app/_lib/current-user", () => ({
  getCurrentUserId: async () => nextState.userId,
}));
