import { connection } from "next/server";
import { ProfileForm } from "@/app/_components/profile-form";
import { gate } from "@/app/_lib/account";
import { createProfile } from "@/app/actions/profile";
import { getInjection } from "@/di/container";
import { ProfileStepHeading } from "./heading";

// A4, step 1 of 3 (R40, R51): the name, from the account's own, a photo and a phone, both
// optional, and the playing piece. A friend link adds step 2 (A5) with U10. Its skeleton is
// loading.tsx, under the steps' layout.
export default async function ProfileStepPage() {
  await connection();
  const { user } = await gate("start");
  const taken = await getInjection("IListTakenPiecesController")(user.id);
  return (
    <>
      <ProfileStepHeading />
      <ProfileForm
        mode="start"
        action={createProfile}
        initial={{
          name: user.name,
          phone: "",
          shape: "pawn",
          color: "mustard",
        }}
        taken={taken}
      />
    </>
  );
}
