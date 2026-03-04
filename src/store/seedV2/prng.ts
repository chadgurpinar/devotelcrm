export interface SeedPrng {
  next: () => number;
  int: (minInclusive: number, maxInclusive: number) => number;
  bool: (trueProbability?: number) => boolean;
  pick: <T>(items: readonly T[]) => T;
  shuffle: <T>(items: readonly T[]) => T[];
  fork: (label: string) => SeedPrng;
  weightedPick: <T>(items: readonly T[], weightOf: (item: T) => number) => T;
}

function xmur3(input: string): () => number {
  let h = 1779033703 ^ input.length;
  for (let idx = 0; idx < input.length; idx += 1) {
    h = Math.imul(h ^ input.charCodeAt(idx), 3432918353);
    h = (h << 13) | (h >>> 19);
  }
  return () => {
    h = Math.imul(h ^ (h >>> 16), 2246822507);
    h = Math.imul(h ^ (h >>> 13), 3266489909);
    h ^= h >>> 16;
    return h >>> 0;
  };
}

function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function hashSeedKey(seedKey: string): number {
  return xmur3(seedKey)();
}

function clamp01(value: number): number {
  if (Number.isNaN(value)) return 0;
  if (value < 0) return 0;
  if (value > 1) return 1;
  return value;
}

export function createSeedPrng(seedKey: string): SeedPrng {
  const seed = hashSeedKey(seedKey);
  const nextRaw = mulberry32(seed);

  const api: SeedPrng = {
    next: () => nextRaw(),
    int: (minInclusive, maxInclusive) => {
      const min = Math.ceil(Math.min(minInclusive, maxInclusive));
      const max = Math.floor(Math.max(minInclusive, maxInclusive));
      if (min === max) return min;
      return min + Math.floor(nextRaw() * (max - min + 1));
    },
    bool: (trueProbability = 0.5) => nextRaw() < clamp01(trueProbability),
    pick: <T>(items: readonly T[]): T => {
      if (items.length === 0) {
        throw new Error("PRNG.pick called with an empty array.");
      }
      return items[Math.floor(nextRaw() * items.length)];
    },
    shuffle: <T>(items: readonly T[]): T[] => {
      const next = items.slice();
      for (let idx = next.length - 1; idx > 0; idx -= 1) {
        const swap = Math.floor(nextRaw() * (idx + 1));
        const temp = next[idx];
        next[idx] = next[swap];
        next[swap] = temp;
      }
      return next;
    },
    fork: (label: string) => createSeedPrng(`${seedKey}::${label}`),
    weightedPick: <T>(items: readonly T[], weightOf: (item: T) => number): T => {
      if (items.length === 0) {
        throw new Error("PRNG.weightedPick called with an empty array.");
      }
      const weights = items.map((item) => Math.max(0, weightOf(item)));
      const total = weights.reduce((sum, value) => sum + value, 0);
      if (total <= 0) {
        return api.pick(items);
      }
      let cursor = nextRaw() * total;
      for (let idx = 0; idx < items.length; idx += 1) {
        cursor -= weights[idx];
        if (cursor <= 0) return items[idx];
      }
      return items[items.length - 1];
    },
  };

  return api;
}
