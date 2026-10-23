import { describe, expect, it } from "bun:test";
import type { IAuthenticationService } from "@/src/application/services/authentication.service.interface";
import type { ILoggerService } from "@/src/application/services/logger.service.interface";
import {
  type AllowedUserIds,
  resolveActor,
} from "@/src/application/use-cases/access/resolve-actor";
import {
  NotAllowedError,
  UnauthenticatedError,
} from "@/src/entities/errors/common";
import type { Session } from "@/src/entities/models/session.model";

const OWNER = "00000000-0000-4000-8000-000000000001";
const AGENT = "00000000-0000-4000-8000-000000000002";
const STRANGER = "00000000-0000-4000-8000-000000000003";
const PINNED: AllowedUserIds = { ownerUserId: OWNER, agentUserId: AGENT };

const session = (id: string, email = "someone@example.com"): Session => ({
  user: { id, name: "Someone", email },
});

// An auth service whose session a test switches; null is signed out.
function authService(current: Session | null = null) {
  const auth: IAuthenticationService & { current: Session | null } = {
    current,
    getSession: async () => auth.current,
  };
  return auth;
}

// Keeps what's logged at error level, so a test can count it.
class RecordingLogger implements ILoggerService {
  readonly errors: string[] = [];
  debug(): void {}
  info(): void {}
  warn(): void {}
  error(message: string): void {
    this.errors.push(message);
  }
  child(): ILoggerService {
    return this;
  }
}

const resolve = (current: Session | null) =>
  resolveActor(authService(current), PINNED, new RecordingLogger())();

describe("resolveActor", () => {
  it("lets the owner's session act as the owner, on its own rows", async () => {
    expect(await resolve(session(OWNER))).toEqual({
      actor: "owner",
      ownerId: OWNER,
    });
  });

  it("lets the agent's session act as the agent, on the owner's rows", async () => {
    expect(await resolve(session(AGENT))).toEqual({
      actor: "agent",
      ownerId: OWNER,
    });
  });

  it("refuses any other account", async () => {
    await expect(resolve(session(STRANGER))).rejects.toBeInstanceOf(
      NotAllowedError,
    );
  });

  // Whoever registered an allowed email first would otherwise get its identity.
  it("goes by id, never email: the owner's email on another account is refused", async () => {
    const ownersEmail = "owner@example.com";
    expect(await resolve(session(OWNER, ownersEmail))).toMatchObject({
      actor: "owner",
    });
    await expect(
      resolve(session(STRANGER, ownersEmail)),
    ).rejects.toBeInstanceOf(NotAllowedError);
  });

  it("answers no session with UnauthenticatedError", async () => {
    await expect(resolve(null)).rejects.toBeInstanceOf(UnauthenticatedError);
  });

  it.each([
    { problem: "missing", ids: { agentUserId: AGENT } },
    {
      problem: "not a user id (an email in its place)",
      ids: { ownerUserId: "owner@example.com", agentUserId: AGENT },
    },
  ])(
    "when the owner's id is $problem, refuses every session, with one error logged",
    async ({ ids }: { ids: AllowedUserIds }) => {
      const auth = authService();
      const logger = new RecordingLogger();
      const resolveForAuth = resolveActor(auth, ids, logger);
      for (const id of [OWNER, AGENT, STRANGER]) {
        auth.current = session(id);
        await expect(resolveForAuth()).rejects.toBeInstanceOf(NotAllowedError);
      }
      expect(logger.errors).toHaveLength(1);
    },
  );
});
