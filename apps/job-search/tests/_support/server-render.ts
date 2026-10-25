// Screen tests only (they run with tests/_support/dom.ts). Renders a tree of server
// components to HTML as the server streams it, waiting for every <Suspense> boundary (async
// components included), and puts the result in the page: the test then finds things in it
// by role and name, with Testing Library's `within`. What a component throws inside
// <Suspense> leaves that boundary's fallback in the page and is logged, or goes to `onError`
// when a test passes one: that's how a test sees a redirect() there (Next turns it into one
// the browser follows).
import type { ReactNode } from "react";
import { renderToReadableStream } from "react-dom/server";

export async function renderOnServer(
  tree: ReactNode,
  { onError }: { onError?: (error: unknown) => void } = {},
): Promise<HTMLElement> {
  const stream = await renderToReadableStream(tree, { onError });
  await stream.allReady;
  const container = document.createElement("div");
  container.innerHTML = await Bun.readableStreamToText(stream);
  document.body.append(container);
  return container;
}
