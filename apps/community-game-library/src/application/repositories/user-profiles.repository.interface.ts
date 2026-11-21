import type { ITransaction } from "@/src/entities/models/transaction.model";
import type {
  NameAndPiece,
  NewUserProfile,
  UserProfile,
  UserProfileChanges,
} from "@/src/entities/models/user-profile.model";

// Members' profiles (docs/data-model.md, user_profiles). A whole profile, with the phone and the
// photo's key, is read only for someone who may see them: the member, their friends (after
// requireFriend), and the other person in a loan or a pass-along (KTD4). Everyone else a screen
// shows gets a name and a piece.
export interface IUserProfilesRepository {
  getByUserId(
    userId: string,
    tx?: ITransaction,
  ): Promise<UserProfile | undefined>;
  // Names and pieces for display, in user-id order. Someone with no profile, such as a former
  // member, is left out.
  getManyByUserIds(
    userIds: readonly string[],
    tx?: ITransaction,
  ): Promise<NameAndPiece[]>;
  // A member has one profile: a second is refused.
  create(profile: NewUserProfile, tx?: ITransaction): Promise<UserProfile>;
  update(
    userId: string,
    changes: UserProfileChanges,
    tx?: ITransaction,
  ): Promise<void>;
}
