// Clock times written in prose ("2 a.m.", "7:30 pm", "two o'clock"), so checks can catch wording that
// disagrees with the times the data holds.

const WORD_HOURS = ["twelve", "one", "two", "three", "four", "five", "six", "seven", "eight", "nine", "ten", "eleven"];
const PATTERN = /\b(\d{1,2})(?:[:.](\d{2}))?\s*([ap])\.?\s?m\b\.?|\b(\d{1,2}|twelve|one|two|three|four|five|six|seven|eight|nine|ten|eleven)\s+o'clock\b/gi;

/**
 * Clock times in a text, each with the minutes of the day it could mean ("o'clock" could be morning
 * or evening).
 */
export function clockTimesIn(text: string) {
  return [...text.matchAll(PATTERN)].map((m) => {
    const minute = m[2] ? Number(m[2]) : 0;
    if (m[3]) {
      const h = Number(m[1]) % 12;
      return { said: m[0], minutes: [(m[3].toLowerCase() === "p" ? h + 12 : h) * 60 + minute] };
    }
    const word = m[4].toLowerCase();
    const h = (/^\d+$/.test(word) ? Number(word) : WORD_HOURS.indexOf(word)) % 12;
    return { said: m[0], minutes: [h * 60, (h + 12) * 60] };
  });
}

/** Is this minute of the day within `slack` minutes of the case-time span [start, end]? */
export function nearSpan(minuteOfDay: number, start: number, end: number, slack: number) {
  const at = (t: number) => ((t % 1440) + 1440) % 1440;
  if (end - start + 2 * slack >= 1440) return true;
  const [from, to] = [at(start - slack), at(end + slack)];
  return from <= to ? minuteOfDay >= from && minuteOfDay <= to : minuteOfDay >= from || minuteOfDay <= to;
}
