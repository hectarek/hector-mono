// A step timer's alarm: three rounds of three beeps, and a buzz where the phone supports it
// (not iPhone).
let context: AudioContext | null = null;
// Whether a tap has started the sound since the page loaded or last went quiet.
let primed = false;

type WithAudioSession = Navigator & { audioSession?: { type: string } };

// Called from a tap: the one that starts a timer, or after a reload the first tap anywhere
// while timers run. iOS lets a page make sound only once a tap has started its audio, and a
// context resumed later, outside a tap, may never start. So the context is made here and kept
// running until the last timer stops.
export function primeAlarm(): void {
  try {
    // Safari plays Web Audio as ambient sound, which the silent switch mutes; a kitchen timer
    // should ring like the Clock app's. Set before the context exists, or it doesn't apply.
    // Playback doesn't mix, so music from another app pauses while a timer runs.
    const session = (navigator as WithAudioSession).audioSession;
    if (session) session.type = "playback";
    context ??= new AudioContext();
    void context.resume();
    primed = true;
  } catch {
    // No Web Audio: the timer still shows it's done.
  }
}

export function ringAlarm(): void {
  // Browsers refuse (and log) a buzz before the page has had a tap, as after a reload.
  if (navigator.userActivation?.hasBeenActive) {
    navigator.vibrate?.([300, 150, 300, 150, 300]);
  }
  if (!context) return;
  // A call or a trip to Control Center "interrupts" the context; asking costs nothing.
  if (context.state !== "running") void context.resume();
  for (const round of [0, 1.6, 3.2]) {
    for (const start of [0, 0.4, 0.8]) {
      const beep = context.createOscillator();
      const volume = context.createGain();
      beep.frequency.value = 880;
      volume.gain.value = 0.5;
      beep.connect(volume).connect(context.destination);
      beep.start(context.currentTime + round + start);
      beep.stop(context.currentTime + round + start + 0.25);
    }
  }
}

// When the last timer is stopped, so the page stops holding the phone's audio and any beeps
// still to come are cut (with another timer running, they play out). The next timer's tap
// resumes it.
export function quietAlarm(): void {
  void context?.suspend();
  primed = false;
}

// Whether a timer ending now would make a sound. After a reload it won't until the next tap,
// since iOS starts a page's audio only from one.
export function isAlarmPrimed(): boolean {
  return primed;
}
