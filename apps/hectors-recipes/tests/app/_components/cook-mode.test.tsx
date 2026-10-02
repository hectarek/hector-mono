import {
  afterAll,
  beforeAll,
  beforeEach,
  describe,
  expect,
  it,
} from "bun:test";
import { render } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { CookMode } from "@/app/_components/cook-mode";
import { isAlarmPrimed, quietAlarm } from "@/app/_lib/alarm";
import { cookProgressKey } from "@/app/_lib/cook-progress";

const RECIPE_ID = "6a6f2c5e-0000-4000-8000-000000000001";
const lines = [1, 2].map((position) => ({
  position,
  raw: position === 1 ? "1 lb ground turkey" : "1 onion, diced",
  section: null,
  quantity: 1,
  unit: position === 1 ? ("lb" as const) : null,
  name: position === 1 ? "ground turkey" : "onion",
  note: position === 1 ? null : "diced",
  optional: false,
}));
const steps = [
  { position: 1, text: "Brown the turkey.", timerMinutes: null, section: null },
  {
    position: 2,
    text: "Simmer for 20 minutes.",
    timerMinutes: 20,
    section: null,
  },
];

// A stand-in for the browser's Web Audio, which happy-dom doesn't have.
class FakeAudioContext {
  state = "suspended";
  resume() {
    this.state = "running";
    return Promise.resolve();
  }
  suspend() {
    this.state = "suspended";
    return Promise.resolve();
  }
}

// Cook mode, with what it keeps for the browser session.
describe("CookMode", () => {
  beforeAll(() => {
    Reflect.set(globalThis, "AudioContext", FakeAudioContext);
  });
  afterAll(() => {
    Reflect.deleteProperty(globalThis, "AudioContext");
  });

  beforeEach(() => {
    sessionStorage.clear();
    // As after a reload: no tap has started the sound.
    quietAlarm();
  });

  const cook = () =>
    render(
      <CookMode
        recipeId={RECIPE_ID}
        lines={lines}
        steps={steps}
        yieldServings={4}
        initialServings={4}
        addToList={null}
      />,
    );

  it("runs a step's timer from its button, and stops it", async () => {
    const user = userEvent.setup();
    const view = cook();

    await user.click(
      view.getByRole("button", { name: "Start 20-minute timer" }),
    );
    expect(view.getByRole("timer").textContent).toMatch(/^(20:00|19:5\d)$/);
    expect(isAlarmPrimed()).toBe(true);
    expect(view.queryByText("Tap anywhere to turn its sound back on.")).toBe(
      null,
    );

    await user.click(view.getByRole("button", { name: /Stop/ }));
    view.getByRole("button", { name: "Start 20-minute timer" });
  });

  // P14.4: phones reload a page you've switched away from. What you'd done comes back, and a
  // timer that comes back has no sound until a tap, which the screen says.
  it("picks up after a reload, and the next tap turns the timer's sound back on", async () => {
    const user = userEvent.setup();
    sessionStorage.setItem(
      cookProgressKey(RECIPE_ID),
      JSON.stringify({
        used: [1],
        step: 2,
        timers: { 2: Date.now() + 600_000 },
      }),
    );
    const view = cook();

    await view.findByText("Picked up where you left off.");
    expect(
      view
        .getByRole("button", { name: "1 lb ground turkey" })
        .getAttribute("aria-pressed"),
    ).toBe("true");
    expect(
      view
        .getByRole("button", { name: "Step 2, current" })
        .getAttribute("aria-pressed"),
    ).toBe("true");
    view.getByRole("timer");
    await view.findByText("Tap anywhere to turn its sound back on.");
    expect(isAlarmPrimed()).toBe(false);

    await user.click(view.getByText("Picked up where you left off."));
    expect(isAlarmPrimed()).toBe(true);
    expect(view.queryByText("Tap anywhere to turn its sound back on.")).toBe(
      null,
    );
  });

  it("keeps what's crossed off for the session", async () => {
    const user = userEvent.setup();
    const view = cook();

    await user.click(view.getByRole("button", { name: /onion/ }));
    view.unmount();
    const again = cook();
    await again.findByText("Picked up where you left off.");
    expect(
      again.getByRole("button", { name: /onion/ }).getAttribute("aria-pressed"),
    ).toBe("true");
  });
});
