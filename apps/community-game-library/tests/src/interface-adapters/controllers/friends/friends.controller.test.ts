import { describe, expect, it, mock } from "bun:test";
import {
  InputParseError,
  UnauthenticatedError,
} from "@/src/entities/errors/common";
import { MockLoggerService } from "@/src/infrastructure/services/mock-logger.service";
import { answerFriendRequestController } from "@/src/interface-adapters/controllers/friends/answer-friend-request.controller";
import { cancelFriendRequestController } from "@/src/interface-adapters/controllers/friends/cancel-friend-request.controller";
import { checkFriendLinkController } from "@/src/interface-adapters/controllers/friends/check-friend-link.controller";
import { getFriendController } from "@/src/interface-adapters/controllers/friends/get-friend.controller";
import { openFriendLinkController } from "@/src/interface-adapters/controllers/friends/open-friend-link.controller";
import { sendFriendRequestController } from "@/src/interface-adapters/controllers/friends/send-friend-request.controller";
import { unfriendController } from "@/src/interface-adapters/controllers/friends/unfriend.controller";
import { CAST } from "@/tests/_support/cast";
import { controllerBasics, ID } from "@/tests/_support/controller";

const { you } = CAST.people;

describe("sendFriendRequestController", () => {
  controllerBasics({
    make: (useCase, logger) => sendFriendRequestController(useCase, logger),
    valid: { recipientUserId: ID },
    calledWith: [ID, you.id],
    invalid: { "a recipient who isn't an id": { recipientUserId: "Noor" } },
  });
});

describe("answerFriendRequestController", () => {
  controllerBasics({
    make: (useCase, logger) => answerFriendRequestController(useCase, logger),
    valid: { requestId: ID, answer: "decline" },
    calledWith: [ID, "decline", you.id],
    invalid: {
      "an answer it doesn't know": { requestId: ID, answer: "maybe" },
    },
  });
});

describe("cancelFriendRequestController", () => {
  controllerBasics({
    make: (useCase, logger) => cancelFriendRequestController(useCase, logger),
    valid: { requestId: ID },
    calledWith: [ID, you.id],
    invalid: { "no request": {} },
  });
});

describe("unfriendController", () => {
  controllerBasics({
    make: (useCase, logger) => unfriendController(useCase, logger),
    valid: { friendId: ID },
    calledWith: [ID, you.id],
    invalid: { "a friend who isn't an id": { friendId: "sam" } },
  });
});

// A link's token is checked for its form before any read (KTD4): 8 of Crockford's base-32
// characters in two groups, whatever their case.
describe("openFriendLinkController", () => {
  controllerBasics({
    make: (useCase, logger) => openFriendLinkController(useCase, logger),
    valid: { token: " k7q2-harb " },
    calledWith: ["K7Q2-HARB", you.id, expect.any(Date)],
    invalid: {
      "a token without its dash": { token: "K7Q2HARB" },
      "a token with a look-alike letter": { token: "K7Q2-HARL" },
      "a token too long": { token: "K7Q2-HARBS" },
    },
  });
});

describe("checkFriendLinkController", () => {
  it("passes a signed-out visitor's token on, in capitals, and refuses another form unread", async () => {
    const useCase = mock(async () => ({ expiresAt: new Date() }));
    const check = checkFriendLinkController(
      useCase as never,
      new MockLoggerService(),
    );
    await check({ token: "k7q2-harb" });
    expect(useCase).toHaveBeenCalledWith("K7Q2-HARB", expect.any(Date));

    await expect(check({ token: "../admin" })).rejects.toThrow(InputParseError);
    expect(useCase).toHaveBeenCalledTimes(1);
  });
});

describe("getFriendController", () => {
  it("turns away a signed-out member and an id that isn't one, unread", async () => {
    const useCase = mock(async () => ({}));
    const get = getFriendController(useCase as never, new MockLoggerService());
    await expect(get(ID, {}, undefined)).rejects.toThrow(UnauthenticatedError);
    await expect(get("sam", {}, you.id)).rejects.toThrow(InputParseError);
    expect(useCase).not.toHaveBeenCalled();

    await get(ID, { sort: "year" }, you.id);
    expect(useCase).toHaveBeenCalledWith(
      ID,
      you.id,
      expect.stringMatching(/^\d{4}-\d{2}-\d{2}$/),
      expect.objectContaining({ sort: "year" }),
    );
  });
});
