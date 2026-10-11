// Small synthesized sound kit: no audio files. Playback starts after the player's first gesture.
export type Cue =
  | "click" | "hover" | "reveal" | "stamp" | "door" | "ping" | "sting" | "type" | "search" | "open" | "close"
  | "page" | "bag" | "unlock" | "wrong" | "success" | "step" | "car"
  | "brush" | "lamp" | "swab" | "pour" | "tape" | "stir" | "scope" | "tap";

const MUTE_KEY = "redacted.muted";
const VOLUME_KEY = "redacted.volume";
let context: AudioContext | null = null;
let master: GainNode | null = null;
let rain: { source: AudioBufferSourceNode; gain: GainNode } | null = null;
let musicTimer: ReturnType<typeof setInterval> | null = null;
let nextBeatTime = 0;
let beat = 0;
/** When each cue last played, so continuous gestures (brushing, stirring) don't stack hundreds of sounds. */
const lastPlayed = new Map<Cue, number>();
let lastAnyCue = 0;

const BEAT_SECONDS = 0.72;
const ROOTS = [110, 87.31, 73.42, 82.41];
const MINOR_THIRD = 2 ** (3 / 12);
const FIFTH = 2 ** (7 / 12);
/** Minimum gap between repeats of a cue, in ms. Scrubbing tools repeat as a texture, not a buzz. */
const REPEAT_GAP: Partial<Record<Cue, number>> = { hover: 70, brush: 110, stir: 120, tape: 90, swab: 140, type: 60, step: 120 };

export function isMuted() {
  try {
    return window.localStorage.getItem(MUTE_KEY) === "1";
  } catch {
    return false;
  }
}

export function setMuted(muted: boolean) {
  try {
    window.localStorage.setItem(MUTE_KEY, muted ? "1" : "0");
  } catch {
    // Sound preference is a convenience; ignore storage failures.
  }
  if (master) master.gain.value = muted ? 0 : getVolume();
  if (muted) stopAmbience();
  else startAmbience();
}

export function getVolume() {
  try {
    const stored = Number(window.localStorage.getItem(VOLUME_KEY));
    return Number.isFinite(stored) && window.localStorage.getItem(VOLUME_KEY) !== null ? Math.min(1, Math.max(0, stored)) : 0.8;
  } catch {
    return 0.8;
  }
}

export function setVolume(volume: number) {
  const level = Math.min(1, Math.max(0, volume));
  try {
    window.localStorage.setItem(VOLUME_KEY, String(level));
  } catch {
    // Volume is a convenience; keep the current level if storage is blocked.
  }
  if (master) master.gain.value = level;
}

function audio() {
  if (typeof window === "undefined" || isMuted()) return null;
  if (!context) {
    context = new AudioContext();
    master = context.createGain();
    master.gain.value = getVolume();
    // A gentle limiter keeps layered cues and the score from clipping now that levels are game-loud.
    const limiter = context.createDynamicsCompressor?.();
    if (limiter) {
      limiter.threshold.value = -10;
      limiter.ratio.value = 8;
      master.connect(limiter).connect(context.destination);
    } else master.connect(context.destination);
  }
  if (context.state === "suspended") void context.resume();
  return context;
}

function out(ctx: AudioContext) {
  return master ?? ctx.destination;
}

function tone(ctx: AudioContext, frequency: number, start: number, duration: number, type: OscillatorType, volume: number, endFrequency = frequency) {
  const oscillator = ctx.createOscillator();
  const gain = ctx.createGain();
  oscillator.type = type;
  oscillator.frequency.setValueAtTime(frequency, ctx.currentTime + start);
  oscillator.frequency.exponentialRampToValueAtTime(endFrequency, ctx.currentTime + start + duration);
  gain.gain.setValueAtTime(volume, ctx.currentTime + start);
  gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + start + duration);
  oscillator.connect(gain).connect(out(ctx));
  oscillator.start(ctx.currentTime + start);
  oscillator.stop(ctx.currentTime + start + duration + 0.02);
}

function noise(ctx: AudioContext, seconds: number) {
  const buffer = ctx.createBuffer(1, Math.floor(ctx.sampleRate * seconds), ctx.sampleRate);
  const data = buffer.getChannelData(0);
  for (let index = 0; index < data.length; index++) data[index] = Math.random() * 2 - 1;
  return buffer;
}

/** A filtered noise hit: swishes, scrapes, rips, and thumps. */
function burst(ctx: AudioContext, duration: number, frequency: number, volume: number, start = 0, type: BiquadFilterType = "bandpass") {
  const source = ctx.createBufferSource();
  source.buffer = noise(ctx, duration);
  const filter = ctx.createBiquadFilter();
  filter.type = type;
  filter.frequency.value = frequency;
  const gain = ctx.createGain();
  gain.gain.setValueAtTime(volume, ctx.currentTime + start);
  gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + start + duration);
  source.connect(filter).connect(gain).connect(out(ctx));
  source.start(ctx.currentTime + start);
}

/** Time since any cue last played, so a generic button click can stay quiet when a specific cue already answered. */
export function msSinceLastCue() {
  return performance.now() - lastAnyCue;
}

export function play(cue: Cue) {
  const now = typeof performance === "undefined" ? 0 : performance.now();
  if (now - (lastPlayed.get(cue) ?? -Infinity) < (REPEAT_GAP[cue] ?? 40)) return;
  const ctx = audio();
  if (!ctx) return;
  lastPlayed.set(cue, now);
  if (cue !== "hover") lastAnyCue = now;
  // Interface
  if (cue === "hover") tone(ctx, 1760, 0, 0.025, "triangle", 0.04);
  if (cue === "click") { tone(ctx, 1200, 0, 0.035, "square", 0.08, 900); burst(ctx, 0.02, 3500, 0.12); }
  if (cue === "open") { tone(ctx, 440, 0, 0.09, "triangle", 0.2); tone(ctx, 660, 0.08, 0.13, "triangle", 0.16); }
  if (cue === "close") tone(ctx, 440, 0, 0.12, "triangle", 0.18, 260);
  if (cue === "page") { burst(ctx, 0.18, 2400, 0.35, 0, "highpass"); burst(ctx, 0.08, 1200, 0.2, 0.1); }
  if (cue === "ping") { tone(ctx, 1046, 0, 0.12, "sine", 0.25); tone(ctx, 1318, 0.1, 0.2, "sine", 0.25); }
  if (cue === "type") burst(ctx, 0.03, 3000, 0.3);
  // Investigation
  if (cue === "reveal") { tone(ctx, 392, 0, 0.18, "triangle", 0.28); tone(ctx, 587, 0.12, 0.3, "triangle", 0.28); }
  if (cue === "search") { burst(ctx, 0.14, 1400, 0.45); tone(ctx, 330, 0, 0.09, "triangle", 0.12, 280); }
  if (cue === "door") { burst(ctx, 0.35, 600, 0.45); tone(ctx, 140, 0.05, 0.3, "sawtooth", 0.08, 90); }
  if (cue === "step") { burst(ctx, 0.07, 300, 0.5, 0, "lowpass"); burst(ctx, 0.07, 280, 0.4, 0.22, "lowpass"); }
  if (cue === "car") { tone(ctx, 70, 0, 0.9, "sawtooth", 0.12, 110); burst(ctx, 0.9, 400, 0.25, 0, "lowpass"); }
  if (cue === "bag") { burst(ctx, 0.16, 1800, 0.4); tone(ctx, 220, 0.1, 0.08, "square", 0.1, 180); }
  if (cue === "unlock") { tone(ctx, 1500, 0, 0.04, "square", 0.12); tone(ctx, 1000, 0.07, 0.05, "square", 0.12); tone(ctx, 880, 0.14, 0.25, "triangle", 0.2, 1320); }
  if (cue === "wrong") { tone(ctx, 220, 0, 0.12, "square", 0.12, 200); tone(ctx, 165, 0.12, 0.2, "square", 0.12, 150); }
  if (cue === "success") { tone(ctx, 523, 0, 0.14, "triangle", 0.25); tone(ctx, 659, 0.1, 0.14, "triangle", 0.25); tone(ctx, 784, 0.2, 0.35, "triangle", 0.25); }
  if (cue === "stamp") { burst(ctx, 0.12, 180, 1.2); tone(ctx, 90, 0, 0.15, "sine", 0.7, 50); }
  if (cue === "sting") { tone(ctx, 110, 0, 0.9, "sawtooth", 0.18, 104); tone(ctx, 155, 0, 0.9, "sawtooth", 0.15, 147); burst(ctx, 0.2, 200, 0.8); }
  // Lab bench tools
  if (cue === "brush") burst(ctx, 0.09, 5000, 0.18, 0, "highpass");
  if (cue === "lamp") { tone(ctx, 120, 0, 0.25, "sawtooth", 0.06); tone(ctx, 1600, 0, 0.12, "sine", 0.15, 2400); }
  if (cue === "swab") burst(ctx, 0.06, 900, 0.22);
  if (cue === "pour") { for (let index = 0; index < 4; index++) tone(ctx, 500 + index * 140, index * 0.07, 0.06, "sine", 0.14, 900 + index * 160); }
  if (cue === "tape") burst(ctx, 0.07, 2600, 0.3);
  if (cue === "stir") burst(ctx, 0.1, 700, 0.3);
  if (cue === "scope") { tone(ctx, 2200, 0, 0.02, "square", 0.08); burst(ctx, 0.02, 4000, 0.15); }
  if (cue === "tap") { burst(ctx, 0.05, 500, 0.4, 0, "lowpass"); tone(ctx, 240, 0, 0.06, "sine", 0.15); }
}

/** A low rain loop under the whole investigation. */
export function startRain() {
  const ctx = audio();
  if (!ctx || rain) return;
  const source = ctx.createBufferSource();
  source.buffer = noise(ctx, 2);
  source.loop = true;
  const filter = ctx.createBiquadFilter();
  filter.type = "lowpass";
  filter.frequency.value = 1600;
  const gain = ctx.createGain();
  gain.gain.value = 0.09;
  source.connect(filter).connect(gain).connect(out(ctx));
  source.start();
  rain = { source, gain };
}

export function stopRain() {
  rain?.source.stop();
  rain = null;
}

/** Quiet four-chord pulse beneath the rain; all notes are scheduled on the audio clock. */
export function startMusic() {
  const ctx = audio();
  if (!ctx || musicTimer) return;
  nextBeatTime = ctx.currentTime + 0.08;
  beat = 0;
  const schedule = () => {
    // After a long suspend (tab hidden, no gesture yet) skip ahead instead of firing a backlog of notes.
    if (nextBeatTime < ctx.currentTime) nextBeatTime = ctx.currentTime + 0.05;
    while (nextBeatTime < ctx.currentTime + 0.8) {
      const root = ROOTS[Math.floor(beat / 4) % ROOTS.length];
      const start = Math.max(0, nextBeatTime - ctx.currentTime);
      const notes = [root * 2, root * 2 * MINOR_THIRD, root * 2 * FIFTH];
      if (beat % 4 === 0) {
        notes.forEach((frequency) => tone(ctx, frequency, start, BEAT_SECONDS * 3.7, "sine", 0.07));
        tone(ctx, root, start, BEAT_SECONDS * 1.5, "triangle", 0.16);
      }
      tone(ctx, notes[[0, 2, 1, 2][beat % 4]], start, 0.18, "triangle", 0.07);
      nextBeatTime += BEAT_SECONDS;
      beat++;
    }
  };
  schedule();
  musicTimer = setInterval(schedule, 200);
}

export function stopMusic() {
  if (musicTimer) clearInterval(musicTimer);
  musicTimer = null;
}

export function startAmbience() {
  startRain();
  startMusic();
}

export function stopAmbience() {
  stopRain();
  stopMusic();
}

const INTERACTIVE = "button:not(:disabled), a[href], [role='button'], [role='tab'], summary, input[type='range']";

/**
 * Every control answers the player: a soft tick on mouse hover, and a click when pressed if no more specific
 * cue (door, page, stamp) already played for that press. Installed once by the game shell.
 */
export function installUiSounds() {
  let hovered: Element | null = null;
  const onOver = (event: PointerEvent) => {
    if (event.pointerType !== "mouse") return;
    const target = (event.target as Element | null)?.closest?.(INTERACTIVE) ?? null;
    if (target && target !== hovered) play("hover");
    hovered = target;
  };
  // Runs after React's own handlers (registered first on the document), so their cue wins.
  const onClick = (event: MouseEvent) => {
    if ((event.target as Element | null)?.closest?.(INTERACTIVE) && msSinceLastCue() > 60) play("click");
  };
  document.addEventListener("pointerover", onOver);
  document.addEventListener("click", onClick);
  return () => {
    document.removeEventListener("pointerover", onOver);
    document.removeEventListener("click", onClick);
  };
}
