// Runs before every test file (bunfig.toml [test].preload).
import { mock } from "bun:test";
import * as nextServer from "next/server";
import { testDb } from "@/tests/_support/database";
import { fakeNeonAuth } from "@/tests/_support/neon-auth";
import { NotFoundPage, nextState, Redirected } from "@/tests/_support/next";

// Bun loads .env for tests too, and .env holds the test project's values. Drop them, and the
// app's account settings, so no test can reach the test project's database, auth or storage,
// and so tests behave the same with or without a .env. LOG_LEVEL stays.
for (const key of [
  "DATABASE_URL",
  "NEON_AUTH_BASE_URL",
  "NEON_AUTH_COOKIE_SECRET",
  "ADMIN_USER_ID",
  "STORAGE_AWS_ENDPOINT_URL_S3",
  "STORAGE_AWS_REGION",
  "STORAGE_AWS_ACCESS_KEY_ID",
  "STORAGE_AWS_SECRET_ACCESS_KEY",
  // Storage's names without STORAGE_, as production has them, in case a shell sets them.
  "AWS_ENDPOINT_URL_S3",
  "AWS_REGION",
  "AWS_ACCESS_KEY_ID",
  "AWS_SECRET_ACCESS_KEY",
  "CRON_SECRET",
]) {
  delete process.env[key];
}

// Real repositories (only the database tests use them) talk to PGlite, never Neon.
mock.module("@/db", () => ({ db: testDb }));

// The real module throws at import without those variables. Tests use MockAuthService, and the
// auth route reaches the stand-in's handler instead of Neon.
mock.module("@/lib/auth/server", () => ({ auth: fakeNeonAuth }));

// Outside Next.js there's no request to wait for: a page's connection() goes on at once. The
// rest of the module is the real one, which the proxy uses.
mock.module("next/server", () => ({
  ...nextServer,
  connection: async () => {},
}));

mock.module("next/cache", () => ({
  revalidatePath: (path: string) => {
    nextState.revalidated.push(path);
  },
  // Only the browser keeps what a page's private cache returns; a test reads afresh.
  cacheLife: () => {},
}));

// For the screen tests: a router that records where it was sent. One object, as Next's
// router is stable: effects that depend on it would otherwise run on every render.
const router = {
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
  get bfcacheId() {
    return nextState.visit;
  },
};
const searchParams = new URLSearchParams();

mock.module("next/navigation", () => ({
  redirect: (url: string): never => {
    throw new Redirected(url);
  },
  notFound: (): never => {
    throw new NotFoundPage();
  },
  useRouter: () => router,
  usePathname: () => "/",
  useSearchParams: () => searchParams,
}));

mock.module("@/app/_lib/current-user", () => ({
  getCurrentUser: async () =>
    nextState.userId
      ? {
          id: nextState.userId,
          name: "Test User",
          email: "test@example.com",
          image: nextState.userImage,
        }
      : undefined,
  getCurrentUserId: async () => nextState.userId,
}));
