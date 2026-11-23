import { describe, expect, it, mock } from "bun:test";
import {
  InputParseError,
  UnauthenticatedError,
} from "@/src/entities/errors/common";
import { MockLoggerService } from "@/src/infrastructure/services/mock-logger.service";
import { createNightController } from "@/src/interface-adapters/controllers/nights/create-night.controller";
import { getNightController } from "@/src/interface-adapters/controllers/nights/get-night.controller";
import { listNightsController } from "@/src/interface-adapters/controllers/nights/list-nights.controller";
import { updateNightController } from "@/src/interface-adapters/controllers/nights/update-night.controller";
import { CAST } from "@/tests/_support/cast";
import { controllerBasics, ID } from "@/tests/_support/controller";

const { you } = CAST.people;

// D5's details as its form sends them, in Eastern time.
const details = {
  name: "  Heavy games at mine ",
  date: "2026-11-20",
  startsAt: "19:00",
  endsAt: "22:30",
  place: "Robin’s place",
  address: "",
  note: " Bring a heavy game if you have one. ",
  capacity: 6,
  audience: "invited",
};

// What those details are as a night's columns: 7 PM in New York is midnight UTC in November.
const columns = {
  title: "Heavy games at mine",
  startsAt: new Date("2026-11-21T00:00:00Z"),
  endsAt: new Date("2026-11-21T03:30:00Z"),
  place: "Robin’s place",
  address: null,
  hostNote: "Bring a heavy game if you have one.",
  capacity: 6,
  audience: "invited",
};

describe("createNightController", () => {
  controllerBasics({
    make: (useCase, logger) => createNightController(useCase, logger),
    valid: {
      ...details,
      attendeesCanInvite: false,
      guestsAllowed: true,
      userGameIds: [ID],
    },
    calledWith: [
      {
        ...columns,
        attendeesCanInvite: false,
        guestsAllowed: true,
        userGameIds: [ID],
      },
      you.id,
      expect.any(Date),
    ],
    invalid: {
      "a night with no name": {
        ...details,
        name: "  ",
        attendeesCanInvite: false,
        guestsAllowed: false,
        userGameIds: [],
      },
      "no place": {
        ...details,
        place: "",
        attendeesCanInvite: false,
        guestsAllowed: false,
        userGameIds: [],
      },
      "a time that isn't one": {
        ...details,
        startsAt: "7pm",
        attendeesCanInvite: false,
        guestsAllowed: false,
        userGameIds: [],
      },
      "no seats": {
        ...details,
        capacity: 0,
        attendeesCanInvite: false,
        guestsAllowed: false,
        userGameIds: [],
      },
      "an audience D5 doesn't offer": {
        ...details,
        audience: "everyone",
        attendeesCanInvite: false,
        guestsAllowed: false,
        userGameIds: [],
      },
      "a game that isn't an id": {
        ...details,
        attendeesCanInvite: false,
        guestsAllowed: false,
        userGameIds: ["night-market"],
      },
    },
  });

  it("puts an end at or before the start on the next day", async () => {
    const useCase = mock(async () => undefined);
    const controller = createNightController(
      useCase as never,
      new MockLoggerService(),
    );
    await controller(
      {
        ...details,
        startsAt: "21:00",
        endsAt: "01:00",
        attendeesCanInvite: false,
        guestsAllowed: false,
        userGameIds: [],
      },
      you.id,
    );
    expect(useCase).toHaveBeenCalledWith(
      expect.objectContaining({
        startsAt: new Date("2026-11-21T02:00:00Z"),
        endsAt: new Date("2026-11-21T06:00:00Z"),
      }),
      you.id,
      expect.any(Date),
    );
  });
});

describe("updateNightController", () => {
  controllerBasics({
    make: (useCase, logger) => updateNightController(useCase, logger),
    valid: { gameNightId: ID, ...details },
    calledWith: [ID, columns, you.id, expect.any(Date)],
    invalid: {
      "a night that isn't an id": { gameNightId: "heavy", ...details },
      "a switch and the details at once": {
        gameNightId: ID,
        ...details,
        guestsAllowed: true,
      },
      "nothing to change": { gameNightId: ID },
    },
  });

  it("saves a switch on its own (rule 4)", async () => {
    const useCase = mock(async () => undefined);
    const controller = updateNightController(
      useCase as never,
      new MockLoggerService(),
    );
    await controller({ gameNightId: ID, guestsAllowed: false }, you.id);
    expect(useCase).toHaveBeenCalledWith(
      ID,
      { guestsAllowed: false },
      you.id,
      expect.any(Date),
    );
  });
});

describe("getNightController", () => {
  controllerBasics({
    make: (useCase, logger) => getNightController(useCase, logger),
    valid: { gameNightId: ID },
    calledWith: [ID, you.id],
    invalid: { "a night that isn't an id": { gameNightId: "heavy" } },
  });
});

describe("listNightsController", () => {
  it("turns away a signed-out user, and lists the member's nights, or a friend's", async () => {
    const useCase = mock(async () => []);
    const controller = listNightsController(
      useCase as never,
      new MockLoggerService(),
    );
    await expect(controller(undefined)).rejects.toBeInstanceOf(
      UnauthenticatedError,
    );
    await controller(you.id);
    await controller(you.id, { goingUserId: ID });
    expect(useCase).toHaveBeenNthCalledWith(1, you.id, expect.any(Date), {});
    expect(useCase).toHaveBeenNthCalledWith(2, you.id, expect.any(Date), {
      goingUserId: ID,
    });
    await expect(
      controller(you.id, { goingUserId: "sam" }),
    ).rejects.toBeInstanceOf(InputParseError);
  });
});
