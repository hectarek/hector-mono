import { Title } from "@solidjs/meta";
import type { RouteDefinition } from "@solidjs/router";
import { createMemo, Show } from "solid-js";
import { getAccount, signOut } from "@/src/lib/account";

export const route = {
  preload: () => {
    void getAccount();
  },
} satisfies RouteDefinition;

// E5, cut down for the spike. The middleware sends anyone signed out to /sign-in first.
export default function Account() {
  const account = createMemo(() => getAccount());
  return (
    <main class="page">
      <Title>You · Game Library</Title>
      <h1 class="screen-title">You</h1>
      <Show
        when={account()}
        fallback={
          <p class="empty">
            You're not signed in. <a href="/sign-in">Sign in</a>
          </p>
        }
      >
        {(me) => (
          <section class="panel" aria-label="Your account">
            <span class="name">{me().name}</span>
            <span class="fact">{me().email}</span>
            <form method="post" action={signOut}>
              <button class="button quiet" type="submit">
                Sign out
              </button>
            </form>
          </section>
        )}
      </Show>
    </main>
  );
}
