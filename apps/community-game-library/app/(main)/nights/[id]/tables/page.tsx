import { notFound } from "next/navigation";
import { connection } from "next/server";
import { AppHeader } from "@/app/_components/app-header";
import { PageColumn } from "@/app/_components/page-column";
import { gate } from "@/app/_lib/account";
import { getInjection } from "@/di/container";
import { InputParseError, NotFoundError } from "@/src/entities/errors/common";
import { TablesView } from "./tables-view";

const TIME_WORDS = {
  60: "1 hour",
  90: "90 min",
  120: "2 hours",
  180: "3 hours",
};

async function loadChoices(gameNightId: string, userId: string) {
  try {
    return await getInjection("ISplitTablesController")(
      { gameNightId },
      userId,
    );
  } catch (err) {
    if (err instanceof NotFoundError || err instanceof InputParseError) {
      notFound();
    }
    throw err;
  }
}

// Split into tables (D9, R46), for anyone who can see the night (KTD4), opened from D7: the
// people going and the night's time, then the split. The way back names the night.
export default async function TablesPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await connection();
  const { user } = await gate("app");
  const { id } = await params;
  const choices = await loadChoices(id, user.id);
  const guests = choices.parties.reduce((sum, party) => sum + party.guests, 0);

  return (
    <PageColumn
      width="read"
      header={
        <AppHeader
          back={{
            href: `/nights/${choices.night.id}`,
            label: choices.night.title,
          }}
        />
      }
    >
      <div className="flex flex-col gap-1">
        <h1 className="text-2xl leading-7 font-bold">Split into tables</h1>
        <p className="font-mono text-13 font-medium">
          {choices.parties.length} going
          {guests > 0 && ` + ${guests} ${guests === 1 ? "guest" : "guests"}`} ·{" "}
          {TIME_WORDS[choices.minutes]}
        </p>
      </div>
      <TablesView choices={choices} userId={user.id} />
    </PageColumn>
  );
}
