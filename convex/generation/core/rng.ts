/**
 * Seeded random number generator (mulberry32). Same seed gives the same sequence.
 *
 * @param seed - Integer seed
 * @returns Helpers for deterministic random choices.
 */
export function createRng(seed: number) {
  let state = seed >>> 0;

  function next() {
    state = (state + 0x6d2b79f5) >>> 0;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  }

  return {
    /** Float in [0, 1). */
    next,
    /** Integer in [min, max], inclusive. */
    int(min: number, max: number) {
      return min + Math.floor(next() * (max - min + 1));
    },
    /** One random element of a non-empty list. */
    pick<T>(items: readonly T[]) {
      if (items.length === 0) throw new Error("pick() on empty list");
      return items[Math.floor(next() * items.length)];
    },
    /** Shuffled copy of a list. */
    shuffle<T>(items: readonly T[]) {
      const copy = [...items];
      for (let i = copy.length - 1; i > 0; i--) {
        const j = Math.floor(next() * (i + 1));
        [copy[i], copy[j]] = [copy[j], copy[i]];
      }
      return copy;
    },
  };
}

export type Rng = ReturnType<typeof createRng>;
