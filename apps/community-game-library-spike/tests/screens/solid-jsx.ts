import { transform } from "@solidjs/compiler";
import { plugin } from "bun";

// Bun compiles JSX for React's runtime, which Solid doesn't have, so screen tests under
// bun:test run each .tsx file through Solid's own compiler first; Bun then strips the types.
plugin({
  name: "solid-jsx",
  setup(build) {
    build.onLoad({ filter: /\.tsx$/ }, async ({ path }) => {
      const source = await Bun.file(path).text();
      const { code } = transform(source, {
        filename: path,
        generate: "dom",
        dev: true,
      });
      return { contents: code, loader: "ts" };
    });
  },
});
