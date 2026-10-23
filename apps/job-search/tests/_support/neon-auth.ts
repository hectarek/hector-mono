// A stand-in for Neon Auth's server (`@/lib/auth/server`, swapped in by preload.ts). Its
// route handler answers every request and records it, so a test can tell what the app's
// auth route let through to Neon.
type AuthRouteContext = { params: Promise<{ path: string[] }> };

export const neonAuth = {
  // "GET get-session", "POST update-user", …
  reached: [] as string[],
};

async function handle(
  request: Request,
  { params }: AuthRouteContext,
): Promise<Response> {
  neonAuth.reached.push(`${request.method} ${(await params).path.join("/")}`);
  return Response.json({});
}

export const fakeNeonAuth = {
  handler: () => ({ GET: handle, POST: handle }),
};
