import type { IFriendshipsRepository } from "@/src/application/repositories/friendships.repository.interface";
import type { IGameNightsRepository } from "@/src/application/repositories/game-nights.repository.interface";
import { NotFoundError } from "@/src/entities/errors/common";
import type { GameNight } from "@/src/entities/models/game-night.model";
import type { ITransaction } from "@/src/entities/models/transaction.model";

type NightReaders = {
  friendships: IFriendshipsRepository;
  gameNights: IGameNightsRepository;
};

// Who may see a night (docs/build-plan.md KTD4, R30, R36): its host, anyone on its list (invited
// by name or by its link, or answered), and the host's friends when it's for friends. Every read
// of a night goes through it before its place, address or list load (AE5).
async function canSeeNight(
  { friendships, gameNights }: NightReaders,
  night: GameNight,
  viewerId: string,
  tx?: ITransaction,
): Promise<boolean> {
  if (night.createdBy === viewerId) {
    return true;
  }
  if (await gameNights.getAttendee(night.id, viewerId, tx)) {
    return true;
  }
  return (
    night.audience === "friends" &&
    (await friendships.areFriends(viewerId, night.createdBy, tx))
  );
}

// A night the member may see, or the Not found an id with no night gets, so someone who isn't
// invited can't tell a private night exists (AE5).
export async function nightToSee(
  readers: NightReaders,
  gameNightId: string,
  viewerId: string,
  tx?: ITransaction,
): Promise<GameNight> {
  const night = await readers.gameNights.getById(gameNightId, tx);
  if (!night || !(await canSeeNight(readers, night, viewerId, tx))) {
    throw new NotFoundError();
  }
  return night;
}
