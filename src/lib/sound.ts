// Small synthesized sound kit: no audio files, nothing plays until the player has interacted.
type Cue = "click" | "reveal" | "stamp" | "door" | "ping" | "sting" | "type";

const MUTE_KEY = "redacted.muted";
const VOLUME_KEY = "redacted.volume";
let context: AudioContext | null = null;
let master: GainNode | null = null;
let rain: { source: AudioBufferSourceNode; gain: GainNode } | null = null;

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
  if (muted) stopRain();
  else startRain();
}

export function getVolume() {
  try {
    const stored = Number(window.localStorage.getItem(VOLUME_KEY));
    return Number.isFinite(stored) && window.localStorage.getItem(VOLUME_KEY) !== null ? Math.min(1, Math.max(0, stored)) : 0.7;
  } catch {
    return 0.7;
  }
}

export function setVolume(volume: number) {
  try {
    window.localStorage.setItem(VOLUME_KEY, String(volume));
  } catch {
    // Volume is a convenience; keep the current level if storage is blocked.
  }
  if (master) master.gain.value = volume;
}

function audio() {
  if (typeof window === "undefined" || isMuted()) return null;
  if (!context) {
    context = new AudioContext();
    master = context.createGain();
    master.gain.value = getVolume();
    master.connect(context.destination);
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

function burst(ctx: AudioContext, duration: number, frequency: number, volume: number) {
  const source = ctx.createBufferSource();
  source.buffer = noise(ctx, duration);
  const filter = ctx.createBiquadFilter();
  filter.type = "bandpass";
  filter.frequency.value = frequency;
  const gain = ctx.createGain();
  gain.gain.setValueAtTime(volume, ctx.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + duration);
  source.connect(filter).connect(gain).connect(out(ctx));
  source.start();
}

export function play(cue: Cue) {
  const ctx = audio();
  if (!ctx) return;
  if (cue === "click") tone(ctx, 880, 0, 0.04, "square", 0.03);
  if (cue === "type") burst(ctx, 0.03, 3000, 0.08);
  if (cue === "reveal") { tone(ctx, 392, 0, 0.18, "triangle", 0.08); tone(ctx, 587, 0.12, 0.3, "triangle", 0.08); }
  if (cue === "stamp") { burst(ctx, 0.12, 180, 0.6); tone(ctx, 90, 0, 0.15, "sine", 0.3, 50); }
  if (cue === "door") { burst(ctx, 0.35, 600, 0.12); tone(ctx, 140, 0.05, 0.3, "sawtooth", 0.02, 90); }
  if (cue === "ping") { tone(ctx, 1046, 0, 0.12, "sine", 0.07); tone(ctx, 1318, 0.1, 0.2, "sine", 0.07); }
  if (cue === "sting") { tone(ctx, 110, 0, 0.9, "sawtooth", 0.06, 104); tone(ctx, 155, 0, 0.9, "sawtooth", 0.05, 147); burst(ctx, 0.2, 200, 0.4); }
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
  filter.frequency.value = 900;
  const gain = ctx.createGain();
  gain.gain.value = 0.025;
  source.connect(filter).connect(gain).connect(out(ctx));
  source.start();
  rain = { source, gain };
}

export function stopRain() {
  rain?.source.stop();
  rain = null;
}
