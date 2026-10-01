import { afterAll, beforeAll, describe, expect, it } from "bun:test";
import {
  isAlarmPrimed,
  primeAlarm,
  quietAlarm,
  ringAlarm,
} from "@/app/_lib/alarm";

// A stand-in for the browser's Web Audio: it records what the alarm asks of it. One context
// lives for the whole page, so these run in order, as a cook would meet them.
class FakeAudioContext {
  static made: FakeAudioContext[] = [];
  state: "running" | "suspended" | "interrupted" = "suspended";
  currentTime = 10;
  destination = {};
  beeps: { frequency: number; start: number; stop: number }[] = [];
  resumes = 0;

  constructor() {
    FakeAudioContext.made.push(this);
  }

  resume() {
    this.resumes++;
    this.state = "running";
    return Promise.resolve();
  }

  suspend() {
    this.state = "suspended";
    return Promise.resolve();
  }

  createGain() {
    return {
      gain: { value: 0 },
      connect: (next: unknown) => next,
    };
  }

  createOscillator() {
    const beep = { frequency: 0, start: 0, stop: 0 };
    this.beeps.push(beep);
    return {
      frequency: {
        set value(hertz: number) {
          beep.frequency = hertz;
        },
      },
      connect: (next: unknown) => next,
      start: (at: number) => {
        beep.start = at;
      },
      stop: (at: number) => {
        beep.stop = at;
      },
    };
  }
}

const session = { type: "auto" };
const original = {
  AudioContext: Reflect.get(globalThis, "AudioContext"),
  audioSession: Reflect.get(navigator, "audioSession"),
};

beforeAll(() => {
  Reflect.set(globalThis, "AudioContext", FakeAudioContext);
  Object.defineProperty(navigator, "audioSession", {
    value: session,
    configurable: true,
  });
});

afterAll(() => {
  Reflect.set(globalThis, "AudioContext", original.AudioContext);
  Object.defineProperty(navigator, "audioSession", {
    value: original.audioSession,
    configurable: true,
  });
});

describe("the step timer's alarm", () => {
  it("has no sound before a tap primes it, as after a reload", () => {
    ringAlarm();
    expect(FakeAudioContext.made).toHaveLength(0);
    expect(isAlarmPrimed()).toBe(false);
  });

  it("is primed by a tap: sound that rings like the Clock app's, and running", () => {
    primeAlarm();
    expect(session.type).toBe("playback");
    expect(FakeAudioContext.made).toHaveLength(1);
    expect(FakeAudioContext.made[0]?.resumes).toBe(1);
    expect(FakeAudioContext.made[0]?.state).toBe("running");
    expect(isAlarmPrimed()).toBe(true);
  });

  it("rings three rounds of three beeps", () => {
    const [context] = FakeAudioContext.made;
    ringAlarm();
    expect(context?.beeps).toHaveLength(9);
    expect(context?.beeps.map((beep) => beep.start)).toEqual([
      10, 10.4, 10.8, 11.6, 12, 12.4, 13.2, 13.6, 14,
    ]);
    expect(context?.beeps.every((beep) => beep.frequency === 880)).toBe(true);
  });

  it("goes quiet when the last timer stops, and needs a tap again after", () => {
    quietAlarm();
    expect(FakeAudioContext.made[0]?.state).toBe("suspended");
    expect(isAlarmPrimed()).toBe(false);
  });

  it("asks a context that was interrupted to resume before it rings", () => {
    const [context] = FakeAudioContext.made;
    if (!context) throw new Error("No context");
    context.state = "interrupted";
    const resumes = context.resumes;
    ringAlarm();
    expect(context.resumes).toBe(resumes + 1);
  });

  it("keeps the one context for the page", () => {
    primeAlarm();
    expect(FakeAudioContext.made).toHaveLength(1);
  });
});
