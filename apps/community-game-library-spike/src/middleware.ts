// The server middleware chain (start.middleware in vite.config.ts): every page render, server
// function call and API route passes through it, inside the request event.

import routes from "virtual:file-routes";
import { processAuthMiddleware } from "@neondatabase/auth/server";
import type { StartMiddleware } from "@solidjs/vite-plugin";
import { createAPIHandler } from "filesystem-routing/api";
import { authSettings } from "@/src/server/auth";

const SIGNED_IN_ONLY = ["/account"];

// Neon's generic middleware decides; this turns its decision into a response, as recipes'
// proxy does for Next.js.
const requireSignIn: StartMiddleware = async (event, next) => {
  const { pathname } = new URL(event.request.url);
  const settings = authSettings();
  const guarded = SIGNED_IN_ONLY.some(
    (path) => pathname === path || pathname.startsWith(`${path}/`),
  );
  if (!settings || !guarded) return next();

  const decision = await processAuthMiddleware({
    request: event.request,
    pathname,
    skipRoutes: [],
    loginUrl: "/sign-in",
    ...settings,
  });
  if (decision.action === "allow") {
    const response = await next();
    for (const cookie of decision.cookies ?? [])
      response.headers.append("set-cookie", cookie);
    return response;
  }
  const headers = new Headers({ location: decision.redirectUrl.toString() });
  for (const cookie of decision.cookies ?? [])
    headers.append("set-cookie", cookie);
  return new Response(null, { status: 302, headers });
};

export default [
  requireSignIn,
  createAPIHandler(routes),
] satisfies StartMiddleware[];
