import { describe, expect, it, mock } from "bun:test";
import { UnauthenticatedError } from "@/src/entities/errors/common";
import { MAX_PHOTO_BYTES } from "@/src/entities/profile-photo";
import { MockLoggerService } from "@/src/infrastructure/services/mock-logger.service";
import { createProfileController } from "@/src/interface-adapters/controllers/profile/create-profile.controller";
import { getAccountStateController } from "@/src/interface-adapters/controllers/profile/get-account-state.controller";
import { getProfileController } from "@/src/interface-adapters/controllers/profile/get-profile.controller";
import { listTakenPiecesController } from "@/src/interface-adapters/controllers/profile/list-taken-pieces.controller";
import { removePhotoController } from "@/src/interface-adapters/controllers/profile/remove-photo.controller";
import { setPhotoController } from "@/src/interface-adapters/controllers/profile/set-photo.controller";
import { updateProfileController } from "@/src/interface-adapters/controllers/profile/update-profile.controller";
import { CAST } from "@/tests/_support/cast";
import { controllerBasics, ID } from "@/tests/_support/controller";

const FORM = { name: "Quinn Sample", pieceShape: "cone", pieceColor: "moss" };
const PARSED = { ...FORM, phone: null };
const BAD_FORMS = {
  "an empty name": { ...FORM, name: "   " },
  "a shape that isn't listed": { ...FORM, pieceShape: "castle" },
  "a color that isn't listed": { ...FORM, pieceColor: "magenta" },
};

describe("createProfileController", () => {
  controllerBasics({
    make: (useCase, logger) => createProfileController(useCase, logger),
    valid: FORM,
    calledWith: [PARSED, CAST.people.you.id],
    invalid: BAD_FORMS,
  });
});

describe("updateProfileController", () => {
  controllerBasics({
    make: (useCase, logger) => updateProfileController(useCase, logger),
    valid: { ...FORM, phone: "  " },
    calledWith: [PARSED, CAST.people.you.id],
    invalid: BAD_FORMS,
  });
});

describe("setPhotoController", () => {
  const photo = (bytes: number, contentType = "image/jpeg") => ({
    photo: { bytes: new Uint8Array(bytes), contentType },
  });
  controllerBasics({
    make: (useCase, logger) => setPhotoController(useCase, logger),
    valid: photo(10),
    calledWith: [photo(10).photo, CAST.people.you.id],
    invalid: {
      "a photo over 300 KB": photo(MAX_PHOTO_BYTES + 1),
      "an empty photo": photo(0),
      "a file that isn't a picture": photo(10, "application/pdf"),
    },
  });
});

describe("getProfileController", () => {
  controllerBasics({
    make: (useCase, logger) => getProfileController(useCase, logger),
    valid: { userId: ID },
    calledWith: [ID, CAST.people.you.id],
    invalid: { "an id that isn't one": { userId: "you" } },
  });
});

describe("the controllers that read for the signed-in member", () => {
  const controllers = {
    getAccountState: getAccountStateController,
    listTakenPieces: listTakenPiecesController,
    removePhoto: removePhotoController,
  };
  for (const [name, make] of Object.entries(controllers)) {
    it(`${name} turns away a signed-out user, and passes the member's id on`, async () => {
      const useCase = mock(async () => undefined);
      const controller = make(useCase as never, new MockLoggerService());
      await expect(controller(undefined)).rejects.toBeInstanceOf(
        UnauthenticatedError,
      );
      expect(useCase).not.toHaveBeenCalled();
      await controller(CAST.people.you.id);
      expect(useCase).toHaveBeenCalledWith(CAST.people.you.id);
    });
  }
});
