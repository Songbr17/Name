// Aleatoriedade determinística (mesma saída em todo render) e ruído suave.

export function mulberry32(seed) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// Hash inteiro -> [0,1)
export function hash(...ns) {
  let h = 2166136261 >>> 0;
  for (const n of ns) {
    let k = Math.floor(n) | 0;
    h ^= k; h = Math.imul(h, 16777619);
    h ^= h >>> 13; h = Math.imul(h, 0x5bd1e995); h ^= h >>> 15;
  }
  return (h >>> 0) / 4294967296;
}

// Ruído de valor 1D suave (interpolação quíntica), saída em [-1, 1].
export function noise1(x, seed = 0) {
  const i = Math.floor(x), f = x - i;
  const u = f * f * f * (f * (f * 6 - 15) + 10);
  const a = hash(i, seed) * 2 - 1, b = hash(i + 1, seed) * 2 - 1;
  return a + (b - a) * u;
}

// fBm de 1D — usado para "câmera na mão" bem sutil e cintilações de luz.
export function fbm1(x, seed = 0, oct = 3) {
  let s = 0, amp = 0.5, f = 1, norm = 0;
  for (let o = 0; o < oct; o++) { s += amp * noise1(x * f, seed + o * 31); norm += amp; amp *= 0.5; f *= 2.03; }
  return s / norm;
}

const GLYPHS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789#$%&*+<>?/=@';
export function randGlyph(...seed) {
  return GLYPHS[Math.floor(hash(...seed) * GLYPHS.length)];
}
