import { Suspense } from "react";
import { ClearSavedCopies } from "@/app/_components/clear-saved-copies";
import {
  WaysInPlaceholder,
  Welcome,
  WelcomeOrOpenInBrowser,
} from "./welcome-screen";

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

// Signed-out visitors start here (proxy.ts): A1, with the two ways in; or A9 in place of them when
// the link was opened inside a chat app's own browser (KTD3). Which of the two, and where
// someone was headed (?redirectTo=), are known only at request time, so the page waits on
// connection() and the user agent inside <Suspense>, and the rest is prerendered.
export default function WelcomePage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  return (
    <>
      <Suspense fallback={<Welcome ways={<WaysInPlaceholder />} />}>
        <WelcomeOrOpenInBrowser searchParams={searchParams} />
      </Suspense>
      <ClearSavedCopies />
    </>
  );
}
