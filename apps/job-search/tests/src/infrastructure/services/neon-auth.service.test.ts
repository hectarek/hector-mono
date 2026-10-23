import { describe, expect, it } from "bun:test";
import { MockLoggerService } from "@/src/infrastructure/services/mock-logger.service";
import {
  NeonAuthService,
  type NeonSessionReader,
} from "@/src/infrastructure/services/neon-auth.service";

// A stand-in for Neon Auth's server client: getSession answers with what the test gives it.
const answering = (
  answer: Awaited<ReturnType<NeonSessionReader["getSession"]>>,
): NeonSessionReader => ({ getSession: async () => answer });

const sessionFrom = (client: NeonSessionReader) =>
  new NeonAuthService(new MockLoggerService(), client).getSession();

describe("NeonAuthService", () => {
  it("gives the signed-in user's id, name and email", async () => {
    const user = {
      id: "00000000-0000-4000-8000-000000000001",
      name: "Someone",
      email: "someone@example.com",
    };
    expect(
      await sessionFrom(answering({ data: { user }, error: null })),
    ).toEqual({ user });
  });

  it("is null when no one is signed in", async () => {
    expect(
      await sessionFrom(answering({ data: null, error: null })),
    ).toBeNull();
  });

  // Taken as signed out, a failure would let a request through that only a check on the
  // session stops (the auth route forwards signed-out requests to Neon).
  it("throws when Neon can't say whose session it is, rather than calling it signed out", async () => {
    await expect(
      sessionFrom(
        answering({ data: null, error: { status: 502, code: "FETCH_FAILED" } }),
      ),
    ).rejects.toThrow("Couldn't read the session");
  });
});
