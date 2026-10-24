// What a log line may say about an error (docs/build-plan.md KTD20): its class, and the code a
// driver or the network gave it. Never its message: a failed query's message carries the SQL
// and its parameters, which hold names, notes and pay, and Postgres quotes a value it refuses.
export function loggable(err: unknown): {
  errorClass: string;
  errorCode?: string;
} {
  const errorClass = err instanceof Error ? classOf(err) : typeof err;
  const errorCode = codeIn(err);
  return errorCode ? { errorClass, errorCode } : { errorClass };
}

// The name an error gives itself, as the app's errors do (common.ts), since a production build
// renames classes; otherwise its class's name, which the build may have renamed.
function classOf(err: Error): string {
  return err.name !== "Error" ? err.name : err.constructor.name;
}

// A code is a short identifier (Postgres's "23505", a network's "ECONNRESET"), so nothing else
// rides along with one.
const CODE = /^[A-Za-z0-9_]{1,40}$/;

// The first code down the cause chain: Postgres's sits on the driver's error, which the query
// error and the app's own DatabaseOperationError wrap.
function codeIn(err: unknown, depth = 0): string | undefined {
  if (typeof err !== "object" || err === null || depth > 5) {
    return undefined;
  }
  const { code, cause } = err as { code?: unknown; cause?: unknown };
  if (typeof code === "string" && CODE.test(code)) {
    return code;
  }
  return codeIn(cause, depth + 1);
}
