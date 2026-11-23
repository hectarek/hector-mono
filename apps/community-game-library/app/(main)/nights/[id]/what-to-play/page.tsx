import { notFound } from "next/navigation";
import { connection } from "next/server";
import { AppHeader } from "@/app/_components/app-header";
import { DicePair } from "@/app/_components/dice";
import { PageColumn } from "@/app/_components/page-column";
import { gate } from "@/app/_lib/account";
import { getInjection } from "@/di/container";
import { InputParseError, NotFoundError } from "@/src/entities/errors/common";
import { WhatToPlayView } from "./what-to-play-view";

async function loadChoices(gameNightId: string, userId: string) {
  try {
    return await getInjection("IWhatToPlayController")({ gameNightId }, userId);
  } catch (err) {
    if (err instanceof NotFoundError || err instanceof InputParseError) {
      notFound();
    }
    throw err;
  }
}

// What should we play? (D8, R37), for anyone who can see the night (KTD4), opened from D2, D7 and
// D13. The way back names the night.
export default async function WhatToPlayPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await connection();
  const { user } = await gate("app");
  const { id } = await params;
  const choices = await loadChoices(id, user.id);

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
      <div className="flex items-center gap-2.5">
        <DicePair />
        <h1 className="text-2xl leading-7 font-bold">What should we play?</h1>
      </div>
      <WhatToPlayView choices={choices} userId={user.id} />
    </PageColumn>
  );
}
