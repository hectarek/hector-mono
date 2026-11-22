import { connection } from "next/server";
import { ProfileForm } from "@/app/_components/profile-form";
import { gate } from "@/app/_lib/account";
import { createProfile } from "@/app/actions/profile";
import { getInjection } from "@/di/container";
import { ProfileStepHeading } from "./heading";

// A4, step 1 of 3 (R40, R51): the name, from the account's own, a photo and a phone, both
// optional, and the playing piece. Someone who came through a friend link (?friend=, U10) is
// friends already, so their friend's piece shows as taken, and step 2 (A5) comes next. Its
// skeleton is loading.tsx, under the steps' layout.
export default async function ProfileStepPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  await connection();
  const { user } = await gate("start");
  const { friend } = await searchParams;
  const taken = await getInjection("IListTakenPiecesController")(user.id);
  const next =
    typeof friend === "string" && taken.some((one) => one.userId === friend)
      ? `/start/friends?${new URLSearchParams({ friend })}`
      : undefined;
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
        next={next}
      />
    </>
  );
}
