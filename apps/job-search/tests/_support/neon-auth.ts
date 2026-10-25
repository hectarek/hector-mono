// A stand-in for Neon Auth's server (`@/lib/auth/server`, swapped in by preload.ts). Its
// route handler answers every request and records it, so a test can tell what the app's
// auth route let through to Neon. Its getSession tells the auth page who's signed in.
import type { Session } from "@/src/entities/models/session.model";

type AuthRouteContext = { params: Promise<{ path: string[] }> };

const answerOk = async (): Promise<Response> => Response.json({});

export const neonAuth = {
  // "GET get-session", "POST update-user", …
  reached: [] as string[],
  // What Neon answers. A test that makes Neon fail swaps it, and calls reset() after.
  answer: answerOk,
  // Who's signed in, as getSession tells the auth page (null: no one). A test that signs
  // someone in calls reset() after.
  session: null as Session | null,
  reset() {
    neonAuth.reached = [];
    neonAuth.answer = answerOk;
    neonAuth.session = null;
  },
};

async function handle(
  request: Request,
  { params }: AuthRouteContext,
): Promise<Response> {
  neonAuth.reached.push(`${request.method} ${(await params).path.join("/")}`);
  return neonAuth.answer();
}

export const fakeNeonAuth = {
  handler: () => ({ GET: handle, POST: handle }),
  getSession: async () => ({ data: neonAuth.session, error: null }),
};
