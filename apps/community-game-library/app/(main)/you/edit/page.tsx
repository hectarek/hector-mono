import { connection } from "next/server";
import { AppHeader } from "@/app/_components/app-header";
import { PageColumn } from "@/app/_components/page-column";
import { ProfileForm } from "@/app/_components/profile-form";
import { gate } from "@/app/_lib/account";
import { removePhoto, updateProfile } from "@/app/actions/profile";
import { getInjection } from "@/di/container";

// E6: the same form as A4 (profile-form), with the profile as it is. Save keeps the changes and
// goes back to You with "Profile saved.".
export default async function EditProfilePage() {
  await connection();
  const { user } = await gate("app");
  const [{ profile, photoUrl }, taken] = await Promise.all([
    getInjection("IGetProfileController")({ userId: user.id }, user.id),
    getInjection("IListTakenPiecesController")(user.id),
  ]);

  return (
    <PageColumn
      width="read"
      header={<AppHeader back={{ href: "/you", label: "You" }} />}
    >
      <h1 className="text-2xl leading-tight font-bold">Edit profile</h1>
      <ProfileForm
        mode="edit"
        action={updateProfile}
        removePhoto={removePhoto}
        photoUrl={photoUrl}
        initial={{
          name: profile.name,
          phone: profile.phone ?? "",
          shape: profile.pieceShape,
          color: profile.pieceColor,
        }}
        taken={taken}
      />
    </PageColumn>
  );
}
