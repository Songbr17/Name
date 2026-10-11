// Primitivas de UI 2D no estilo da referência (cabeçalho, cantoneiras,
// caixa de transformação com alças, callouts com linha guia, sublinhado).
import { PAL, FONTS } from './config.js';
import { E, tw, clamp, lerp, env } from './ease.js';
import { decode, setFont, drawSegs, colorize } from './text.js';
import { hash } from './rand.js';

export const SHADOW = { color: 'rgba(0,0,0,0.55)', blur: 8, x: 3, y: 4 };

export function withAlpha(ctx, a, fn) {
  if (a <= 0.001) return;
  ctx.save();
  ctx.globalAlpha *= clamp(a);
  fn();
  ctx.restore();
}

export function shadowOn(ctx, s = SHADOW) {
  ctx.shadowColor = s.color; ctx.shadowBlur = s.blur; ctx.shadowOffsetX = s.x; ctx.shadowOffsetY = s.y;
}
export function shadowOff(ctx) {
  ctx.shadowColor = 'transparent'; ctx.shadowBlur = 0; ctx.shadowOffsetX = 0; ctx.shadowOffsetY = 0;
}

// Linha que "se desenha" de (x0,y0) a (x1,y1) conforme p (0..1).
export function drawLine(ctx, x0, y0, x1, y1, p = 1, { color = PAL.frame, width = 2, cap = 'butt' } = {}) {
  if (p <= 0) return;
  ctx.beginPath();
  ctx.moveTo(x0, y0);
  ctx.lineTo(lerp(x0, x1, p), lerp(y0, y1, p));
  ctx.strokeStyle = color; ctx.lineWidth = width; ctx.lineCap = cap;
  ctx.stroke();
}

// Polilinha com draw-on proporcional ao comprimento.
export function drawPolyline(ctx, pts, p = 1, opts = {}) {
  if (p <= 0 || pts.length < 2) return;
  const segs = [];
  let total = 0;
  for (let i = 1; i < pts.length; i++) {
    const l = Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]);
    segs.push(l); total += l;
  }
  let remain = total * clamp(p);
  ctx.beginPath();
  ctx.moveTo(pts[0][0], pts[0][1]);
  for (let i = 1; i < pts.length && remain > 0; i++) {
    const l = segs[i - 1];
    const q = Math.min(1, remain / l);
    ctx.lineTo(lerp(pts[i - 1][0], pts[i][0], q), lerp(pts[i - 1][1], pts[i][1], q));
    remain -= l;
  }
  ctx.strokeStyle = opts.color || PAL.frame; ctx.lineWidth = opts.width || 2;
  ctx.lineJoin = 'miter'; ctx.lineCap = 'butt';
  if (opts.dash) ctx.setLineDash(opts.dash);
  ctx.stroke();
  ctx.setLineDash([]);
}

// ---------------------------------------------------------------- cabeçalho
// Medidas tiradas do quadro 39.0s da referência (2560x1440).
export const HUD = {
  sq: { x: 105, y: 106, s: 21 },
  title: { x: 168, y: 133, size: 30, ls: 0.9 },
  sub: { x: 168, y: 166, size: 19, ls: 6.2 },
  line: { x0: 736, x1: 2345, y: 124 },
  ind: { x: 2370, y: 105, s: 16, gap: 27 },
  br: { y0: 1300, y1: 1331, xl: 109, xr: 2447, len: 91 },
};

export function drawHud(ctx, t, fi, { t0, title, subtitle, active = 2, out = Infinity, outDur = 0.25 }) {
  const a = env(t, t0, t0 + 0.06, out, out + outDur, E.linear, E.linear);
  if (a <= 0) return;
  ctx.save();
  ctx.globalAlpha = a;
  // quadrado vermelho (pisca 1 quadro antes de firmar, como na referência)
  const sqA = t < t0 + 0.26 ? 0 : (t < t0 + 0.30 ? 0.45 : 1);
  if (sqA > 0) {
    ctx.save(); shadowOn(ctx, { color: 'rgba(0,0,0,0.5)', blur: 6, x: 2, y: 3 });
    ctx.globalAlpha *= sqA; ctx.fillStyle = PAL.hudRed;
    ctx.fillRect(HUD.sq.x, HUD.sq.y, HUD.sq.s, HUD.sq.s);
    ctx.restore();
  }
  // título e subtítulo decodificando
  const tt = decode(title, t, t0 + 0.27, { cps: 21, tail: 5, seed: 11, fi });
  if (tt.visible) {
    setFont(ctx, FONTS.mono, HUD.title.size, 700);
    drawSegs(ctx, [{ text: tt.text, color: PAL.title }], HUD.title.x, HUD.title.y, { ls: HUD.title.ls, shadow: { color: 'rgba(0,0,0,0.5)', blur: 6, x: 2, y: 3 } });
  }
  const st = decode(subtitle, t, t0 + 0.42, { cps: 26, tail: 4, seed: 12, fi });
  if (st.visible) {
    setFont(ctx, FONTS.mono, HUD.sub.size, 500);
    drawSegs(ctx, [{ text: st.text, color: PAL.subtitle }], HUD.sub.x, HUD.sub.y, { ls: HUD.sub.ls });
  }
  // linha do cabeçalho
  const lp = tw(t, t0 + 0.36, t0 + 1.05, E.outQuart);
  ctx.fillStyle = PAL.hudLine;
  if (lp > 0) ctx.fillRect(HUD.line.x0, HUD.line.y, (HUD.line.x1 - HUD.line.x0) * lp, 2);
  // indicador de seção [□□■]
  for (let i = 0; i < 3; i++) {
    const ia = tw(t, t0 + 0.55 + i * 0.05, t0 + 0.62 + i * 0.05, E.linear);
    if (ia <= 0) continue;
    const x = HUD.ind.x + i * HUD.ind.gap, y = HUD.ind.y, s = HUD.ind.s;
    ctx.save(); ctx.globalAlpha *= ia;
    if (i === active) {
      ctx.fillStyle = '#A52A30'; ctx.fillRect(x, y, s, s);
      ctx.strokeStyle = 'rgba(60,0,2,0.9)'; ctx.lineWidth = 1.5; ctx.strokeRect(x - 0.75, y - 0.75, s + 1.5, s + 1.5);
    }
    else { ctx.strokeStyle = '#4C4E4F'; ctx.lineWidth = 1.5; ctx.strokeRect(x + 0.75, y + 0.75, s - 1.5, s - 1.5); }
    ctx.restore();
  }
  // cantoneiras inferiores
  const ba = tw(t, t0 + 0.18, t0 + 0.5, E.linear);
  if (ba > 0) {
    ctx.save(); ctx.globalAlpha *= ba; ctx.fillStyle = PAL.bracket;
    const { y0, y1, xl, xr, len } = HUD.br;
    ctx.fillRect(xl, y0, 2, y1 - y0 + 1); ctx.fillRect(xl, y1 - 1, len, 2);
    ctx.fillRect(xr - 1, y0, 2, y1 - y0 + 1); ctx.fillRect(xr - len, y1 - 1, len + 1, 2);
    ctx.restore();
  }
  ctx.restore();
}

// Só as cantoneiras inferiores (para trechos sem cabeçalho).
export function drawBottomBrackets(ctx, a) {
  if (a <= 0) return;
  ctx.save(); ctx.globalAlpha *= a; ctx.fillStyle = PAL.bracket;
  const { y0, y1, xl, xr, len } = HUD.br;
  ctx.fillRect(xl, y0, 2, y1 - y0 + 1); ctx.fillRect(xl, y1 - 1, len, 2);
  ctx.fillRect(xr - 1, y0, 2, y1 - y0 + 1); ctx.fillRect(xr - len, y1 - 1, len + 1, 2);
  ctx.restore();
}

// ---------------------------------------------------- caixa de transformação
// Retângulo fino com 8 alças quadradas (como um objeto selecionado num editor).
// p: progresso do draw-on (0..1). As alças aparecem primeiro, as linhas crescem
// a partir dos cantos.
export function transformBox(ctx, x, y, w, h, p = 1, { color = PAL.frame, lw = 2, hs = 13, alpha = 1, handleFill = '#202325', shadow = true } = {}) {
  if (p <= 0 || alpha <= 0) return;
  ctx.save();
  ctx.globalAlpha *= alpha;
  if (shadow) shadowOn(ctx, { color: 'rgba(0,0,0,0.45)', blur: 6, x: 2, y: 3 });
  const lp = E.outQuart(clamp((p - 0.15) / 0.85));
  ctx.strokeStyle = color; ctx.lineWidth = lw;
  const corners = [[x, y], [x + w, y], [x + w, y + h], [x, y + h]];
  // cada aresta cresce a partir dos dois cantos em direção ao meio
  const edges = [[0, 1], [1, 2], [2, 3], [3, 0]];
  ctx.beginPath();
  for (const [a, b] of edges) {
    const [ax, ay] = corners[a], [bx, by] = corners[b];
    const mx = (ax + bx) / 2, my = (ay + by) / 2;
    ctx.moveTo(ax, ay); ctx.lineTo(lerp(ax, mx, lp), lerp(ay, my, lp));
    ctx.moveTo(bx, by); ctx.lineTo(lerp(bx, mx, lp), lerp(by, my, lp));
  }
  ctx.stroke();
  shadowOff(ctx);
  // alças
  const hp = clamp(p / 0.35);
  const pts = [...corners, [x + w / 2, y], [x + w, y + h / 2], [x + w / 2, y + h], [x, y + h / 2]];
  pts.forEach(([px, py], i) => {
    const k = i < 4 ? hp : clamp((p - 0.55) / 0.3);
    if (k <= 0) return;
    const s = hs * (0.6 + 0.4 * E.outBack(k));
    ctx.save(); ctx.globalAlpha *= clamp(k * 1.5);
    ctx.fillStyle = handleFill; ctx.fillRect(px - s / 2, py - s / 2, s, s);
    ctx.strokeStyle = color; ctx.lineWidth = 2; ctx.strokeRect(px - s / 2, py - s / 2, s, s);
    ctx.restore();
  });
  ctx.restore();
}

// Cantoneiras em L em volta de um card.
export function cornerBrackets(ctx, x, y, w, h, { len = 30, color = PAL.grayDim, lw = 2, p = 1 } = {}) {
  if (p <= 0) return;
  const l = len * E.outQuart(clamp(p));
  ctx.save(); ctx.strokeStyle = color; ctx.lineWidth = lw; ctx.beginPath();
  ctx.moveTo(x, y + l); ctx.lineTo(x, y); ctx.lineTo(x + l, y);
  ctx.moveTo(x + w - l, y); ctx.lineTo(x + w, y); ctx.lineTo(x + w, y + l);
  ctx.moveTo(x + w, y + h - l); ctx.lineTo(x + w, y + h); ctx.lineTo(x + w - l, y + h);
  ctx.moveTo(x + l, y + h); ctx.lineTo(x, y + h); ctx.lineTo(x, y + h - l);
  ctx.stroke(); ctx.restore();
}

// Caixa de label (tipo "FALTA DINHEIRO"): borda + preenchimento + texto decodificando.
export function labelBox(ctx, t, fi, { x, y, w, h, text, t0, color = PAL.red, border = PAL.redBox, fill = 'rgba(140,37,38,0.16)', size = 26, ls = 5.5, seed = 3, boxIn = 0.18, font = FONTS.mono, weight = 700, align = 'center', alpha = 1 }) {
  const bp = tw(t, t0, t0 + boxIn, E.outQuart);
  if (bp <= 0 || alpha <= 0) return;
  ctx.save();
  ctx.globalAlpha *= alpha;
  shadowOn(ctx, { color: 'rgba(0,0,0,0.5)', blur: 8, x: 3, y: 4 });
  // a caixa abre a partir do lado esquerdo (largura cresce)
  const ww = w * bp;
  ctx.fillStyle = fill; ctx.fillRect(x, y, ww, h);
  shadowOff(ctx);
  ctx.strokeStyle = border; ctx.lineWidth = 2; ctx.strokeRect(x + 1, y + 1, ww - 2, h - 2);
  const d = decode(text, t, t0 + boxIn * 0.6, { cps: 24, tail: 5, seed, fi });
  if (d.visible) {
    setFont(ctx, font, size, weight);
    ctx.textBaseline = 'middle';
    const tx = align === 'center' ? x + w / 2 : x + 22;
    drawSegs(ctx, [{ text: d.text, color }], tx, y + h / 2 + 1, { ls, align, glow: { color, blur: 10, alpha: 0.35 } });
    ctx.textBaseline = 'alphabetic';
  }
  ctx.restore();
}

// Nó quadrado (pontinho vermelho das linhas guia).
export function node(ctx, x, y, s = 9, color = PAL.redBox, a = 1) {
  if (a <= 0) return;
  ctx.save(); ctx.globalAlpha *= a; ctx.fillStyle = color;
  ctx.fillRect(x - s / 2, y - s / 2, s, s); ctx.restore();
}

// Sublinhado dourado que se desenha.
export function underline(ctx, x0, x1, y, p, { color = PAL.gold, lw = 2.5 } = {}) {
  if (p <= 0) return;
  ctx.save(); ctx.fillStyle = color;
  ctx.fillRect(x0, y, (x1 - x0) * E.outQuart(clamp(p)), lw);
  ctx.restore();
}

// Ícone de pessoa (silhueta) simples e plano — usado na foto do crachá.
export function personIcon(ctx, cx, cy, s, color) {
  ctx.save(); ctx.fillStyle = color;
  ctx.beginPath(); ctx.arc(cx, cy - s * 0.32, s * 0.2, 0, Math.PI * 2); ctx.fill();
  ctx.beginPath();
  ctx.moveTo(cx - s * 0.38, cy + s * 0.42);
  ctx.quadraticCurveTo(cx - s * 0.38, cy - s * 0.04, cx, cy - s * 0.06);
  ctx.quadraticCurveTo(cx + s * 0.38, cy - s * 0.04, cx + s * 0.38, cy + s * 0.42);
  ctx.closePath(); ctx.fill();
  ctx.restore();
}

// Ruído de "glitch" para elementos 2D: deslocamento horizontal por faixas.
export function glitchSlices(ctx, src, x, y, w, h, amount, fi, seed = 1) {
  const n = 7;
  for (let i = 0; i < n; i++) {
    const sy = Math.floor((i / n) * h);
    const sh = Math.ceil(h / n);
    const r = hash(seed, i, fi);
    const dx = (r - 0.5) * 2 * amount * (hash(seed, i, fi, 9) < 0.5 ? 1 : 0.2);
    ctx.drawImage(src, x, y + sy, w, sh, x + dx, y + sy, w, sh);
  }
}
