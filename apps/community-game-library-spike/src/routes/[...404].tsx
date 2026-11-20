import { Title } from "@solidjs/meta";
import type { RouteDefinition } from "@solidjs/router";
import { httpStatus } from "@solidjs/web";

export const route = {
  preload: () => httpStatus(404),
} satisfies RouteDefinition;

export default function NotFound() {
  return (
    <main class="page">
      <Title>Not found · Game Library</Title>
      <h1 class="screen-title">Not found</h1>
      <p class="empty">
        There's no page here. <a href="/">Back to the Library</a>
      </p>
    </main>
  );
}
