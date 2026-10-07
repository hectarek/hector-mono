import {
  afterAll,
  beforeAll,
  beforeEach,
  describe,
  expect,
  it,
} from "bun:test";
import { render, within } from "@testing-library/react";
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
        title="Chili"
        recipeHref={`/recipes/${RECIPE_ID}`}
        lines={lines}
        steps={steps}
        yieldServings={4}
        initialServings={4}
        addToList={null}
      />,
    );
  const button = (view: ReturnType<typeof cook>, name: string | RegExp) =>
    view.getByRole("button", { name });
  const pressed = (view: ReturnType<typeof cook>, name: string | RegExp) =>
    button(view, name).getAttribute("aria-pressed");
  const save = (progress: object) =>
    sessionStorage.setItem(
      cookProgressKey(RECIPE_ID),
      JSON.stringify(progress),
    );

  // D63: Gather, each step, then Done, with Back and Next.
  it("goes from Gather through each step to Done, and back", async () => {
    const user = userEvent.setup();
    const view = cook();
    view.getByRole("heading", { name: "Ingredients" });

    await user.click(button(view, "Start cooking"));
    view.getByText("Step 1 of 2");
    view.getByText("Brown the turkey.");
    expect(view.queryByRole("heading", { name: "Ingredients" })).toBe(null);

    await user.click(button(view, "Next"));
    view.getByText("Step 2 of 2");
    view.getByText("Simmer for 20 minutes.");

    await user.click(button(view, "Finish"));
    view.getByRole("heading", { name: "That's the last step" });
    expect(
      view
        .getByRole("button", { name: "Back to the recipe" })
        .closest("a")
        ?.getAttribute("href"),
    ).toBe(`/recipes/${RECIPE_ID}`);

    await user.click(button(view, "Back"));
    view.getByText("Step 2 of 2");
    await user.click(button(view, "Back"));
    await user.click(button(view, "Back"));
    view.getByRole("heading", { name: "Ingredients" });
  });

  // D65: one set of ticks, under a step or on Gather.
  it("shows a step's ingredients, ticked as on Gather", async () => {
    const user = userEvent.setup();
    const view = cook();
    await user.click(button(view, "Start cooking"));

    const uses = view.getByRole("heading", { name: "This step uses" });
    expect(uses.nextElementSibling?.textContent).toBe("1 lb ground turkey");
    await user.click(button(view, "1 lb ground turkey"));
    await user.click(button(view, "Back"));
    expect(pressed(view, "1 lb ground turkey")).toBe("true");
    expect(pressed(view, /onion/)).toBe("false");
  });

  // D64: from a step, the whole list in a sheet, with the same ticks and servings.
  it("opens every ingredient from a step, with the same ticks and servings", async () => {
    const user = userEvent.setup();
    const view = cook();
    await user.click(button(view, "Start cooking"));

    await user.click(button(view, "All ingredients"));
    const sheet = await view.findByRole("dialog", { name: "Ingredients" });
    await user.click(within(sheet).getByRole("button", { name: /onion/ }));
    await user.click(
      within(sheet).getByRole("button", { name: "More servings" }),
    );
    within(sheet).getByRole("button", { name: /^1¼ lb ground turkey/ });
    await user.keyboard("{Escape}");

    view.getByText("Step 1 of 2");
    await user.click(button(view, "Back"));
    expect(pressed(view, /onion/)).toBe("true");
    view.getByRole("button", { name: /^1¼ lb ground turkey/ });
  });

  // D66: a timer follows you to other steps, and takes you back to its own.
  it("pins a running timer above other steps, and goes back to its step", async () => {
    const user = userEvent.setup();
    save({ used: [], at: 2, timers: {} });
    const view = cook();
    await view.findByText("Step 2 of 2");
    await user.click(button(view, "Start 20-minute timer"));
    expect(view.queryByRole("list", { name: "Timers" })).toBe(null);

    await user.click(button(view, "Back"));
    view.getByText("Step 1 of 2");
    const timers = view.getByRole("list", { name: "Timers" });
    expect(timers.textContent).toMatch(/^Step 2 · (20:00|19:5\d)$/);

    await user.click(within(timers).getByRole("button"));
    view.getByText("Step 2 of 2");
    view.getByRole("timer");
  });

  it("says when another step's timer is up, and dismisses it", async () => {
    const user = userEvent.setup();
    save({ used: [], at: 1, timers: { 2: Date.now() - 60_000 } });
    const view = cook();
    await view.findByText("Step 1 of 2");

    const up = await view.findByRole("alert");
    expect(up.textContent).toBe("Step 2: time's up · Dismiss");
    await user.click(up);
    expect(view.queryByRole("list", { name: "Timers" })).toBe(null);
    await user.click(button(view, "Next"));
    button(view, "Start 20-minute timer");
  });

  it("starts over from Done: nothing ticked, back on Gather", async () => {
    const user = userEvent.setup();
    const view = cook();
    await user.click(button(view, /onion/));
    await user.click(button(view, "Start cooking"));
    await user.click(button(view, "Next"));
    await user.click(button(view, "Finish"));

    await user.click(button(view, "Start over"));
    view.getByRole("heading", { name: "Ingredients" });
    expect(pressed(view, /onion/)).toBe("false");
    expect(sessionStorage.getItem(cookProgressKey(RECIPE_ID))).toBe(null);
  });

  it("runs a step's timer from its button, and stops it", async () => {
    const user = userEvent.setup();
    save({ used: [], at: 2, timers: {} });
    const view = cook();
    await view.findByText("Step 2 of 2");

    await user.click(button(view, "Start 20-minute timer"));
    expect(view.getByRole("timer").textContent).toMatch(/^(20:00|19:5\d)$/);
    expect(isAlarmPrimed()).toBe(true);
    expect(
      view.queryByText("Tap anywhere to turn the timer's sound back on."),
    ).toBe(null);

    await user.click(button(view, /Stop/));
    button(view, "Start 20-minute timer");
  });

  // P14.4: phones reload a page you've switched away from. You come back to the step you were
  // on, and a timer that comes back has no sound until a tap, which the screen says.
  it("picks up on the step you were on, and the next tap turns the timer's sound back on", async () => {
    const user = userEvent.setup();
    save({ used: [1], at: 2, timers: { 2: Date.now() + 600_000 } });
    const view = cook();

    await view.findByText("Picked up where you left off.");
    view.getByText("Step 2 of 2");
    view.getByRole("timer");
    await view.findByText("Tap anywhere to turn the timer's sound back on.");
    expect(isAlarmPrimed()).toBe(false);

    await user.click(view.getByText("Picked up where you left off."));
    expect(isAlarmPrimed()).toBe(true);
    expect(
      view.queryByText("Tap anywhere to turn the timer's sound back on."),
    ).toBe(null);
  });

  it("keeps what's crossed off for the session", async () => {
    const user = userEvent.setup();
    const view = cook();

    await user.click(button(view, /onion/));
    view.unmount();
    const again = cook();
    await again.findByText("Picked up where you left off.");
    expect(pressed(again, /onion/)).toBe("true");
  });

  // The recipe was edited since, and the saved step is gone.
  it("opens on Gather when the saved step is gone", async () => {
    save({ used: [], at: 99, timers: {} });
    const view = cook();
    await view.findByText("Picked up where you left off.");
    view.getByRole("heading", { name: "Ingredients" });
    button(view, "Start cooking");
  });
});
