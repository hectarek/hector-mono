import { connection } from "next/server";
import { AppHeader } from "@/app/_components/app-header";
import { PageColumn } from "@/app/_components/page-column";
import { gate } from "@/app/_lib/account";
import { getInjection } from "@/di/container";
import { PLAN_TIME_ZONE, todayIn } from "@/src/entities/week";
import { newNightStart } from "../new-night-start";
import { NightForm } from "../night-form";

// New game night (D5, R29): the night's fields, with the games on the table picked from the
// member's own library (D6).
export default async function NewNightPage() {
  await connection();
  const { user } = await gate("app");
  const choices = await getInjection("IGetNightGameChoicesController")(user.id);
  const today = todayIn(PLAN_TIME_ZONE);

  return (
    <PageColumn
      width="read"
      header={<AppHeader back={{ href: "/nights", label: "Nights" }} />}
    >
      <h1 className="text-2xl leading-7 font-bold">New game night</h1>
      <NightForm today={today} start={newNightStart(today)} choices={choices} />
    </PageColumn>
  );
}
