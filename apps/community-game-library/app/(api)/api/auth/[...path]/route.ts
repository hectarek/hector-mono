import { auth } from "@/lib/auth/server";
import { logger } from "@/lib/logger";
import { loggable } from "@/src/entities/errors/loggable";

const handler = auth.handler();
const log = logger.child({ layer: "route", op: "auth" });

type AuthRouteContext = { params: Promise<{ path: string[] }> };

export async function GET(
  request: Request,
  context: AuthRouteContext,
): Promise<Response> {
  return handle("GET", request, context);
}

export async function POST(
  request: Request,
  context: AuthRouteContext,
): Promise<Response> {
  return handle("POST", request, context);
}

// Neon Auth's endpoints, passed through. Logged by status, path and error class or code, never
// Neon's body or an error's message, which can quote an email (docs/build-plan.md KTD1).
async function handle(
  method: "GET" | "POST",
  request: Request,
  context: AuthRouteContext,
): Promise<Response> {
  const params = await context.params;
  const path = params.path?.join("/");
  try {
    const response = await handler[method](request, context);
    if (!response.ok) {
      log.error(`Auth ${method} error response`, {
        path,
        status: response.status,
      });
    }
    return response;
  } catch (err) {
    log.error(`Auth ${method} failed`, { path, ...loggable(err) });
    return new Response("Internal Server Error", { status: 500 });
  }
}
