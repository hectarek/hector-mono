import "server-only";
import { env } from "virtual:solid-env/server";
import {
  createAuthServer,
  extractNeonAuthCookies,
} from "@neondatabase/auth/server";
import {
  getRequestEvent,
  type RequestEvent,
  type ResponseStub,
  serializeCookie,
} from "@solidjs/web";

// KTD2: the signed copy of the session is trusted for a day before Neon Auth is asked again.
const SESSION_COPY_SECONDS = 24 * 60 * 60;

export interface AuthSettings {
  baseUrl: string;
  cookieSecret: string;
  sessionDataTtl: number;
  sameSite: "lax";
}

// Null when the two Neon Auth values aren't set, which switches sign-in off.
export function authSettings(): AuthSettings | null {
  if (!env.NEON_AUTH_BASE_URL || !env.NEON_AUTH_COOKIE_SECRET) return null;
  return {
    baseUrl: env.NEON_AUTH_BASE_URL,
    cookieSecret: env.NEON_AUTH_COOKIE_SECRET,
    sessionDataTtl: SESSION_COPY_SECONDS,
    sameSite: "lax",
  };
}

type AuthServer = ReturnType<typeof createAuthServer>;
let auth: AuthServer | undefined;

function requestEvent(): RequestEvent & { response: ResponseStub } {
  const event = getRequestEvent();
  if (!event) throw new Error("Neon Auth was called outside a request");
  return event as RequestEvent & { response: ResponseStub };
}

// Neon's framework-free server toolkit, reading and writing cookies through Solid's request
// event: the adapter its RequestContext interface asks each framework for.
export function getAuth(): AuthServer | null {
  const settings = authSettings();
  if (!settings) return null;
  auth ??= createAuthServer({
    ...settings,
    context: () => {
      const event = requestEvent();
      return {
        getCookies: () => extractNeonAuthCookies(event.request.headers),
        setCookie: (name, value, options) => {
          event.response.headers.append(
            "set-cookie",
            serializeCookie(name, value, options),
          );
        },
        getHeader: (name) => event.request.headers.get(name),
        getOrigin: () =>
          event.request.headers.get("origin") ??
          new URL(event.request.url).origin,
        getFramework: () => "solid-start-mode",
      };
    },
  });
  return auth;
}
