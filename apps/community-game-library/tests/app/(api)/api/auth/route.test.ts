import { afterEach, beforeEach, describe, expect, it, spyOn } from "bun:test";
import { GET, POST } from "@/app/(api)/api/auth/[...path]/route";
import { ConsoleLoggerService } from "@/src/infrastructure/services/console-logger.service";
import { neonAuth } from "@/tests/_support/neon-auth";

// A browser's call to Neon's auth endpoints, through the app's route.
const call = (method: "GET" | "POST", path: string) => {
  const request = new Request(`https://library.example/api/auth/${path}`, {
    method,
  });
  const context = { params: Promise.resolve({ path: path.split("/") }) };
  return method === "GET" ? GET(request, context) : POST(request, context);
};

describe("the auth route", () => {
  afterEach(() => {
    neonAuth.reset();
  });

  it("passes each call through to Neon, and Neon's answer back", async () => {
    expect((await call("GET", "get-session")).status).toBe(200);
    expect((await call("POST", "sign-in/email")).status).toBe(200);
    expect(neonAuth.reached).toEqual(["GET get-session", "POST sign-in/email"]);
  });
});

// Logs carry status, path and error class or code, never what Neon or an error says: a sign-in
// failure's body or message can quote the email (docs/build-plan.md KTD1).
describe("what the auth route logs", () => {
  const EMAIL = "alice@example.com";
  let errorLog: ReturnType<typeof spyOn>;

  beforeEach(() => {
    errorLog = spyOn(ConsoleLoggerService.prototype, "error").mockReturnValue();
  });

  afterEach(() => {
    errorLog.mockRestore();
    neonAuth.reset();
  });

  it("logs Neon's failed answer by status and path, never its body", async () => {
    neonAuth.answer = async () =>
      Response.json(
        { code: "INVALID_EMAIL_OR_PASSWORD", message: `No account: ${EMAIL}` },
        { status: 401 },
      );

    expect((await call("POST", "sign-in/email")).status).toBe(401);
    expect(errorLog).toHaveBeenCalledWith("Auth POST error response", {
      path: "sign-in/email",
      status: 401,
    });
    expect(JSON.stringify(errorLog.mock.calls)).not.toContain(EMAIL);
  });

  it("logs a failure by class and code, never its message, and answers 500", async () => {
    neonAuth.answer = async () => {
      throw Object.assign(new Error(`Couldn't reach Neon for ${EMAIL}`), {
        code: "ECONNREFUSED",
      });
    };

    expect((await call("GET", "get-session")).status).toBe(500);
    expect(errorLog).toHaveBeenCalledWith("Auth GET failed", {
      path: "get-session",
      errorClass: "Error",
      errorCode: "ECONNREFUSED",
    });
    expect(JSON.stringify(errorLog.mock.calls)).not.toContain(EMAIL);
  });
});
