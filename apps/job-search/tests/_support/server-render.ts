// Screen tests only (they run with tests/_support/dom.ts). Renders a tree of server
// components to HTML as the server streams it, waiting for every <Suspense> boundary (async
// components included), and puts the result in the page: the test then finds things in it
// by role and name, with Testing Library's `within`.
import type { ReactNode } from "react";
import { renderToReadableStream } from "react-dom/server";

export async function renderOnServer(tree: ReactNode): Promise<HTMLElement> {
  const stream = await renderToReadableStream(tree);
  await stream.allReady;
  const container = document.createElement("div");
  container.innerHTML = await Bun.readableStreamToText(stream);
  document.body.append(container);
  return container;
}
