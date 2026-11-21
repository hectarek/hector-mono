import type { IUserProfilesRepository } from "@/src/application/repositories/user-profiles.repository.interface";
import { DatabaseOperationError } from "@/src/entities/errors/common";
import type {
  NameAndPiece,
  NewUserProfile,
  UserProfile,
  UserProfileChanges,
} from "@/src/entities/models/user-profile.model";

const byUserId = (a: NameAndPiece, b: NameAndPiece) =>
  a.userId < b.userId ? -1 : a.userId > b.userId ? 1 : 0;

export class MockUserProfilesRepository implements IUserProfilesRepository {
  private readonly profiles = new Map<string, UserProfile>();

  async getByUserId(userId: string): Promise<UserProfile | undefined> {
    const profile = this.profiles.get(userId);
    return profile && { ...profile };
  }

  async getManyByUserIds(userIds: readonly string[]): Promise<NameAndPiece[]> {
    return [...new Set(userIds)]
      .flatMap((userId) => {
        const profile = this.profiles.get(userId);
        return profile
          ? [
              {
                userId: profile.userId,
                name: profile.name,
                pieceShape: profile.pieceShape,
                pieceColor: profile.pieceColor,
              },
            ]
          : [];
      })
      .sort(byUserId);
  }

  async create(profile: NewUserProfile): Promise<UserProfile> {
    // As the table's key: one profile a member.
    if (this.profiles.has(profile.userId)) {
      throw new DatabaseOperationError("create failed");
    }
    const now = new Date();
    const created: UserProfile = {
      ...profile,
      phone: profile.phone ?? null,
      photoKey: null,
      createdAt: now,
      updatedAt: now,
    };
    this.profiles.set(created.userId, created);
    return { ...created };
  }

  async update(userId: string, changes: UserProfileChanges): Promise<void> {
    const profile = this.profiles.get(userId);
    if (!profile) {
      return;
    }
    // As drizzle's update, which leaves out a change that's undefined.
    const set = Object.fromEntries(
      Object.entries(changes).filter(([, value]) => value !== undefined),
    ) as UserProfileChanges;
    this.profiles.set(userId, { ...profile, ...set, updatedAt: new Date() });
  }
}
