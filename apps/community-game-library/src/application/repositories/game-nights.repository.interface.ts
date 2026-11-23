import type { ITransaction } from "@/src/entities/models/transaction.model";

// Game nights (docs/data-model.md, game_nights and game_night_attendees). U17's daily run reads
// who's going to a night that starts soon; U18 and U19 add the nights' own reads and writes.
export interface IGameNightsRepository {
  // Everyone going to a night that isn't cancelled and starts from `from` until before `to`.
  listGoingToNightsStarting(
    from: Date,
    to: Date,
    tx?: ITransaction,
  ): Promise<{ gameNightId: string; userId: string; startsAt: Date }[]>;
}
