import { Title } from "@solidjs/meta";
import { FormError } from "@/src/components/form-error";
import { signUp } from "@/src/lib/account";

// A2, cut down for the spike: email and password, then a code by email.
export default function SignUp() {
  return (
    <main class="page">
      <Title>Make an account · Game Library</Title>
      <h1 class="screen-title">Make an account</h1>
      <form class="panel auth-form" method="post" action={signUp}>
        <label class="field-label" for="name">
          Your name
        </label>
        <input
          class="field"
          id="name"
          name="name"
          autocomplete="name"
          required
        />
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
          autocomplete="new-password"
          minlength="8"
          required
        />
        <button class="button" type="submit">
          Make my account
        </button>
        <FormError action={signUp} />
      </form>
      <p class="empty">
        Have an account? <a href="/sign-in">Sign in</a>
      </p>
    </main>
  );
}
