import { Title } from "@solidjs/meta";
import { FormError } from "@/src/components/form-error";
import { signIn } from "@/src/lib/account";

// A8, cut down for the spike: email and password.
export default function SignIn() {
  return (
    <main class="page">
      <Title>Sign in · Game Library</Title>
      <h1 class="screen-title">Sign in</h1>
      <form class="panel auth-form" method="post" action={signIn}>
        <label class="field-label" for="email">
          Email
        </label>
        <input
          class="field"
          id="email"
          name="email"
          type="email"
          autocomplete="email"
          required
        />
        <label class="field-label" for="password">
          Password
        </label>
        <input
          class="field"
          id="password"
          name="password"
          type="password"
          autocomplete="current-password"
          required
        />
        <button class="button" type="submit">
          Sign in
        </button>
        <FormError action={signIn} />
      </form>
      <p class="empty">
        New here? <a href="/sign-up">Make an account</a>
      </p>
    </main>
  );
}
