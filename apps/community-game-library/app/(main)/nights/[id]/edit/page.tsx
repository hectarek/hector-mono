import { notFound } from "next/navigation";
import { connection } from "next/server";
import { AppHeader } from "@/app/_components/app-header";
import { PageColumn } from "@/app/_components/page-column";
import { gate } from "@/app/_lib/account";
import { clockIn, PLAN_TIME_ZONE, todayIn } from "@/src/entities/week";
import { NightForm } from "../../night-form";
import { loadNight } from "../load-night";

// The host's Edit (from D7, R34): D5's fields with the night as it is. Only the host opens it;
// anyone else who can see the night gets Not found here too.
export default async function EditNightPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await connection();
  const { user } = await gate("app");
  const { id } = await params;
  const page = await loadNight(id, user.id);
  if (page.you !== "host") {
    notFound();
  }
  const { night } = page;
  const today = todayIn(PLAN_TIME_ZONE);

  return (
    <PageColumn
      width="read"
      header={
        <AppHeader back={{ href: `/nights/${night.id}`, label: night.title }} />
      }
    >
      <h1 className="text-2xl leading-7 font-bold">Edit the night</h1>
      <NightForm
        today={today}
        start={{
          name: night.title,
          date: todayIn(PLAN_TIME_ZONE, night.startsAt),
          startsAt: clockIn(night.startsAt, PLAN_TIME_ZONE),
          endsAt: night.endsAt ? clockIn(night.endsAt, PLAN_TIME_ZONE) : null,
          place: night.place,
          address: night.address ?? "",
          note: night.hostNote ?? "",
          capacity: night.capacity,
          audience: night.audience,
          attendeesCanInvite: night.attendeesCanInvite,
          guestsAllowed: night.guestsAllowed,
        }}
        edit={{
          gameNightId: night.id,
          going: page.going
            .filter((one) => one.userId !== user.id)
            .map(({ userId, name }) => ({ userId, name })),
        }}
      />
    </PageColumn>
  );
}
