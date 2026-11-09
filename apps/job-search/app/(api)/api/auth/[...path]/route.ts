import { getInjection } from "@/di/container";
import { auth } from "@/lib/auth/server";
import { logger } from "@/lib/logger";
import {
  HumanOnlyError,
  NotAllowedError,
  UnauthenticatedError,
} from "@/src/entities/errors/common";
import { loggable } from "@/src/entities/errors/loggable";

const handler = auth.handler();
const log = logger.child({ layer: "route", op: "auth" });

type AuthRouteContext = { params: Promise<{ path: string[] }> };

// What any session may reach: reading itself and signing out. Everything else Neon offers a
// signed-in account (update-user, change-email and the rest) is Hector's alone, so Claude's
// session, or any account but his, stops here (docs/build-plan.md R21, KTD2).
const OPEN_TO_ANY_SESSION = new Set(["GET get-session", "POST sign-out"]);

// Neon's OAuth steps that authorize the MCP endpoint: open to Claude's session alone, so no
// other account, Hector's included, is ever authorized there (R21 as revised, KTD22).
const CLAUDE_ONLY = new Set([
  "POST oauth2/continue",
  "POST oauth2/consent",
  "GET oauth2/public-client",
]);

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

async function handle(
  method: "GET" | "POST",
  request: Request,
  context: AuthRouteContext,
): Promise<Response> {
  const params = await context.params;
  const path = params.path?.join("/");
  try {
    const step = `${method} ${path}`;
    const refusal = OPEN_TO_ANY_SESSION.has(step)
      ? null
      : CLAUDE_ONLY.has(step)
        ? await refusalUnlessClaude(path)
        : await refusalFor(path);
    if (refusal) {
      return refusal;
    }
    // Logged by status, path and error class or code, never Neon's body or an error's
    // message, which can quote an email (docs/build-plan.md KTD20).
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

// Hector's session goes on to Neon, and so does a request with no session (signing in,
// resetting a password), which Neon can't act on as anyone. A session that can't be read
// throws, so it's refused rather than taken as signed out.
async function refusalFor(path: string | undefined): Promise<Response | null> {
  try {
    const { actor } = await getInjection("IResolveActor")();
    return actor === "owner" ? null : refused(path, new HumanOnlyError());
  } catch (err) {
    if (err instanceof UnauthenticatedError) {
      return null;
    }
    if (err instanceof NotAllowedError) {
      return refused(path, err);
    }
    throw err;
  }
}

// The MCP endpoint's OAuth steps go on to Neon only from Claude's session. Hector's, a stranger's
// or none is refused, and a session that can't be read throws, as above.
async function refusalUnlessClaude(
  path: string | undefined,
): Promise<Response | null> {
  try {
    const { actor } = await getInjection("IResolveActor")();
    if (actor === "agent") {
      return null;
    }
  } catch (err) {
    if (
      !(err instanceof UnauthenticatedError || err instanceof NotAllowedError)
    ) {
      throw err;
    }
  }
  log.warn("Refused an OAuth step", { path, code: "not-allowed" });
  return Response.json(
    {
      code: "not-allowed",
      message: "Only Claude's account can allow access to the MCP endpoint.",
    },
    { status: 403 },
  );
}

// The codes server actions answer with (docs/build-plan.md KTD4). A stranger's message never
// says whose app this is.
function refused(
  path: string | undefined,
  err: HumanOnlyError | NotAllowedError,
): Response {
  const code = err instanceof HumanOnlyError ? "human-only" : "not-allowed";
  log.warn("Refused an account endpoint", { path, code });
  return Response.json({ code, message: err.message }, { status: 403 });
}
