import { redirect } from "next/navigation";
import { connection } from "next/server";
import { AppHeader } from "@/app/_components/app-header";
import { CoverThumb } from "@/app/_components/cover-thumb";
import { Group } from "@/app/_components/group";
import { ForwardIcon } from "@/app/_components/icons";
import { PageColumn } from "@/app/_components/page-column";
import { Piece } from "@/app/_components/piece";
import { Steps } from "@/app/_components/steps";
import { gate } from "@/app/_lib/account";
import { coverColorOf } from "@/src/entities/piece";
import { PLAN_TIME_ZONE, todayIn } from "@/src/entities/week";
import { loadLoan } from "../load-loan";
import { PhoneLink, periodWords, Title } from "../loan-parts";
import { HandItOver } from "../pass-along-moves";

// Hand it to Jo (C11, R48): the borrower's way to pass a copy straight to the next friend in line,
// while its owner lets friends do that and it hasn't been called back. The copy, who has it and
// who's next; the three steps, with the next friend's phone, friends or not; and I gave it to Jo,
// or I gave it back to Sam after all. Anyone else, or a loan that can't be handed on, goes to the
// loan's own page.
export default async function PassAlongPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await connection();
  const { user } = await gate("app");
  const { id } = await params;
  const {
    loan,
    role,
    game,
    other: owner,
    you,
    handoff,
  } = await loadLoan(id, user.id);
  if (role !== "borrower" || loan.status !== "out" || !handoff) {
    redirect(`/loans/${id}`);
  }
  const today = todayIn(PLAN_TIME_ZONE);

  return (
    <PageColumn
      width="read"
      header={
        <AppHeader back={{ href: `/loans/${loan.id}`, label: game.title }} />
      }
    >
      <Title>{`Hand it to ${handoff.name}`}</Title>
      <Group label="The pass-along" roomy>
        <div className="flex items-center gap-3">
          <CoverThumb color={coverColorOf(game)} imageUrl={game.imageUrl} />
          <div className="flex min-w-0 flex-col gap-0.5">
            <span className="text-15 font-bold">{game.title}</span>
            <span className="flex items-center gap-1.25 text-xs">
              <Piece
                shape={owner.pieceShape}
                color={owner.pieceColor}
                size={11}
              />
              {owner.name}’s copy
            </span>
          </div>
        </div>
        {/* Who has it and who's next, each centered in half the width under a dashed rule. */}
        <div className="flex items-start border-t-2 border-dashed border-foreground pt-3">
          <span className="flex flex-1 flex-col items-center gap-1">
            <Piece shape={you.pieceShape} color={you.pieceColor} size={24} />
            <span className="font-mono text-2xs font-medium">You have it</span>
          </span>
          <span className="flex h-8.75 items-center">
            <ForwardIcon aria-hidden="true" />
          </span>
          <span className="flex flex-1 flex-col items-center gap-1">
            <Piece
              shape={handoff.pieceShape}
              color={handoff.pieceColor}
              size={24}
            />
            <span className="font-mono text-2xs font-medium">
              {handoff.name} is next
            </span>
          </span>
        </div>
      </Group>
      <Group label="Three steps" overList>
        <Steps
          top
          steps={[
            {
              id: "arrange",
              text: (
                <span className="flex flex-col gap-0.5">
                  <span>Arrange it with {handoff.name}</span>
                  {handoff.phone && (
                    <span className="flex">
                      <PhoneLink name={handoff.name} phone={handoff.phone} />
                    </span>
                  )}
                </span>
              ),
            },
            { id: "give", text: `Give ${handoff.name} the game` },
            {
              id: "confirm",
              text: (
                <span className="flex flex-col gap-0.5">
                  <span>{handoff.name} confirms they have it</span>
                  <span className="text-xs leading-snug font-normal text-muted-foreground">
                    Your loan ends then. {handoff.name}’s starts that day and
                    runs {periodWords(loan.periodDays)}, the same as yours.
                  </span>
                </span>
              ),
            },
          ]}
        />
      </Group>
      <Group label="When you’ve handed it over">
        <p className="text-13 leading-snug text-muted-foreground">
          {handoff.name} is asked to confirm. The loan stays yours until{" "}
          {handoff.name} does, and then {owner.name} is told.
        </p>
        <HandItOver
          loanId={loan.id}
          next={handoff.name}
          owner={owner.name}
          today={today}
        />
      </Group>
    </PageColumn>
  );
}
