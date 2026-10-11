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

/** "2h 15m" style remaining time. */
export function formatDuration(minutes: number) {
  const hours = Math.floor(minutes / 60);
  const rest = minutes % 60;
  return hours ? `${hours}h ${String(rest).padStart(2, "0")}m` : `${rest}m`;
}

export function partOfDay(minutes: number) {
  const hour = Math.floor((minutes % 1440) / 60);
  return hour < 5 ? "Night" : hour < 12 ? "Morning" : hour < 17 ? "Afternoon" : hour < 21 ? "Evening" : "Night";
}
