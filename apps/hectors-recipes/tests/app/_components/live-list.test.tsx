import { describe, expect, it, spyOn } from "bun:test";
import { render } from "@testing-library/react";
import { Activity } from "react";
import { LiveList } from "@/app/_components/live-list";
import * as liveUpdates from "@/app/_lib/live-updates";

// D88: Next.js keeps Groceries alive but hidden when you leave it. Its live updates let go
// then, and connect again when you come back, as they do after the phone sleeps.
describe("LiveList", () => {
  it("lets go of live updates when you leave Groceries, and reconnects on return", () => {
    const events: string[] = [];
    const listen = spyOn(liveUpdates, "listenToPlan").mockImplementation(
      (planId) => {
        events.push(`listen to ${planId}`);
        return {
          pause() {},
          resume() {},
          stop() {
            events.push("stop");
          },
        };
      },
    );
    const page = (mode: "visible" | "hidden") => (
      <Activity mode={mode}>
        <LiveList planId="plan-1" />
      </Activity>
    );

    const view = render(page("visible"));
    view.rerender(page("hidden"));
    view.rerender(page("visible"));
    listen.mockRestore();

    expect(events).toEqual(["listen to plan-1", "stop", "listen to plan-1"]);
  });
});
