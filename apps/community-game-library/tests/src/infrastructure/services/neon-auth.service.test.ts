import { afterEach, describe, expect, it } from "bun:test";
import { NeonAuthService } from "@/src/infrastructure/services/neon-auth.service";
import { RecordingLogger } from "@/tests/_support/logger";
import { neonAuth } from "@/tests/_support/neon-auth";

const EMAIL = "alice@example.com";
const ALICE = "00000000-0000-4000-8000-0000000000a1";

describe("NeonAuthService", () => {
  afterEach(() => {
    neonAuth.reset();
  });

  it("answers the signed-in member", async () => {
    neonAuth.getSession = async () => ({
      data: { user: { id: ALICE, name: "Alice", email: EMAIL } },
    });
    expect(
      await new NeonAuthService(new RecordingLogger()).getSession(),
    ).toEqual({
      user: { id: ALICE, name: "Alice", email: EMAIL, image: null },
    });
  });

  // Google's picture, which A4 starts the photo from (Hector, 2026-11-24).
  it("answers the picture a Google sign-in came with", async () => {
    const picture = "https://lh3.googleusercontent.com/a/alice-picture=s96-c";
    neonAuth.getSession = async () => ({
      data: {
        user: { id: ALICE, name: "Alice", email: EMAIL, image: picture },
      },
    });
    expect(
      (await new NeonAuthService(new RecordingLogger()).getSession())?.user
        .image,
    ).toBe(picture);
  });

  it("answers null when no one is signed in", async () => {
    expect(
      await new NeonAuthService(new RecordingLogger()).getSession(),
    ).toBeNull();
  });

  // As recipes' copy: a session that can't be read reads as signed out, and the proxy has sent
  // a signed-out visitor to the welcome screen already.
  it("logs a failed read by class and code, never the error's message, and answers null", async () => {
    neonAuth.getSession = async () => {
      throw Object.assign(new Error(`No session for ${EMAIL}`), {
        code: "ECONNRESET",
      });
    };
    const logger = new RecordingLogger();

    expect(await new NeonAuthService(logger).getSession()).toBeNull();
    expect(logger.text).not.toContain(EMAIL);
    expect(logger.lines).toContainEqual({
      level: "error",
      message: "Failed to get session",
      context: {
        layer: "service",
        op: "auth",
        errorClass: "Error",
        errorCode: "ECONNRESET",
      },
    });
  });
});
