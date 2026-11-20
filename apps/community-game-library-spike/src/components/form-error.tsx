import { useSubmissions } from "@solidjs/router";
import { Show } from "solid-js";

type FormAction = Parameters<typeof useSubmissions>[0];

// The latest submission's error, under the form; a new submission clears the old one.
export function FormError(props: { action: FormAction }) {
  const submissions = useSubmissions(props.action);
  const failure = () => submissions.at(-1)?.error as Error | undefined;
  return (
    <Show when={failure()}>
      {(error) => (
        <p class="error-line" role="alert">
          {error().message}
        </p>
      )}
    </Show>
  );
}
