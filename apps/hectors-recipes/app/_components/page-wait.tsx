import { ProduceArt } from "@/app/_components/produce-art";
import type { Produce } from "@/app/_components/produce-tile";

const ROW: Produce[] = ["tomato", "carrot", "lemon", "basil", "plum"];

// While a page is on screen but can't be tapped yet (docs/ux-plan.md D104): the reader's
// produce row, hopping in a wave just under the header, so the app waits one way everywhere.
// It's in the server's HTML and moves by CSS alone (`[data-page-wait]` in globals.css), since
// it plays while the page's code is still loading. It shows only after a short wait, and goes
// once `ReadyMark` marks the page ready. Taps go through it.
export function PageWait() {
  return (
    <div
      data-page-wait
      aria-hidden
      className="pointer-events-none fixed inset-x-0 top-14 z-40 flex justify-center pt-2"
    >
      <div className="bg-background/90 flex items-end gap-1.5 rounded-full border px-3 py-1.5">
        {ROW.map((produce) => (
          <ProduceArt key={produce} produce={produce} className="size-5" />
        ))}
      </div>
    </div>
  );
}
