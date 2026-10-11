// Texto "decodificando" (scramble) igual ao da referência: os caracteres
// corretos avançam ~1 por quadro e, à frente deles, uma cauda de 3–6
// caracteres aleatórios que trocam a cada quadro.
import { hash, randGlyph } from './rand.js';
import { FPS, fq } from './config.js';

export function decode(target, t, t0, { cps = 24, tail = 5, seed = 1, fi = 0, minTail = 2 } = {}) {
  const el = fq(t) - t0;
  if (el < 0) return { text: '', k: 0, done: false, visible: false };
  const len = target.length;
  const k = Math.min(len, Math.floor(el * cps));
  const framesIn = Math.floor(el * FPS);
  // a cauda cresce nos primeiros quadros ("D6" -> "COPO" -> "VERTO"...)
  const tl = Math.min(tail, minTail + framesIn * 2, len - k);
  let s = target.slice(0, k);
  for (let i = 0; i < tl; i++) {
    const idx = k + i;
    const ch = target[idx];
    if (ch === ' ' && hash(seed, idx, fi, 7) < 0.55) s += ' ';
    else s += randGlyph(seed, idx, fi);
  }
  return { text: s, k, done: k >= len, visible: true };
}

// Saída por scramble: os caracteres viram lixo e somem do fim para o começo.
export function undecode(target, t, t0, { cps = 40, seed = 1, fi = 0 } = {}) {
  const el = fq(t) - t0;
  if (el < 0) return target;
  const len = target.length;
  const gone = Math.floor(el * cps);
  const keep = Math.max(0, len - gone);
  let s = '';
  for (let i = 0; i < keep; i++) {
    const noisy = i >= keep - 4 || hash(seed, i, fi, 3) < Math.min(0.9, el * 4);
    s += noisy && target[i] !== ' ' ? randGlyph(seed, i, fi, 5) : target[i];
  }
  return s;
}

export function setFont(ctx, font, size, weight = '', style = '') {
  ctx.font = `${style} ${weight} ${size}px ${font}`.trim().replace(/\s+/g, ' ');
}

// Mede a largura de uma string com letter-spacing.
export function measure(ctx, str, ls = 0) {
  ctx.letterSpacing = `${ls}px`;
  return ctx.measureText(str).width;
}

// Desenha texto com segmentos coloridos. segs = [{text, color}], posição = baseline.
export function drawSegs(ctx, segs, x, y, { ls = 0, align = 'left', shadow = null, glow = null } = {}) {
  ctx.letterSpacing = `${ls}px`;
  const widths = segs.map((s) => ctx.measureText(s.text).width);
  const total = widths.reduce((a, b) => a + b, 0) - (segs.length ? 0 : 0);
  let cx = align === 'center' ? x - total / 2 : align === 'right' ? x - total : x;
  const x0 = cx;
  for (let i = 0; i < segs.length; i++) {
    const s = segs[i];
    if (!s.text) continue;
    ctx.save();
    if (shadow) {
      ctx.shadowColor = shadow.color; ctx.shadowBlur = shadow.blur;
      ctx.shadowOffsetX = shadow.x; ctx.shadowOffsetY = shadow.y;
    }
    ctx.fillStyle = s.color;
    ctx.fillText(s.text, cx, y);
    if (glow || s.glow) {
      const g = s.glow || glow;
      ctx.shadowColor = g.color; ctx.shadowBlur = g.blur; ctx.shadowOffsetX = 0; ctx.shadowOffsetY = 0;
      ctx.globalAlpha *= g.alpha ?? 0.6;
      ctx.fillText(s.text, cx, y);
    }
    ctx.restore();
    cx += widths[i];
  }
  return { x0, width: total };
}

// Divide uma string decodificada em segmentos coloridos por faixas de índice.
// ranges = [[startIdx, endIdx, color], ...] ; default = cor padrão.
export function colorize(str, ranges, def) {
  const segs = [];
  let cur = null;
  for (let i = 0; i < str.length; i++) {
    let c = def;
    for (const [a, b, col] of ranges) if (i >= a && i < b) c = col;
    if (!cur || cur.color !== c) { cur = { text: '', color: c }; segs.push(cur); }
    cur.text += str[i];
  }
  return segs;
}
