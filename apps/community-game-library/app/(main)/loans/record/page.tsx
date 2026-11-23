import { Button } from "@repo/ui/components/button";
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyTitle,
} from "@repo/ui/components/empty";
import Link from "next/link";
import { connection } from "next/server";
import { AppHeader } from "@/app/_components/app-header";
import { PageColumn } from "@/app/_components/page-column";
import { gate } from "@/app/_lib/account";
import { getInjection } from "@/di/container";
import { PLAN_TIME_ZONE, todayIn } from "@/src/entities/week";
import { RecordLoanForm } from "./record-loan-form";

// Record a loan (C9, R17), for one made face to face: no request, and the friend doesn't
// confirm. With no game at home to lend, or no friends yet, it says so instead.
export default async function RecordLoanPage() {
  await connection();
  const { user } = await gate("app");
  const { copies, friends } = await getInjection(
    "IGetRecordLoanChoicesController",
  )(user.id);
  const today = todayIn(PLAN_TIME_ZONE);

  return (
    <PageColumn
      width="read"
      header={<AppHeader back={{ href: "/loans", label: "Loans" }} />}
    >
      <div className="flex flex-col gap-0.75">
        <h1 className="text-2xl leading-7 font-bold">Record a loan</h1>
        <p className="text-13 text-muted-foreground">
          For a loan you made face to face. No request needed.
        </p>
      </div>
      {copies.length === 0 ? (
        <Empty>
          <EmptyHeader>
            <EmptyTitle>Nothing at home to lend</EmptyTitle>
            <EmptyDescription>
              A game you lend shows here while it’s at home.
            </EmptyDescription>
          </EmptyHeader>
          <EmptyContent>
            <Button
              variant="secondary"
              nativeButton={false}
              render={<Link href="/my-library" />}
            >
              My library
            </Button>
          </EmptyContent>
        </Empty>
      ) : friends.length === 0 ? (
        <Empty>
          <EmptyHeader>
            <EmptyTitle>No friends yet</EmptyTitle>
            <EmptyDescription>
              A loan goes to a friend. Add one first.
            </EmptyDescription>
          </EmptyHeader>
          <EmptyContent>
            <Button
              variant="secondary"
              nativeButton={false}
              render={<Link href="/friends" />}
            >
              Friends
            </Button>
          </EmptyContent>
        </Empty>
      ) : (
        <RecordLoanForm copies={copies} friends={friends} today={today} />
      )}
    </PageColumn>
  );
}
