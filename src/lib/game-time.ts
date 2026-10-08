export type SharedClock = { gameTime: number; clockStartedAt: number | null; minuteMs: number };

export function currentGameMinute(clock: SharedClock, now: number) {
  return clock.gameTime + (clock.clockStartedAt === null
    ? 0
    : Math.max(0, Math.floor((now - clock.clockStartedAt) / clock.minuteMs)));
}

export function formatGameMinute(minutes: number) {
  const day = Math.floor(minutes / 1440) + 1;
  const withinDay = minutes % 1440;
  return `Day ${day} · ${String(Math.floor(withinDay / 60)).padStart(2, "0")}:${String(withinDay % 60).padStart(2, "0")}`;
}
