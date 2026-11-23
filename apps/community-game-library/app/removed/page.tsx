import { Button } from "@repo/ui/components/button";
import { connection } from "next/server";
import { ClearSavedCopies } from "@/app/_components/clear-saved-copies";
import { gate } from "@/app/_lib/account";
import { SIGN_OUT_HREF } from "@/app/_lib/auth-paths";

// What a removed account sees, and nothing else (KTD3, G8): that it was removed, and Sign out.
// Any other account that opens it goes where it belongs.
export default async function RemovedPage() {
  await connection();
  await gate("removed");
  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-md flex-col justify-center gap-4 px-4">
      <h1 className="text-2xl leading-tight font-bold">
        Your account was removed.
      </h1>
      <Button
        size="lg"
        variant="secondary"
        nativeButton={false}
        render={<a href={SIGN_OUT_HREF} />}
      >
        Sign out
      </Button>
      <ClearSavedCopies />
    </main>
  );
}
