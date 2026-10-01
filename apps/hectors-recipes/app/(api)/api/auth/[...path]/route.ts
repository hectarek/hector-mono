import { auth } from "@/lib/auth/server";
import { logger } from "@/lib/logger";

const handler = auth.handler();
const log = logger.child({ layer: "route", op: "auth" });

export async function GET(
  request: Request,
  context: { params: Promise<{ path: string[] }> },
): Promise<Response> {
  const params = await context.params;
  const path = params.path?.join("/");
  try {
    const response = await handler.GET(request, context);
    if (!response.ok) {
      const body = await response.clone().text();
      log.error("Auth GET error response", {
        path,
        status: response.status,
        body,
      });
    }
    return response;
  } catch (err) {
    log.error("Auth GET handler threw", {
      path,
      error: err instanceof Error ? err.message : String(err),
    });
    return new Response("Internal Server Error", { status: 500 });
  }
}

export async function POST(
  request: Request,
  context: { params: Promise<{ path: string[] }> },
): Promise<Response> {
  const params = await context.params;
  const path = params.path?.join("/");
  try {
    const response = await handler.POST(request, context);
    if (!response.ok) {
      const body = await response.clone().text();
      log.error("Auth POST error response", {
        path,
        status: response.status,
        body,
      });
    }
    return response;
  } catch (err) {
    log.error("Auth POST handler threw", {
      path,
      error: err instanceof Error ? err.message : String(err),
    });
    return new Response("Internal Server Error", { status: 500 });
  }
}
