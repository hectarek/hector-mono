import type { JSX } from "@solidjs/web";
import { Show, useContext } from "solid-js";
import { PlanContext } from "../state/plan-store";
import { Button } from "./controls";

/** A message about saving or importing, and the reminder to export (the spec's R13). */
export function Notices(): JSX.Element {
  const store = useContext(PlanContext);
  return (
    <>
      <Show when={store.notice()}>
        {(notice) => (
          <div
            role={notice().tone === "error" ? "alert" : undefined}
            class={[
              "flex flex-wrap items-center gap-3 border-b-2 px-4 py-2.5",
              {
                "border-destructive bg-card text-foreground":
                  notice().tone === "error",
                "border-primary bg-primary text-primary-foreground":
                  notice().tone === "info",
              },
            ]}
          >
            <p class="min-w-0 flex-1 text-sm leading-snug">{notice().text}</p>
            <Show when={notice().download}>
              {(download) => (
                <Button
                  onClick={() =>
                    store.download(download().fileName, download().text)
                  }
                >
                  Download it
                </Button>
              )}
            </Show>
            <Button onClick={() => store.dismissNotice()}>Dismiss</Button>
          </div>
        )}
      </Show>
      <Show when={store.needsExport()}>
        <div class="flex flex-wrap items-center gap-3 border-primary border-b-2 bg-card px-4 py-2.5">
          <p class="min-w-0 flex-1 text-sm leading-snug">
            This plan hasn't been exported for over a week. Safari can clear
            this browser's copy after a week without a visit, so an exported
            file is the safe one.
          </p>
          <Button variant="primary" onClick={() => store.exportPlan()}>
            Export plan
          </Button>
        </div>
      </Show>
    </>
  );
}
