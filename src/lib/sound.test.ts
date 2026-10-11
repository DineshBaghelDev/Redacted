import { afterEach, expect, test, vi } from "vitest";
import { startMusic, stopMusic } from "./sound";

afterEach(() => { stopMusic(); vi.useRealTimers(); vi.unstubAllGlobals(); });

test("schedules a repeating score and stops scheduling when asked", () => {
  vi.useFakeTimers();
  vi.setSystemTime(0);
  let notes = 0;
  const param = () => ({ value: 0, setValueAtTime() {}, exponentialRampToValueAtTime() {} });
  const node = () => ({ connect() { return this; }, start() {}, stop() {} });
  class FakeAudioContext {
    get currentTime() { return Date.now() / 1000; }
    destination = node();
    state = "running";
    createGain() { return { ...node(), gain: param() }; }
    createOscillator() { notes++; return { ...node(), frequency: param(), type: "sine" }; }
  }
  vi.stubGlobal("window", { localStorage: { getItem: () => null } });
  vi.stubGlobal("AudioContext", FakeAudioContext);

  startMusic();
  expect(notes).toBeGreaterThan(0);
  const opening = notes;
  vi.advanceTimersByTime(2000);
  expect(notes).toBeGreaterThan(opening);
  stopMusic();
  const stopped = notes;
  vi.advanceTimersByTime(2000);
  expect(notes).toBe(stopped);
});
