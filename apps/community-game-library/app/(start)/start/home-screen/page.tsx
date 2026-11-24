import { Button } from "@repo/ui/components/button";
import Link from "next/link";
import { connection } from "next/server";
import { BackLink } from "@/app/_components/back-link";
import { HomeScreenSteps } from "@/app/_components/home-screen-steps";
import { gate } from "@/app/_lib/account";

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

// A6, the last step of setting up (R43): how to put the app on the home screen, then on to My
// library, which A7 draws empty. You's row opens it again (?from=you), with its way back and no
// step count. Its skeleton is loading.tsx.
export default async function HomeScreenPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  await connection();
  await gate("app");
  const fromYou = (await searchParams).from === "you";
  return (
    <>
      <div className="flex flex-col gap-2">
        {fromYou ? (
          <BackLink href="/you" label="You" />
        ) : (
          <p
            data-ink="smudge"
            className="font-mono text-2xs font-medium tracking-wider uppercase"
          >
            Step 3 of 3
          </p>
        )}
        <h1 className="text-2xl leading-tight font-bold">
          Put it on your home screen
        </h1>
      </div>
      <HomeScreenSteps />
      <Button
        size="lg"
        nativeButton={false}
        render={<Link href={fromYou ? "/you" : "/my-library"} />}
        className="mt-1"
      >
        {fromYou ? "Done" : "Go to my library"}
      </Button>
    </>
  );
}
