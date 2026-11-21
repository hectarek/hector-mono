// Signed-in members for the page, action and gate tests, made through the app's own controllers on
// the container's mock repositories (which live for the whole run, so each test signs in as a new
// user: signInAsNewUser).
import { getInjection } from "@/di/container";
import type { ProfileForm } from "@/src/entities/models/user-profile.model";
import { MockRemovedUsersRepository } from "@/src/infrastructure/repositories/removed-users.repository.mock";
import { MockFileStorageService } from "@/src/infrastructure/services/mock-file-storage.service";
import { signInAsNewUser } from "@/tests/_support/next";

export const QUINN: ProfileForm = {
  name: "Quinn Sample",
  pieceShape: "cone",
  pieceColor: "teal",
  phone: "555 0123",
};

// Signs in as a new user with a profile, and returns their id.
export async function signInAsMember(
  profile: Partial<ProfileForm> = {},
): Promise<string> {
  const userId = signInAsNewUser();
  await getInjection("ICreateProfileController")(
    { ...QUINN, ...profile },
    userId,
  );
  return userId;
}

// The account the admin removed (U22 adds the removal), in the container's repository.
export function removeAccount(userId: string): void {
  const removed = getInjection("IRemovedUsersRepository");
  if (removed instanceof MockRemovedUsersRepository)
    removed.userIds.add(userId);
}

// The files stored for one member, in the container's file storage (which lives for the whole
// run, like its repositories).
export function storedFor(userId: string): string[] {
  const storage = getInjection("IFileStorage");
  if (!(storage instanceof MockFileStorageService)) {
    throw new Error("The container's storage is the mock under test");
  }
  return [...storage.files.keys()].filter((key) =>
    key.startsWith(`profile-photos/${userId}/`),
  );
}
