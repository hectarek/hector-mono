import { afterEach, describe, expect, it, mock } from "bun:test";
import { within } from "@testing-library/dom";
import { TEST_ACCOUNTS } from "@/src/infrastructure/services/mock-auth.service";
import { neonAuth } from "@/tests/_support/neon-auth";
import { NotFoundPage, Redirected } from "@/tests/_support/next";
import { renderOnServer } from "@/tests/_support/server-render";

// Neon's form, as a stand-in that shows what the page hands it. In a file of its own, so no
// other test gets it.
function NeonForm({ path, redirectTo }: { path: string; redirectTo?: string }) {
  return (
    <section
      aria-label="Neon's form"
      data-path={path}
      data-redirect-to={redirectTo}
    />
  );
}
mock.module("@neondatabase/auth/react", () => ({ AuthView: NeonForm }));
// Loaded after the mock, so the page takes the stand-in.
const { default: AuthPage } = await import("@/app/(auth)/auth/[path]/page");

// The page at /auth/<path>?<query>.
const authPage = (path: string, query: Record<string, string> = {}) =>
  AuthPage({
    params: Promise.resolve({ path }),
    searchParams: Promise.resolve(query),
  });

const neonForm = (page: HTMLElement) =>
  within(page).queryByRole("region", { name: "Neon's form" });

describe("the auth pages", () => {
  afterEach(() => {
    neonAuth.reset();
  });

  // A crafted sign-in link can't send someone off-site once they're in.
  it("hands Neon's form only a same-app path to go to after signing in", async () => {
    for (const [redirectTo, handed] of [
      ["https://evil.example", "/"],
      ["/agent", "/agent"],
    ] as const) {
      const page = await renderOnServer(
        await authPage("sign-in", { redirectTo }),
      );
      expect(neonForm(page)?.getAttribute("data-redirect-to")).toBe(handed);
    }
  });

  it("answers a path Neon has no form for with a 404", async () => {
    await expect(authPage("settings")).rejects.toBeInstanceOf(NotFoundPage);
  });

  it("sends someone already signed in on to where they were going, without the form", async () => {
    neonAuth.session = TEST_ACCOUNTS.owner;
    const thrown: unknown[] = [];
    const page = await renderOnServer(
      await authPage("sign-in", { redirectTo: "/agent" }),
      {
        onError: (err) => {
          thrown.push(err);
        },
      },
    );

    expect(thrown).toEqual([expect.any(Redirected)]);
    expect((thrown[0] as Redirected).url).toBe("/agent");
    expect(neonForm(page)).toBeNull();
  });

  it("still shows sign-out to someone signed in", async () => {
    neonAuth.session = TEST_ACCOUNTS.owner;
    const page = await renderOnServer(await authPage("sign-out"));

    expect(neonForm(page)?.getAttribute("data-path")).toBe("sign-out");
  });
});
