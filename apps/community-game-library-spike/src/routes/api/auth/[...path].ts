// Neon Auth's endpoints under the app's own address, so its cookies are first-party: Neon's
// generic proxy, which also answers get-session from the signed session copy.
import { handleAuthProxyRequest } from "@neondatabase/auth/server";
import type { APIHandler } from "filesystem-routing/api";
import { authSettings } from "@/src/server/auth";

const proxy: APIHandler = (event) => {
  const settings = authSettings();
  if (!settings)
    return new Response("Sign-in is switched off", { status: 404 });
  return handleAuthProxyRequest({
    request: event.request,
    path: String(event.params?.path ?? ""),
    ...settings,
  });
};

export const GET = proxy;
export const POST = proxy;
