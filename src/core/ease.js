// Curvas de animação. A ideia é imitar o "Easy Ease" do After Effects com
// influência alta (movimento que acelera e freia de forma orgânica) e usar
// molas amortecidas para objetos físicos (porta, crachá, maço de dinheiro).

export const clamp = (x, a = 0, b = 1) => Math.min(b, Math.max(a, x));
export const lerp = (a, b, t) => a + (b - a) * t;
export const invLerp = (a, b, x) => (b === a ? 0 : (x - a) / (b - a));
export const smoothstep = (a, b, x) => { const t = clamp(invLerp(a, b, x)); return t * t * (3 - 2 * t); };

// cubic-bezier igual ao CSS / AE (x1, y1, x2, y2).
export function bezier(x1, y1, x2, y2) {
  const cx = 3 * x1, bx = 3 * (x2 - x1) - cx, ax = 1 - cx - bx;
  const cy = 3 * y1, by = 3 * (y2 - y1) - cy, ay = 1 - cy - by;
  const sx = (t) => ((ax * t + bx) * t + cx) * t;
  const sy = (t) => ((ay * t + by) * t + cy) * t;
  const dx = (t) => (3 * ax * t + 2 * bx) * t + cx;
  return (x) => {
    if (x <= 0) return 0;
    if (x >= 1) return 1;
    let t = x;
    for (let i = 0; i < 8; i++) {
      const e = sx(t) - x;
      if (Math.abs(e) < 1e-6) break;
      const d = dx(t);
      if (Math.abs(d) < 1e-6) break;
      t -= e / d;
    }
    // fallback por bisseção caso Newton não convirja
    if (Math.abs(sx(t) - x) > 1e-4) {
      let lo = 0, hi = 1; t = x;
      for (let i = 0; i < 30; i++) { if (sx(t) < x) lo = t; else hi = t; t = (lo + hi) / 2; }
    }
    return sy(t);
  };
}

export const E = {
  linear: (x) => x,
  inOut: bezier(0.33, 0, 0.67, 1),        // easy ease padrão
  inOutStrong: bezier(0.75, 0, 0.25, 1),  // easy ease com influência ~75%
  inOutSoft: bezier(0.45, 0, 0.35, 1),
  out: bezier(0.2, 0.8, 0.3, 1),
  outExpo: bezier(0.16, 1, 0.3, 1),
  outQuart: bezier(0.25, 1, 0.5, 1),
  outSoft: bezier(0.3, 0.6, 0.4, 1),
  in: bezier(0.55, 0, 0.9, 0.4),
  inQuad: bezier(0.5, 0, 0.75, 0),
  inExpo: bezier(0.7, 0, 0.84, 0),
  outBack: (x) => { const c1 = 1.15, c3 = c1 + 1; return 1 + c3 * Math.pow(x - 1, 3) + c1 * Math.pow(x - 1, 2); },
};

// Progresso 0..1 entre t0 e t1 com easing.
export const tw = (t, t0, t1, ease = E.inOut) => ease(clamp(invLerp(t0, t1, t)));

// Resposta de uma mola (massa-mola-amortecedor) a um degrau, começando em t0.
// zeta < 1 = sub-amortecida (pequeno overshoot), freq em Hz.
export function spring(t, t0, freq = 2.2, zeta = 0.55) {
  if (t <= t0) return 0;
  const x = t - t0;
  const w = 2 * Math.PI * freq;
  if (zeta >= 1) return 1 - Math.exp(-w * x) * (1 + w * x);
  const wd = w * Math.sqrt(1 - zeta * zeta);
  return 1 - Math.exp(-zeta * w * x) * (Math.cos(wd * x) + (zeta * w / wd) * Math.sin(wd * x));
}

// Oscilação amortecida que começa com velocidade (impulso) em t0 — útil para balanço.
export function dampedSine(t, t0, freq = 0.8, decay = 1.2, phase = 0) {
  if (t <= t0) return Math.sin(phase);
  const x = t - t0;
  return Math.exp(-decay * x) * Math.sin(2 * Math.PI * freq * x + phase);
}

// Interpolação por keyframes: kf(t, [[t0, v0], [t1, v1, ease], ...]).
// O easing de cada par é o do keyframe de destino (padrão inOut).
export function kf(t, keys) {
  if (t <= keys[0][0]) return keys[0][1];
  for (let i = 1; i < keys.length; i++) {
    const [t1, v1, ease = E.inOut] = keys[i];
    const [t0, v0] = keys[i - 1];
    if (t <= t1) {
      const p = ease(clamp(invLerp(t0, t1, t)));
      if (Array.isArray(v0)) return v0.map((a, j) => lerp(a, v1[j], p));
      return lerp(v0, v1, p);
    }
  }
  return keys[keys.length - 1][1];
}

// Envelope de opacidade: sobe entre a0..a1 e desce entre b0..b1.
export function env(t, a0, a1, b0 = Infinity, b1 = Infinity, easeIn = E.out, easeOut = E.inOut) {
  if (t < a0 || t > b1) return 0;
  const up = a1 > a0 ? easeIn(clamp(invLerp(a0, a1, t))) : 1;
  const down = b1 > b0 ? 1 - easeOut(clamp(invLerp(b0, b1, t))) : (t > b0 ? 0 : 1);
  return Math.min(up, down);
}
