// Small synthesized sound kit: no audio files. Playback starts after the player's first gesture.
export type Cue =
  | "click" | "hover" | "reveal" | "stamp" | "door" | "ping" | "sting" | "type" | "search" | "open" | "close"
  | "page" | "bag" | "unlock" | "wrong" | "success" | "step" | "car"
  | "brush" | "lamp" | "swab" | "pour" | "tape" | "stir" | "scope" | "tap";

const MUTE_KEY = "redacted.muted";
const MUSIC_VOLUME_KEY = "redacted.musicVolume";
const SFX_VOLUME_KEY = "redacted.effectsVolume";
let context: AudioContext | null = null;
let master: GainNode | null = null;
/** Separate buses so the score, the rain, and the effects can be balanced against each other. */
let musicBus: GainNode | null = null;
let sfxBus: GainNode | null = null;
let rain: { source: AudioBufferSourceNode; gain: GainNode } | null = null;
let musicTimer: ReturnType<typeof setInterval> | null = null;
let nextBeatTime = 0;
let beat = 0;
/** When each cue last played, so continuous gestures (brushing, stirring) don't stack hundreds of sounds. */
const lastPlayed = new Map<Cue, number>();
let lastAnyCue = 0;

const MUSIC_LEVEL = 0.55;
const SFX_LEVEL = 1;
const RAIN_LEVEL = 0.05;
const BEAT_SECONDS = 0.62;
/** A minor noir progression: Am, F, Dm, E. Roots in A2–E3; everything else is voiced up where small speakers can play it. */
const CHORDS = [
  { root: 110, tones: [220, 261.63, 329.63] },
  { root: 87.31, tones: [174.61, 220, 261.63] },
  { root: 73.42, tones: [146.83, 174.61, 220] },
  { root: 82.41, tones: [164.81, 207.65, 246.94] },
];
/** Sparse melody over each bar: indexes into the chord's tones an octave or two up; null is a rest. */
const MELODY = [[2, null, 1, 0], [null, 2, null, 1], [0, null, 2, null], [1, 2, null, 0]];
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
  if (master) master.gain.value = muted ? 0 : 1;
  if (muted) stopAmbience();
  else startAmbience();
}

export type VolumeChannel = "music" | "effects";

/** Each channel has its own volume, 0–1, remembered per browser. Music covers the score and the rain. */
export function getVolume(channel: VolumeChannel) {
  try {
    const raw = window.localStorage.getItem(channel === "music" ? MUSIC_VOLUME_KEY : SFX_VOLUME_KEY);
    const stored = Number(raw);
    return raw !== null && Number.isFinite(stored) ? Math.min(1, Math.max(0, stored)) : 0.8;
  } catch {
    return 0.8;
  }
}

export function setVolume(channel: VolumeChannel, volume: number) {
  const level = Math.min(1, Math.max(0, volume));
  try {
    window.localStorage.setItem(channel === "music" ? MUSIC_VOLUME_KEY : SFX_VOLUME_KEY, String(level));
  } catch {
    // Volume is a convenience; keep the current level if storage is blocked.
  }
  if (channel === "music" && musicBus) musicBus.gain.value = MUSIC_LEVEL * level;
  if (channel === "effects" && sfxBus) sfxBus.gain.value = SFX_LEVEL * level;
}

function audio() {
  if (typeof window === "undefined" || isMuted()) return null;
  if (!context) {
    context = new AudioContext();
    master = context.createGain();
    master.gain.value = 1;
    musicBus = context.createGain();
    musicBus.gain.value = MUSIC_LEVEL * getVolume("music");
    sfxBus = context.createGain();
    sfxBus.gain.value = SFX_LEVEL * getVolume("effects");
    musicBus.connect(master);
    sfxBus.connect(master);
    // A limiter then make-up gain: game-loud without clipping when cues and the score overlap.
    const limiter = context.createDynamicsCompressor?.();
    if (limiter) {
      limiter.threshold.value = -14;
      limiter.knee.value = 6;
      limiter.ratio.value = 12;
      limiter.attack.value = 0.003;
      limiter.release.value = 0.2;
      const makeUp = context.createGain();
      makeUp.gain.value = 1.8;
      master.connect(limiter).connect(makeUp).connect(context.destination);
      // Development-only handle so loudness can be measured in the browser.
      if (process.env.NODE_ENV !== "production") (window as unknown as { __redactedAudio?: unknown }).__redactedAudio = { context, output: makeUp, musicBus, sfxBus };
    } else master.connect(context.destination);
  }
  if (context.state === "suspended") void context.resume();
  return context;
}

function sfx(ctx: AudioContext) {
  return sfxBus ?? master ?? ctx.destination;
}

/** One voice: an oscillator with a short attack and exponential release, sent to an effects or music bus. */
function tone(ctx: AudioContext, frequency: number, start: number, duration: number, type: OscillatorType, volume: number, endFrequency = frequency, bus?: AudioNode, attack = 0.005) {
  const oscillator = ctx.createOscillator();
  const gain = ctx.createGain();
  const at = ctx.currentTime + start;
  oscillator.type = type;
  oscillator.frequency.setValueAtTime(frequency, at);
  oscillator.frequency.exponentialRampToValueAtTime(endFrequency, at + duration);
  gain.gain.setValueAtTime(0.0001, at);
  gain.gain.exponentialRampToValueAtTime(volume, at + attack);
  gain.gain.exponentialRampToValueAtTime(0.0001, at + duration);
  oscillator.connect(gain).connect(bus ?? sfx(ctx));
  oscillator.start(at);
  oscillator.stop(at + duration + 0.02);
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
  source.connect(filter).connect(gain).connect(sfx(ctx));
  source.start(ctx.currentTime + start);
}

/** A noise rustle whose band sweeps between two frequencies: paper lifting and settling. */
function sweep(ctx: AudioContext, duration: number, from: number, to: number, volume: number, start = 0) {
  const source = ctx.createBufferSource();
  source.buffer = noise(ctx, duration);
  const filter = ctx.createBiquadFilter();
  filter.type = "bandpass";
  filter.Q.value = 1.2;
  const at = ctx.currentTime + start;
  filter.frequency.setValueAtTime(from, at);
  filter.frequency.exponentialRampToValueAtTime(to, at + duration);
  const gain = ctx.createGain();
  gain.gain.setValueAtTime(0.0001, at);
  gain.gain.exponentialRampToValueAtTime(volume, at + duration * 0.3);
  gain.gain.exponentialRampToValueAtTime(0.0001, at + duration);
  source.connect(filter).connect(gain).connect(sfx(ctx));
  source.start(at);
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
  if (cue === "hover") tone(ctx, 2200, 0, 0.03, "triangle", 0.035);
  // A soft wooden "tock": a short sine knock with a quiet overtone; no noise, so it never sounds like a snap.
  if (cue === "click") { tone(ctx, 820, 0, 0.07, "sine", 0.13, 520); tone(ctx, 1640, 0, 0.03, "triangle", 0.025, 1200); }
  if (cue === "open") { tone(ctx, 660, 0, 0.1, "triangle", 0.45); tone(ctx, 990, 0.08, 0.14, "triangle", 0.4); }
  if (cue === "close") tone(ctx, 880, 0, 0.14, "triangle", 0.4, 520);
  // Paper: a rustle that sweeps up as the sheet lifts, then a softer settle.
  if (cue === "page") { sweep(ctx, 0.26, 700, 3200, 0.55); sweep(ctx, 0.14, 2600, 1400, 0.25, 0.2); }
  if (cue === "ping") { tone(ctx, 1046, 0, 0.14, "sine", 0.5); tone(ctx, 1318, 0.1, 0.22, "sine", 0.5); }
  if (cue === "type") burst(ctx, 0.035, 3000, 0.7);
  // Investigation
  if (cue === "reveal") { tone(ctx, 587, 0, 0.2, "triangle", 0.5); tone(ctx, 880, 0.12, 0.35, "triangle", 0.5); }
  if (cue === "search") { burst(ctx, 0.16, 1600, 1); tone(ctx, 660, 0, 0.1, "triangle", 0.3, 520); }
  if (cue === "door") { burst(ctx, 0.35, 900, 1); tone(ctx, 220, 0.05, 0.3, "sawtooth", 0.25, 140); }
  if (cue === "step") { burst(ctx, 0.08, 700, 1.2, 0, "lowpass"); burst(ctx, 0.08, 650, 1, 0.22, "lowpass"); }
  if (cue === "car") { tone(ctx, 140, 0, 0.9, "sawtooth", 0.3, 220); burst(ctx, 0.9, 700, 0.7, 0, "lowpass"); }
  if (cue === "bag") { burst(ctx, 0.18, 2200, 1); tone(ctx, 440, 0.1, 0.08, "square", 0.25, 360); }
  if (cue === "unlock") { tone(ctx, 1600, 0, 0.04, "square", 0.3); tone(ctx, 1100, 0.07, 0.05, "square", 0.3); tone(ctx, 880, 0.14, 0.28, "triangle", 0.5, 1320); }
  if (cue === "wrong") { tone(ctx, 330, 0, 0.12, "square", 0.3, 300); tone(ctx, 247, 0.12, 0.22, "square", 0.3, 220); }
  if (cue === "success") { tone(ctx, 523, 0, 0.14, "triangle", 0.5); tone(ctx, 659, 0.1, 0.14, "triangle", 0.5); tone(ctx, 784, 0.2, 0.4, "triangle", 0.5); }
  if (cue === "stamp") { burst(ctx, 0.14, 400, 1.6); tone(ctx, 160, 0, 0.16, "square", 0.5, 80); }
  if (cue === "sting") { tone(ctx, 220, 0, 0.9, "sawtooth", 0.3, 208); tone(ctx, 311, 0, 0.9, "sawtooth", 0.25, 294); burst(ctx, 0.2, 500, 1.2); }
  // Lab bench tools
  if (cue === "brush") burst(ctx, 0.09, 5000, 0.5, 0, "highpass");
  if (cue === "lamp") { tone(ctx, 240, 0, 0.25, "sawtooth", 0.15); tone(ctx, 1600, 0, 0.14, "sine", 0.4, 2400); }
  if (cue === "swab") burst(ctx, 0.06, 1200, 0.6);
  if (cue === "pour") { for (let index = 0; index < 4; index++) tone(ctx, 600 + index * 160, index * 0.07, 0.07, "sine", 0.35, 1000 + index * 180); }
  if (cue === "tape") burst(ctx, 0.07, 2800, 0.8);
  if (cue === "stir") burst(ctx, 0.1, 1100, 0.8);
  if (cue === "scope") { tone(ctx, 2200, 0, 0.025, "square", 0.2); burst(ctx, 0.02, 4000, 0.4); }
  if (cue === "tap") { burst(ctx, 0.06, 900, 1, 0, "lowpass"); tone(ctx, 440, 0, 0.07, "sine", 0.35); }
}

/** A low rain loop under the whole investigation, kept beneath the score. */
export function startRain() {
  const ctx = audio();
  if (!ctx || rain) return;
  const source = ctx.createBufferSource();
  source.buffer = noise(ctx, 2);
  source.loop = true;
  const filter = ctx.createBiquadFilter();
  filter.type = "lowpass";
  filter.frequency.value = 2400;
  const gain = ctx.createGain();
  gain.gain.value = RAIN_LEVEL;
  source.connect(filter).connect(gain).connect(musicBus ?? sfx(ctx));
  source.start();
  rain = { source, gain };
}

export function stopRain() {
  rain?.source.stop();
  rain = null;
}

/**
 * A slow noir score: a warm pad and a bass on each bar, and a sparse piano-like melody above. Voiced mostly
 * between 220 and 900 Hz so laptop and phone speakers can actually play it. Notes are scheduled on the audio clock.
 */
export function startMusic() {
  const ctx = audio();
  if (!ctx || musicTimer) return;
  nextBeatTime = ctx.currentTime + 0.08;
  beat = 0;
  const bus = musicBus ?? sfx(ctx);
  const schedule = () => {
    // After a long suspend (tab hidden, no gesture yet) skip ahead instead of firing a backlog of notes.
    if (nextBeatTime < ctx.currentTime) nextBeatTime = ctx.currentTime + 0.05;
    while (nextBeatTime < ctx.currentTime + 0.8) {
      const bar = Math.floor(beat / 4) % CHORDS.length;
      const chord = CHORDS[bar];
      const step = beat % 4;
      const start = Math.max(0, nextBeatTime - ctx.currentTime);
      if (step === 0) {
        // Pad: the chord an octave up, slow swell, held for the bar.
        chord.tones.forEach((frequency) => tone(ctx, frequency * 2, start, BEAT_SECONDS * 4, "triangle", 0.09, frequency * 2, bus, 0.35));
        // Bass with overtones (sawtooth) so it is heard even where the fundamental is not.
        tone(ctx, chord.root * 2, start, BEAT_SECONDS * 1.8, "sawtooth", 0.08, chord.root * 2, bus, 0.02);
      }
      const melody = MELODY[bar][step];
      if (melody !== null) {
        // A piano-ish pluck: fundamental plus a quieter octave, fast attack, long tail.
        const frequency = chord.tones[melody] * 4;
        tone(ctx, frequency, start, 1.1, "triangle", 0.22, frequency, bus, 0.004);
        tone(ctx, frequency * 2, start, 0.5, "sine", 0.06, frequency * 2, bus, 0.004);
      }
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
