// A stand-in for Neon Auth's server (`@/lib/auth/server`, swapped in by preload.ts), after
// job-search's. Its route handler answers every request and records it, and its getSession tells
// NeonAuthService who's signed in, so a test can make Neon fail and check what the app logs.

type AuthRouteContext = { params: Promise<{ path: string[] }> };
type NeonSession = { user: { id: string; name: string; email: string } };

const answerOk = async (): Promise<Response> => Response.json({});
const noSession = async (): Promise<{ data: NeonSession | null }> => ({
  data: null,
});

export const neonAuth = {
  // "GET get-session", "POST sign-in/email", …
  reached: [] as string[],
  // What Neon answers the auth route. A test that makes Neon fail swaps it, and calls reset()
  // after.
  answer: answerOk,
  // What Neon answers getSession. A test that makes it fail swaps it, and calls reset() after.
  getSession: noSession,
  reset() {
    neonAuth.reached = [];
    neonAuth.answer = answerOk;
    neonAuth.getSession = noSession;
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
  getSession: () => neonAuth.getSession(),
};
