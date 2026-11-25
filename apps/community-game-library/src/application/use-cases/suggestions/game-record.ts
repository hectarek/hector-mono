import type { IGamesRepository } from "@/src/application/repositories/games.repository.interface";
import type { IUserGamesRepository } from "@/src/application/repositories/user-games.repository.interface";
import type { IFileStorage } from "@/src/application/services/file-storage.service.interface";
import { InputParseError } from "@/src/entities/errors/common";
import type { Game, GameRecord } from "@/src/entities/models/game.model";
import type { ITransaction } from "@/src/entities/models/transaction.model";
import { PHOTO_EXTENSIONS, type Photo } from "@/src/entities/profile-photo";

// The database's family rule, said in words before it refuses: an expansion has a base game,
// and that's a base game; a base game has none (docs/data-model.md, games). A game already in
// the catalog (G4, `gameId`) isn't its own base game, and doesn't become an expansion while it
// has expansions of its own, which would leave theirs an expansion.
export async function checkFamily(
  games: IGamesRepository,
  record: GameRecord,
  tx: ITransaction,
  gameId?: string,
): Promise<void> {
  if (record.type === "base-game") {
    if (record.baseGameId !== null) {
      throw new InputParseError("Only an expansion has a base game");
    }
    return;
  }
  if (gameId !== undefined && record.baseGameId === gameId) {
    throw new InputParseError("A game can’t be an expansion of itself");
  }
  const base = record.baseGameId
    ? await games.getById(record.baseGameId, tx)
    : undefined;
  if (base?.type !== "base-game") {
    throw new InputParseError("An expansion needs its base game");
  }
  if (
    gameId !== undefined &&
    (await games.listExpansions(gameId, tx)).length > 0
  ) {
    throw new InputParseError(
      "A game with expansions of its own can’t be an expansion",
    );
  }
}

// A game's type, and an expansion's base game, change only while no shelf depends on them
// (data-model.md, user_games and user_game_expansions): a copy on a shelf is a base game's, and
// a box holds expansions of its copy's game, so a game members own stays a base game, and an
// expansion in someone's box stays an expansion of the same game (G4).
export async function checkTypeChange(
  userGames: IUserGamesRepository,
  current: Game,
  record: GameRecord,
  tx: ITransaction,
): Promise<void> {
  if (
    current.type === "base-game" &&
    record.type === "expansion" &&
    (await userGames.hasCopies(current.id, tx))
  ) {
    throw new InputParseError(
      "Members own this game, so it can’t become an expansion",
    );
  }
  const outOfItsBox =
    current.type === "expansion" &&
    (record.type === "base-game" || record.baseGameId !== current.baseGameId);
  if (outOfItsBox && (await userGames.isInABox(current.id, tx))) {
    throw new InputParseError(
      record.type === "base-game"
        ? "This expansion is in someone’s box, so it can’t become a base game"
        : "This expansion is in someone’s box, so its base game can’t change",
    );
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
