import { getInjection } from "@/di/container";

// The MCP endpoint's discovery file (RFC 9728, docs/build-plan.md KTD22): it names this branch's
// Neon Auth issuer, where Claude Code signs in. Served unauthenticated, at the bare path and the
// path-inserted one (/.well-known/oauth-protected-resource/mcp), with CORS for browser clients.
const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
  "Access-Control-Allow-Headers": "*",
};

export function GET(request: Request): Response {
  return (
    getInjection("IMcpAuthService").discovery(request) ??
    new Response("Not found", { status: 404 })
  );
}

export function OPTIONS(): Response {
  return new Response(null, { status: 204, headers: CORS });
}
