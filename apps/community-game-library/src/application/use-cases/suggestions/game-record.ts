import type { IGamesRepository } from "@/src/application/repositories/games.repository.interface";
import type { IFileStorage } from "@/src/application/services/file-storage.service.interface";
import { InputParseError } from "@/src/entities/errors/common";
import type { Game, GameRecord } from "@/src/entities/models/game.model";
import type { ITransaction } from "@/src/entities/models/transaction.model";
import { PHOTO_EXTENSIONS, type Photo } from "@/src/entities/profile-photo";

// The database's family rule, said in words before it refuses: an expansion has a base game,
// and that's a base game; a base game has none (docs/data-model.md, games).
export async function checkFamily(
  games: IGamesRepository,
  record: GameRecord,
  tx: ITransaction,
): Promise<void> {
  if (record.type === "base-game") {
    if (record.baseGameId !== null) {
      throw new InputParseError("Only an expansion has a base game");
    }
    return;
  }
  const base = record.baseGameId
    ? await games.getById(record.baseGameId, tx)
    : undefined;
  if (base?.type !== "base-game") {
    throw new InputParseError("An expansion needs its base game");
  }
}

// A credit belongs to its image (data-model.md, games): when the admin changes or removes the
// image and leaves the credit as it was, the credit goes with the old image.
export function creditOnlyItsImage(
  current: Game,
  record: GameRecord,
): GameRecord {
  const sameImage = record.imageUrl === current.imageUrl;
  const sameCredit =
    record.imageCredit === current.imageCredit &&
    record.imageSourceUrl === current.imageSourceUrl;
  return sameImage || !sameCredit
    ? record
    : { ...record, imageCredit: null, imageSourceUrl: null };
}

// A game's picture uploaded on G3 or G4, into the public catalog bucket (KTD11): its address
// is what the row keeps.
export async function storeGameImage(
  fileStorage: IFileStorage,
  photo: Photo,
): Promise<{ key: string; url: string }> {
  const key = `games/${crypto.randomUUID()}.${PHOTO_EXTENSIONS[photo.contentType]}`;
  await fileStorage.put("catalog-images", key, photo.bytes, photo.contentType);
  return { key, url: fileStorage.publicUrl("catalog-images", key) };
}
