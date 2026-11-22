import { describe, expect, it } from "bun:test";
import {
  type AdminAccount,
  requireAdmin,
} from "@/src/application/use-cases/admin/require-admin";
import { UnauthorizedError } from "@/src/entities/errors/common";
import { RecordingLogger } from "@/tests/_support/logger";

const ADMIN = "00000000-0000-4000-8000-000000000001";
const MEMBER = "00000000-0000-4000-8000-000000000002";

const refuses = (admin: AdminAccount, userId: string) => () =>
  requireAdmin(admin, new RecordingLogger())(userId);

describe("requireAdmin", () => {
  it("lets the account whose id is ADMIN_USER_ID through", () => {
    expect(
      requireAdmin({ adminUserId: ADMIN }, new RecordingLogger())(ADMIN),
    ).toBeUndefined();
  });

  it("refuses any other member", () => {
    expect(refuses({ adminUserId: ADMIN }, MEMBER)).toThrow(UnauthorizedError);
  });

  it("makes nobody the admin when ADMIN_USER_ID is missing", () => {
    for (const admin of [{}, { adminUserId: "" }]) {
      expect(refuses(admin, ADMIN)).toThrow(UnauthorizedError);
      expect(refuses(admin, MEMBER)).toThrow(UnauthorizedError);
    }
  });

  // Not a user id, so it can't be anyone's, even a session's that somehow carries it.
  it("makes nobody the admin when ADMIN_USER_ID is malformed", () => {
    for (const adminUserId of ["admin", `${ADMIN} `, ADMIN.slice(1)]) {
      expect(refuses({ adminUserId }, adminUserId)).toThrow(UnauthorizedError);
      expect(refuses({ adminUserId }, ADMIN)).toThrow(UnauthorizedError);
    }
  });

  it("logs a missing id once, on the first refusal, never on a member's", () => {
    const logger = new RecordingLogger();
    const check = requireAdmin({}, logger);
    expect(logger.lines).toEqual([]);

    expect(() => check(MEMBER)).toThrow(UnauthorizedError);
    expect(() => check(ADMIN)).toThrow(UnauthorizedError);
    expect(logger.lines).toEqual([
      {
        level: "warn",
        message:
          "ADMIN_USER_ID is missing or isn't a user id: nobody is the admin",
        context: { layer: "use-case", op: "requireAdmin" },
      },
    ]);

    const configured = new RecordingLogger();
    expect(() =>
      requireAdmin({ adminUserId: ADMIN }, configured)(MEMBER),
    ).toThrow(UnauthorizedError);
    expect(configured.lines).toEqual([]);
  });
});
