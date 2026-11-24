import solid from "@solidjs/vite-plugin";
import tailwindcss from "@tailwindcss/vite";
import { defineConfig } from "vite";

// Plain Vite, no start mode: one page, no server. `vite build` writes static files to dist/.
// The plugin turns on Solid's dev-only diagnostics endpoint because the app declares
// @solidjs/diagnostics (AGENTS.md, "When something breaks").
export default defineConfig({
  plugins: [solid(), tailwindcss()],
  server: { port: 3103 },
});
