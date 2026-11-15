// A tiny seeded random generator (mulberry32), so a ?seed=N run of the game
// always plays the same way: the screenshot scenes are reproducible, and a
// player who shares a seed shares the same day.
export function createRandom(seed) {
  let a = seed >>> 0;
  return {
    next() {
      a |= 0;
      a = (a + 0x6d2b79f5) | 0;
      let t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    },
    // A float in [min, max).
    range(min, max) {
      return min + this.next() * (max - min);
    },
    // An integer in [min, max].
    int(min, max) {
      return min + Math.floor(this.next() * (max - min + 1));
    },
    // Pick one entry from an array.
    pick(list) {
      return list[Math.floor(this.next() * list.length)];
    },
  };
}
