import { Title } from "@solidjs/meta";
import { useSearchParams } from "@solidjs/router";
import { FormError } from "@/src/components/form-error";
import { verifyEmail } from "@/src/lib/account";

// The code step after making an account (KTD3).
export default function Verify() {
  const [search] = useSearchParams();
  const email = () => (typeof search.email === "string" ? search.email : "");
  return (
    <main class="page">
      <Title>Check your email · Game Library</Title>
      <h1 class="screen-title">Check your email</h1>
      <form class="panel auth-form" method="post" action={verifyEmail}>
        <p class="body">
          We sent a code to {email()}. It's good for a few minutes.
        </p>
        <input type="hidden" name="email" value={email()} />
        <label class="field-label" for="code">
          Code
        </label>
        <input
          class="field"
          id="code"
          name="code"
          inputmode="numeric"
          autocomplete="one-time-code"
          required
        />
        <button class="button" type="submit">
          Check the code
        </button>
        <FormError action={verifyEmail} />
      </form>
    </main>
  );
}
