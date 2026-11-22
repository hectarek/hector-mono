import { redirect } from "next/navigation";
import { connection } from "next/server";
import { AppHeader } from "@/app/_components/app-header";
import { PageColumn } from "@/app/_components/page-column";
import { getCurrentUserId } from "@/app/_lib/current-user";

// The Library (B1), which U6 and U8 build: for now the tab's header in the shell. It waits on
// connection() before it reads the session, so neither the build's prerender nor a partial
// prefetch starts Neon's session read, which fails and logs when their render ends
// (docs/solutions/runtime-errors/partial-prefetching-runs-page-reads-that-fail-in-production.md).
// Whatever it reads after the session (the clock, the database) runs at request time, under the
// skeleton in loading.tsx.
export default async function LibraryPage() {
  await connection();
  if (!(await getCurrentUserId())) {
    redirect("/welcome");
  }
  return <PageColumn width="browse" header={<AppHeader title="Library" />} />;
}
