// "Epílogo — O nome voltou" (2D, 36,6 s), sobre o mesmo fundo.
//
// A câmera viaja por um quadro de investigação montado em degraus (cada região
// fica abaixo ou ao lado da anterior, então nada ocupa o mesmo lugar do mundo
// durante as trocas):
//  A · ABRIL DE 2026 → ROCKSTAR (INVADIDA · DE NOVO) → a câmera recua:
//      SHINYHUNTERS → FORNECEDOR → ROCKSTAR, e a declaração da Rockstar digitada;
//  B · o print do perfil "Scattered Lapsus$ Hunters" numa janela, com os grifos
//      no tempo da fala (mid-2025, ShinyHunters, Scattered Spider, Lapsus$ e o
//      nome da aliança no texto e no título);
//  C · SCATTERED LAPSUS$ HUNTERS → só o LAPSUS$ fica: O NOME VOLTOU.;
//  D · GTA 6 · CHEGA ÀS LOJAS e o calendário de novembro com o 19 circulado;
//  E · LAPSUS$ (O PRIMEIRO) → a geração de grupos → as maiores empresas do
//      mundo invadidas → um telefone na mão de cada grupo;
//  F · tela final: o espaço do próximo vídeo (moldura da marca), TE VEJO LÁ.,
//      o logo FLUX_ e MUITO OBRIGADO. O HUD sai e as cantoneiras ficam.
import { W, H, PAL, FONTS, fq } from '../../core/config.js';
import { E, tw, kf, clamp, lerp, env } from '../../core/ease.js';
import { fbm1, hash } from '../../core/rand.js';
import { drawLine, labelBox, underline, shadowOn, shadowOff, drawHud, drawBottomBrackets, personIcon } from '../../core/draw.js';
import { decode, setFont, drawSegs, measure } from '../../core/text.js';
import { makeCanvas } from '../../core/three-utils.js';
import { drawChrome, TB, FR } from '../camada/windows.js';
import { EW } from './words.js';

// ------------------------------------------------------------ quadro (coordenadas do mundo)
const ROCK = [2300, 800], FORN = [1450, 800], SHINY = [600, 800];
const CARD_H = 140;
const QUOTE = { x: 1780, y: 1080, w: 1040, h: 250 };
const PRINT = { w: 868, h: 474, k: 1.95 };       // print recortado (título + 2 parágrafos)
const WIN = { w: Math.round(PRINT.w * PRINT.k) + FR * 2, h: Math.round(PRINT.h * PRINT.k) + TB + FR, cx: 1500, cy: 2520 };
WIN.x = WIN.cx - WIN.w / 2; WIN.y = WIN.cy - WIN.h / 2;
const NAME = [1700, 3600];
const GTA = { x: 3330, y: 3650 };
const CAL = { x: 4330, y: 3180, w: 700, h: 780 };
const GEN_Y = 4840, LAP = [3150, GEN_Y], GEN_X = [3800, 4300, 4800, 5300];
const COMP_Y = 5300, COMP_X = [3550, 3950, 4350, 4750, 5150, 5550];
const NEXT = { x: 1300, y: 420, w: 1040, h: 585 };   // tela final (coordenadas de tela)

// grifos no print (px do print) — no tempo da fala
const MARKS = [
  { x0: 44, x1: 113, y0: 158, y1: 181, t0: 13.05, t1: 13.45 },   // mid-2025
  { x0: 443, x1: 553, y0: 323, y1: 346, t0: 14.02, t1: 14.40 },  // ShinyHunters
  { x0: 180, x1: 316, y0: 323, y1: 346, t0: 15.86, t1: 16.12 },  // Scattered Spider
  { x0: 328, x1: 400, y0: 323, y1: 346, t0: 16.14, t1: 16.34 },  // Lapsus$
  { x0: 501, x1: 728, y0: 294, y1: 317, t0: 17.92, t1: 18.62 },  // o nome da aliança (texto)
  { x0: 333, x1: 806, y0: 8, y1: 48, t0: 18.30, t1: 19.05 },     // o nome da aliança (título)
];

// ------------------------------------------------------------ câmera
// Easy ease entre as regiões + "respiro" de zoom no meio das viagens longas.
// Pico de velocidade sempre abaixo de ~250 px por quadro.
const CAM = [
  [0.00, [2300, 720, 1.10]],
  [3.55, [2296, 722, 1.15], E.inOutSoft],
  [4.45, [1450, 830, 0.92], E.inOut],
  [8.30, [1456, 826, 0.95], E.inOutSoft],
  [9.10, [2300, 1010, 1.00], E.inOut],
  [12.20, [2296, 1014, 1.04], E.inOutSoft],
  [12.95, [WIN.cx, WIN.cy, 1.00], E.inOut],
  [19.40, [WIN.cx, WIN.cy - 8, 1.05], E.inOutSoft],
  [20.00, [NAME[0], NAME[1], 1.00], E.inOut],
  [20.70, [NAME[0] + 4, NAME[1], 1.03], E.inOutSoft],
  [21.40, [4150, 3600, 1.00], E.inOut],
  [23.95, [4158, 3604, 1.04], E.inOutSoft],
  [24.75, [3700, 4840, 1.00], E.inOut],
  [27.30, [4300, 4850, 0.90], E.inOutSoft],
  [28.25, [4304, 4852, 0.90], E.inOutSoft],
  [29.20, [4340, 4880, 0.80], E.inOut],
  [31.10, [4344, 4878, 0.82], E.inOutSoft],
];
const PANS = [
  { t0: 3.55, t1: 4.45, dip: 0.10 }, { t0: 8.30, t1: 9.10, dip: 0.10 }, { t0: 12.20, t1: 12.95, dip: 0.22 },
  { t0: 19.40, t1: 20.00, dip: 0.22 }, { t0: 20.70, t1: 21.40, dip: 0.28 }, { t0: 23.95, t1: 24.75, dip: 0.22 },
];
export function camAt(t) {
  const [cx, cy, z0] = kf(t, CAM);
  let dip = 0;
  for (const p of PANS) if (t > p.t0 && t < p.t1) dip = Math.max(dip, p.dip * Math.sin(Math.PI * (t - p.t0) / (p.t1 - p.t0)));
  // tremida curta no "de novo"
  let sx = 0, sy = 0;
  const a = t - (EW.de_novo + 0.04);
  if (a > 0) { const k = Math.exp(-a * 14) * 6; sx = Math.sin(a * 2 * Math.PI * 11) * k; sy = Math.cos(a * 2 * Math.PI * 9) * k * 0.7; }
  return { cx: cx + fbm1(t * 0.2, 71) * 5 + sx, cy: cy + fbm1(t * 0.17, 73) * 4 + sy, z: z0 * (1 - dip) };
}

// ------------------------------------------------------------ utilidades
const typeN = (s, t, t0, t1) => s.slice(0, clamp(Math.floor(((fq(t) - t0) / (t1 - t0)) * s.length + 1e-6), 0, s.length));
// o "$" do Lapsus$ sempre em vermelho
function segsOf(str, color = PAL.white) {
  const out = [];
  for (const part of str.split(/(\$)/)) if (part) out.push({ text: part, color: part === '$' ? PAL.red : color });
  return out;
}
const popOf = (t, t0, d = 0.3) => E.outBack(tw(t, t0, t0 + d, E.linear));
const SHADOW = { color: 'rgba(0,0,0,0.55)', blur: 22, x: 0, y: 10 };

function card(ctx, cx, cy, w, h, a, pop, title, { icon = null, border = PAL.boxStroke, flash = 0, size = 40 } = {}) {
  if (a <= 0) return;
  ctx.save();
  ctx.globalAlpha *= a;
  ctx.translate(cx, cy);
  const s = 0.9 + 0.1 * pop;
  ctx.scale(s, s);
  shadowOn(ctx, SHADOW);
  ctx.beginPath(); ctx.roundRect(-w / 2, -h / 2, w, h, 8);
  ctx.fillStyle = 'rgba(24,27,31,0.95)'; ctx.fill();
  shadowOff(ctx);
  ctx.lineWidth = 2; ctx.strokeStyle = border; ctx.stroke();
  if (flash > 0) { ctx.save(); ctx.globalAlpha *= flash; ctx.lineWidth = 5; ctx.strokeStyle = PAL.red; ctx.stroke(); ctx.restore(); }
  if (icon) icon(ctx, -w / 2 + 70, 0);
  setFont(ctx, FONTS.mono, size, 700);
  ctx.textBaseline = 'middle';
  drawSegs(ctx, segsOf(title), icon ? -w / 2 + 132 : 0, 3, { ls: 3, align: icon ? 'left' : 'center' });
  ctx.textBaseline = 'alphabetic';
  ctx.restore();
}
function smallLabel(ctx, t, fi, text, x, y, t0, { color = PAL.gray, size = 24, ls = 5, align = 'left', seed = 1 } = {}) {
  const d = decode(text, t, t0, { cps: 30, seed, fi });
  if (!d.visible) return;
  setFont(ctx, FONTS.mono, size, 700);
  drawSegs(ctx, [{ text: d.text, color }], x, y, { ls, align });
}
function redTag(ctx, t, fi, text, x, y, t0, seed, { center = false, style = {} } = {}) {
  setFont(ctx, FONTS.mono, 26, 700);
  const w = Math.round(measure(ctx, text, 5.5) + 56);
  const bx = center ? x - w / 2 : x;
  labelBox(ctx, t, fi, { x: bx, y, w, h: 56, text, t0, seed, ...style });
  return { x: bx, y, w, h: 56 };
}
// texto grande (Anton) revelado por uma varredura da esquerda para a direita
function wipeText(ctx, segs, x, y, size, p, { align = 'left', ls = 0 } = {}) {
  if (p <= 0) return;
  setFont(ctx, FONTS.big, size, 400);
  const total = segs.reduce((s, g) => s + measure(ctx, g.text, ls), 0);
  const x0 = align === 'center' ? x - total / 2 : x;
  ctx.save();
  ctx.beginPath(); ctx.rect(x0 - 24, y - size * 1.1, (total + 48) * p, size * 1.45); ctx.clip();
  drawSegs(ctx, segs, x, y, { ls, align, shadow: { color: 'rgba(0,0,0,0.5)', blur: 10, x: 3, y: 5 } });
  ctx.restore();
  if (p < 1) { ctx.fillStyle = PAL.red; ctx.fillRect(x0 - 24 + (total + 48) * p - 4, y - size * 0.86, 6, size * 1.0); }
}
function link(ctx, x0, y0, x1, y1, p, { color = PAL.red, width = 3, arrow = true, dash = null } = {}) {
  if (p <= 0) return;
  ctx.save();
  ctx.strokeStyle = color; ctx.lineWidth = width; ctx.lineCap = 'butt';
  if (dash) ctx.setLineDash(dash);
  ctx.beginPath(); ctx.moveTo(x0, y0); ctx.lineTo(lerp(x0, x1, p), lerp(y0, y1, p)); ctx.stroke();
  if (arrow && p > 0.985) {
    ctx.setLineDash([]); ctx.fillStyle = color;
    ctx.translate(x1, y1); ctx.rotate(Math.atan2(y1 - y0, x1 - x0));
    ctx.beginPath(); ctx.moveTo(2, 0); ctx.lineTo(-17, -9.5); ctx.lineTo(-17, 9.5); ctx.closePath(); ctx.fill();
  }
  ctx.restore();
}
function packet(ctx, x0, y0, x1, y1, p) {
  if (p <= 0 || p >= 1) return;
  ctx.save();
  ctx.fillStyle = '#FF6A74'; ctx.shadowColor = PAL.red; ctx.shadowBlur = 16;
  ctx.beginPath(); ctx.arc(lerp(x0, x1, p), lerp(y0, y1, p), 8, 0, Math.PI * 2); ctx.fill();
  ctx.restore();
}
// linha parcial ao longo de uma poligonal (p = 0..1 do comprimento)
function partial(ctx, pts, p) {
  const seg = [];
  let L = 0;
  for (let i = 1; i < pts.length; i++) { const d = Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]); seg.push(d); L += d; }
  let left = L * p;
  ctx.beginPath(); ctx.moveTo(pts[0][0], pts[0][1]);
  for (let i = 1; i < pts.length && left > 0; i++) {
    const k = Math.min(1, left / seg[i - 1]);
    ctx.lineTo(lerp(pts[i - 1][0], pts[i][0], k), lerp(pts[i - 1][1], pts[i][1], k));
    left -= seg[i - 1];
  }
  ctx.stroke();
}

// ---------------- ícones
function icBuilding(ctx, x, y, s, col, lit = 0, seed = 0) {
  ctx.save();
  ctx.strokeStyle = col; ctx.lineWidth = Math.max(2, s * 0.045);
  const w = s * 0.62, h = s * 0.92;
  ctx.strokeRect(x - w / 2, y - h / 2, w, h);
  for (let r = 0; r < 4; r++) for (let c = 0; c < 3; c++) {
    const on = lit > 0 && hash(r, c, seed, 7) < 0.7;
    ctx.fillStyle = on ? `rgba(240,80,92,${0.35 + 0.65 * lit})` : col;
    ctx.fillRect(x - w / 2 + w * (0.17 + c * 0.25), y - h / 2 + h * (0.12 + r * 0.19), w * 0.16, h * 0.1);
  }
  ctx.restore();
}
function icGroup(ctx, x, y, s, col) {
  personIcon(ctx, x - s * 0.32, y + s * 0.08, s * 0.62, 'rgba(176,58,58,0.75)');
  personIcon(ctx, x + s * 0.32, y + s * 0.08, s * 0.62, 'rgba(176,58,58,0.75)');
  personIcon(ctx, x, y, s * 0.8, col);
}
function icBox(ctx, x, y, s, col) {
  ctx.save();
  ctx.strokeStyle = col; ctx.lineWidth = Math.max(2, s * 0.055); ctx.lineJoin = 'round';
  const w = s * 0.72, h = s * 0.58, d = s * 0.14, top = y - h / 2 + d * 0.5;
  ctx.strokeRect(x - w / 2 - d / 2, top, w, h);
  ctx.beginPath();
  ctx.moveTo(x - w / 2 - d / 2, top); ctx.lineTo(x - w / 2 + d / 2, top - d); ctx.lineTo(x + w / 2 + d / 2, top - d); ctx.lineTo(x + w / 2 - d / 2, top);
  ctx.moveTo(x + w / 2 + d / 2, top - d); ctx.lineTo(x + w / 2 + d / 2, top + h - d); ctx.lineTo(x + w / 2 - d / 2, top + h);
  ctx.stroke();
  ctx.fillStyle = col; ctx.fillRect(x - d / 2 - s * 0.05, top, s * 0.1, h * 0.38);
  ctx.restore();
}
function icPhone(ctx, x, y, s, col) {
  ctx.save();
  ctx.strokeStyle = col; ctx.lineWidth = Math.max(2, s * 0.07);
  const w = s * 0.5, h = s * 0.9;
  ctx.beginPath(); ctx.roundRect(x - w / 2, y - h / 2, w, h, s * 0.1); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(x - s * 0.08, y - h / 2 + s * 0.12); ctx.lineTo(x + s * 0.08, y - h / 2 + s * 0.12); ctx.stroke();
  ctx.fillStyle = col; ctx.beginPath(); ctx.arc(x, y + h / 2 - s * 0.13, s * 0.05, 0, Math.PI * 2); ctx.fill();
  ctx.restore();
}
// selo na quina de um nó (mensagem/ligação chegando)
function selo(ctx, x, y, size, a, pop, t) {
  if (a <= 0) return;
  ctx.save();
  ctx.globalAlpha *= a;
  ctx.translate(x, y); const s = 0.6 + 0.4 * pop; ctx.scale(s, s);
  shadowOn(ctx, { color: 'rgba(0,0,0,0.5)', blur: 10, x: 0, y: 4 });
  ctx.beginPath(); ctx.roundRect(-size / 2, -size / 2, size, size, 7); ctx.fillStyle = '#2A1416'; ctx.fill();
  shadowOff(ctx);
  ctx.lineWidth = 2.5; ctx.strokeStyle = PAL.redBox; ctx.stroke();
  icPhone(ctx, -size * 0.08, 0, size * 0.62, '#FFB3B8');
  // ondas da ligação
  ctx.strokeStyle = '#FF8A92'; ctx.lineWidth = 2.2;
  for (let i = 0; i < 2; i++) {
    const k = 0.5 + 0.5 * Math.sin(t * 7 - i * 1.3);
    ctx.globalAlpha = a * k;
    ctx.beginPath(); ctx.arc(size * 0.06, -size * 0.14, size * (0.18 + i * 0.12), -0.9, 0.5); ctx.stroke();
  }
  ctx.restore();
}

// ------------------------------------------------------------ quadro
export function createBoard({ print, logo }) {
  // janela do print composta uma vez só (abre e fecha como um bloco, sem vazar a moldura)
  const M = 90;
  const winCv = makeCanvas(WIN.w + M * 2, WIN.h + M * 2);
  {
    const g = winCv.getContext('2d');
    g.translate(M, M);
    drawChrome(g, { w: WIN.w, h: WIN.h, caption: 'Dark Web Profile: Scattered Lapsus$ Hunters' }, 5);
    g.imageSmoothingEnabled = true; g.imageSmoothingQuality = 'high';
    g.drawImage(print, FR, TB, WIN.w - FR * 2, WIN.h - TB - FR);
  }

  function boardGrid(ctx, cam) {
    const step = 120;
    const x0 = cam.cx - W / 2 / cam.z - step, x1 = cam.cx + W / 2 / cam.z + step;
    const y0 = cam.cy - H / 2 / cam.z - step, y1 = cam.cy + H / 2 / cam.z + step;
    ctx.fillStyle = 'rgba(200,205,210,0.05)';
    const s = 2.4 / cam.z;
    for (let x = Math.floor(x0 / step) * step; x < x1; x += step) for (let y = Math.floor(y0 / step) * step; y < y1; y += step) ctx.fillRect(x - s / 2, y - s / 2, s, s);
  }

  // ---------------------------------------------------------- A · Rockstar, ShinyHunters, fornecedor
  function regionA(ctx, t, fi) {
    if (t > 13.3) return;
    const dateA = 1 - tw(t, 3.45, 3.85, E.linear);
    if (dateA > 0) {
      ctx.save(); ctx.globalAlpha *= dateA;
      wipeText(ctx, [{ text: 'ABRIL DE 2026', color: PAL.white }], ROCK[0], 600, 130, tw(t, EW.abril, EW.n2026_end - 0.1, E.inOut), { align: 'center', ls: 2 });
      ctx.restore();
    }
    const back = 1 - 0.65 * tw(t, 8.30, 9.0, E.inOut);   // shinyhunters e fornecedor recuam na declaração
    // ligações (embaixo dos cartões)
    const L1 = [SHINY[0] + 270 + 10, SHINY[1], FORN[0] - 240 - 10, FORN[1]];
    const L2 = [FORN[0] + 240 + 10, FORN[1], ROCK[0] - 260 - 10, ROCK[1]];
    ctx.save(); ctx.globalAlpha *= back;
    link(ctx, ...L1, tw(t, EW.entrou, EW.fornecedor + 0.05, E.inOut));
    packet(ctx, ...L1, tw(t, EW.entrou + 0.2, EW.fornecedor + 0.15, E.inOut));
    link(ctx, ...L2, tw(t, EW.empresa - 0.1, EW.empresa_end, E.inOut));
    packet(ctx, ...L2, tw(t, EW.empresa, 8.36, E.inOut));
    ctx.restore();
    // ROCKSTAR
    const hit = env(t, 8.32, 8.40, 8.60, 9.0, E.linear, E.inOut);
    card(ctx, ROCK[0], ROCK[1], 520, CARD_H, tw(t, EW.rockstar, EW.rockstar + 0.12, E.linear), popOf(t, EW.rockstar),
      decode('ROCKSTAR', t, EW.rockstar + 0.04, { cps: 28, seed: 31, fi }).text,
      { icon: (c, x, y) => icBuilding(c, x, y, 80, PAL.offWhite, hit, 3), flash: hit });
    // INVADIDA · DE NOVO
    setFont(ctx, FONTS.mono, 26, 700);
    const w1 = Math.round(measure(ctx, 'INVADIDA', 5.5) + 56), w2 = Math.round(measure(ctx, 'DE NOVO', 5.5) + 56);
    const tx = ROCK[0] - (w1 + 14 + w2) / 2, ty = ROCK[1] + CARD_H / 2 + 34;
    labelBox(ctx, t, fi, { x: tx, y: ty, w: w1, h: 56, text: 'INVADIDA', t0: EW.invadida, seed: 32 });
    labelBox(ctx, t, fi, { x: tx + w1 + 14, y: ty, w: w2, h: 56, text: 'DE NOVO', t0: EW.de_novo, seed: 33 });
    const echo = env(t, EW.de_novo + 0.12, EW.de_novo + 0.2, EW.de_novo + 0.45, EW.de_novo + 0.85, E.linear, E.inOut);
    if (echo > 0) {
      const o = 8 + 12 * tw(t, EW.de_novo + 0.12, EW.de_novo + 0.7, E.out);
      ctx.save(); ctx.globalAlpha *= 0.6 * echo; ctx.strokeStyle = PAL.redBox; ctx.lineWidth = 2;
      ctx.strokeRect(tx + w1 + 14 + o, ty + o, w2, 56); ctx.restore();
    }
    // SHINYHUNTERS (grupo) e FORNECEDOR
    ctx.save(); ctx.globalAlpha *= back;
    smallLabel(ctx, t, fi, 'GRUPO', SHINY[0] - 270, SHINY[1] - CARD_H / 2 - 22, EW.grupo, { seed: 34 });
    card(ctx, SHINY[0], SHINY[1], 540, CARD_H, tw(t, EW.shiny, EW.shiny + 0.12, E.linear), popOf(t, EW.shiny),
      decode('SHINYHUNTERS', t, EW.shiny + 0.04, { cps: 30, seed: 35, fi }).text,
      { icon: (c, x, y) => icGroup(c, x, y, 74, PAL.red), border: PAL.redBox, size: 38 });
    card(ctx, FORN[0], FORN[1], 480, CARD_H, tw(t, EW.fornecedor, EW.fornecedor + 0.12, E.linear), popOf(t, EW.fornecedor),
      decode('FORNECEDOR', t, EW.fornecedor + 0.04, { cps: 30, seed: 36, fi }).text,
      { icon: (c, x, y) => icBox(c, x, y, 78, PAL.offWhite) });
    ctx.restore();
    // a declaração da Rockstar, digitada no tempo da fala
    const qa = tw(t, EW.disse - 0.06, EW.disse + 0.08, E.linear);
    if (qa > 0) {
      const pop = popOf(t, EW.disse - 0.06, 0.28);
      ctx.save(); ctx.globalAlpha *= qa;
      ctx.translate(QUOTE.x + QUOTE.w / 2, QUOTE.y + QUOTE.h / 2);
      const s = 0.94 + 0.06 * pop; ctx.scale(s, s);
      ctx.translate(-QUOTE.w / 2, -QUOTE.h / 2);
      shadowOn(ctx, SHADOW);
      ctx.beginPath(); ctx.roundRect(0, 0, QUOTE.w, QUOTE.h, 8); ctx.fillStyle = 'rgba(24,27,31,0.95)'; ctx.fill();
      shadowOff(ctx);
      ctx.lineWidth = 2; ctx.strokeStyle = PAL.boxStroke; ctx.stroke();
      ctx.fillStyle = PAL.redDeep; ctx.fillRect(1, 10, 9, QUOTE.h - 20);
      smallLabel(ctx, t, fi, 'A ROCKSTAR DISSE', 46, 60, EW.disse + 0.04, { seed: 37 });
      setFont(ctx, FONTS.mono, 42, 700);
      const l1 = 'O ACESSO SE LIMITOU A', l2 = 'INFORMAÇÕES SEM RELEVÂNCIA';
      drawSegs(ctx, [{ text: typeN(l1, t, EW.acesso - 0.05, EW.informacoes), color: PAL.white }], 46, 138, { ls: 2 });
      drawSegs(ctx, [{ text: typeN(l2, t, EW.informacoes, EW.relevancia_end - 0.1), color: PAL.white }], 46, 202, { ls: 2 });
      setFont(ctx, FONTS.mono, 42, 700);
      const xs = 46 + measure(ctx, 'INFORMAÇÕES ', 2), xe = 46 + measure(ctx, l2, 2);
      underline(ctx, xs, xe, 218, tw(t, EW.relevancia, EW.relevancia_end, E.linear));
      ctx.restore();
    }
  }

  // ---------------------------------------------------------- B · o print da aliança
  function regionB(ctx, t) {
    const a = tw(t, 12.66, 12.80, E.linear) * (1 - tw(t, 19.42, 19.66, E.linear));
    if (a <= 0) return;
    const pop = E.outQuart(tw(t, 12.66, 12.96, E.linear));
    ctx.save();
    ctx.globalAlpha *= a;
    ctx.translate(WIN.cx, WIN.cy);
    const s = 0.95 + 0.05 * pop; ctx.scale(s, s);
    ctx.translate(-WIN.w / 2, -WIN.h / 2);
    ctx.drawImage(winCv, -M, -M);
    ctx.translate(FR, TB); ctx.scale(PRINT.k, PRINT.k);
    for (const m of MARKS) {
      const p = tw(t, m.t0, m.t1, E.inOut);
      if (p <= 0) continue;
      const ww = (m.x1 - m.x0 + 6) * p;
      ctx.fillStyle = 'rgba(224,69,81,0.28)'; ctx.fillRect(m.x0 - 3, m.y0 - 1, ww, m.y1 - m.y0 + 2);
      ctx.fillStyle = PAL.red; ctx.fillRect(m.x0 - 3, m.y1 + 1.5, ww, 2.2);
    }
    ctx.restore();
  }

  // ---------------------------------------------------------- C · o nome voltou
  function regionC(ctx, t, fi) {
    const a = tw(t, 19.66, 19.70, E.linear) * (1 - tw(t, 20.78, 21.05, E.linear));
    if (a <= 0) return;
    ctx.save(); ctx.globalAlpha *= a;
    const ls = 3, by = NAME[1] + 50;
    setFont(ctx, FONTS.big, 150, 400);
    const words = ['SCATTERED', 'LAPSUS$', 'HUNTERS'];
    const ws = words.map((w) => measure(ctx, w, ls)), sp = measure(ctx, ' ', ls);
    const total = ws[0] + ws[1] + ws[2] + sp * 2;
    const x0 = NAME[0] - total / 2;
    const xs = [x0, x0 + ws[0] + sp, x0 + ws[0] + ws[1] + sp * 2];
    const reveal = tw(t, 19.70, 19.98, E.inOut);
    const dim = tw(t, 19.98, 20.28, E.inOut);
    const grow = 1 + 0.13 * popOf(t, 20.0, 0.36);
    ctx.save();
    ctx.beginPath(); ctx.rect(x0 - 40, by - 190, (total + 80) * reveal, 260); ctx.clip();
    for (let i = 0; i < 3; i++) {
      const side = i !== 1;
      ctx.save();
      if (side) ctx.globalAlpha *= 1 - 0.75 * dim;
      ctx.translate(xs[i] + ws[i] / 2 + (side ? (i === 0 ? -1 : 1) * 50 * dim : 0), by);
      if (!side) ctx.scale(grow, grow);
      setFont(ctx, FONTS.big, 150, 400);
      drawSegs(ctx, side ? [{ text: words[i], color: PAL.white }] : segsOf(words[i]), 0, 0, { ls, align: 'center', shadow: { color: 'rgba(0,0,0,0.5)', blur: 10, x: 3, y: 5 } });
      ctx.restore();
    }
    ctx.restore();
    if (reveal > 0 && reveal < 1) { ctx.fillStyle = PAL.red; ctx.fillRect(x0 - 40 + (total + 80) * reveal - 4, by - 130, 6, 150); }
    redTag(ctx, t, fi, 'O NOME VOLTOU.', NAME[0], by + 70, EW.voltou, 41, { center: true });
    ctx.restore();
  }

  // ---------------------------------------------------------- D · GTA 6 e o calendário
  function calendar(ctx, t) {
    const t0 = 22.36;
    const a = tw(t, t0, t0 + 0.12, E.linear);
    if (a <= 0) return;
    const pop = popOf(t, t0, 0.32);
    const { x, y, w, h } = CAL;
    ctx.save();
    ctx.globalAlpha *= a;
    ctx.translate(x + w / 2, y + h / 2);
    const s = 0.9 + 0.1 * pop; ctx.scale(s, s);
    ctx.translate(-w / 2, -h / 2);
    shadowOn(ctx, { color: 'rgba(0,0,0,0.6)', blur: 30, x: 0, y: 14 });
    ctx.beginPath(); ctx.roundRect(0, 0, w, h, 10); ctx.fillStyle = '#1B1E22'; ctx.fill();
    shadowOff(ctx);
    ctx.lineWidth = 2; ctx.strokeStyle = PAL.boxStroke; ctx.stroke();
    ctx.beginPath(); ctx.roundRect(0, 0, w, 116, [10, 10, 0, 0]); ctx.fillStyle = PAL.redDeep; ctx.fill();
    ctx.textBaseline = 'middle';
    setFont(ctx, FONTS.mono, 44, 800);
    drawSegs(ctx, [{ text: 'NOVEMBRO 2026', color: PAL.white }], w / 2, 60, { ls: 6, align: 'center' });
    setFont(ctx, FONTS.mono, 26, 700);
    const cw = w / 7;
    ['D', 'S', 'T', 'Q', 'Q', 'S', 'S'].forEach((d, i) => drawSegs(ctx, [{ text: d, color: PAL.gray }], cw * (i + 0.5), 162, { align: 'center' }));
    // 1º de novembro de 2026 é um domingo
    const ring = tw(t, EW.n19, EW.n19 + 0.36, E.inOut);
    for (let n = 1; n <= 30; n++) {
      const c = (n - 1) % 7, r = Math.floor((n - 1) / 7);
      const cx = cw * (c + 0.5), cy = 236 + r * 108;
      const is19 = n === 19 && ring > 0;
      if (is19) {
        ctx.fillStyle = `rgba(224,69,81,${0.22 * ring})`; ctx.beginPath(); ctx.arc(cx, cy, 44, 0, Math.PI * 2); ctx.fill();
        ctx.save(); ctx.strokeStyle = PAL.red; ctx.lineWidth = 5; ctx.lineCap = 'round';
        ctx.beginPath(); ctx.arc(cx, cy, 46, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * ring); ctx.stroke(); ctx.restore();
      }
      setFont(ctx, FONTS.mono, 36, is19 ? 800 : 700);
      drawSegs(ctx, [{ text: String(n), color: is19 ? PAL.white : '#8A8D91' }], cx, cy + 2, { align: 'center' });
    }
    ctx.textBaseline = 'alphabetic';
    ctx.restore();
  }
  function regionD(ctx, t, fi) {
    const a = tw(t, 21.0, 21.05, E.linear) * (1 - tw(t, 24.05, 24.4, E.linear));
    if (a <= 0) return;
    ctx.save(); ctx.globalAlpha *= a;
    wipeText(ctx, [{ text: 'GTA 6', color: PAL.white }], GTA.x, GTA.y, 250, tw(t, 21.10, 21.42, E.inOut), { ls: 4 });
    smallLabel(ctx, t, fi, 'CHEGA ÀS LOJAS', GTA.x + 8, GTA.y + 92, EW.chega, { color: PAL.offWhite, size: 40, ls: 6, seed: 42 });
    setFont(ctx, FONTS.mono, 40, 700);
    underline(ctx, GTA.x + 8, GTA.x + 8 + measure(ctx, 'CHEGA ÀS LOJAS', 6), GTA.y + 116, tw(t, EW.lojas, EW.lojas + 0.4, E.linear), { color: PAL.red, lw: 3 });
    calendar(ctx, t);
    ctx.restore();
  }

  // ---------------------------------------------------------- E · a geração
  const NAMES = ['SCATTERED SPIDER', 'SHINYHUNTERS', null, null];
  const HITS = [[0, 0], [0, 1], [1, 1], [1, 2], [2, 3], [2, 4], [3, 4], [3, 5]];
  function regionE(ctx, t, fi) {
    if (t < 24.3) return;
    // LAPSUS$ — o primeiro
    card(ctx, LAP[0], LAP[1], 400, CARD_H, tw(t, 24.45, 24.57, E.linear), popOf(t, 24.45),
      decode('LAPSUS$', t, 24.49, { cps: 26, seed: 51, fi }).text, { size: 50, border: PAL.redBox });
    redTag(ctx, t, fi, 'O PRIMEIRO', LAP[0], LAP[1] - CARD_H / 2 - 78, EW.primeiro, 52, { center: true });
    // linha da geração (os nós ficam em cima dela, opacos)
    drawLine(ctx, LAP[0] + 200 + 10, GEN_Y, 5560, GEN_Y, tw(t, 25.95, 26.9, E.inOut), { color: '#4A4D50', width: 3 });
    smallLabel(ctx, t, fi, 'UMA GERAÇÃO DE GRUPOS', GEN_X[0] - 62, GEN_Y - 160, EW.geracao + 0.08, { seed: 53 });
    // invasões: dos grupos para as empresas
    HITS.forEach(([g, c], k) => {
      const t0 = EW.invadir + k * 0.05;
      const x0 = GEN_X[g], y0 = GEN_Y + 62 + 10, x1 = COMP_X[c], y1 = COMP_Y - 58 - 10;
      link(ctx, x0, y0, x1, y1, tw(t, t0, t0 + 0.32, E.inOut), { width: 2.5 });
    });
    // grupos
    GEN_X.forEach((x, i) => {
      const t0 = EW.geracao + i * 0.17;
      const na = tw(t, t0, t0 + 0.1, E.linear);
      if (na <= 0) return;
      ctx.save(); ctx.globalAlpha *= na;
      ctx.translate(x, GEN_Y);
      const s = 0.8 + 0.2 * popOf(t, t0); ctx.scale(s, s);
      shadowOn(ctx, SHADOW);
      ctx.beginPath(); ctx.arc(0, 0, 62, 0, Math.PI * 2); ctx.fillStyle = '#1B1E22'; ctx.fill();
      shadowOff(ctx);
      ctx.lineWidth = 2.5; ctx.strokeStyle = NAMES[i] ? PAL.redBox : PAL.boxStroke; ctx.stroke();
      if (NAMES[i]) personIcon(ctx, 0, 8, 66, PAL.red);
      else {
        setFont(ctx, FONTS.big, 66, 400); ctx.textBaseline = 'middle';
        drawSegs(ctx, [{ text: '?', color: '#8A8D91' }], 0, 4, { align: 'center' });
        ctx.textBaseline = 'alphabetic';
      }
      ctx.restore();
      if (NAMES[i]) smallLabel(ctx, t, fi, NAMES[i], x, GEN_Y - 88, t0 + 0.1, { color: PAL.offWhite, size: 24, ls: 3, align: 'center', seed: 54 + i });
    });
    // as maiores empresas do mundo (as janelas acendem em vermelho quando a ligação chega)
    COMP_X.forEach((x, j) => {
      const t0 = EW.maiores + j * 0.07;
      const ca = tw(t, t0, t0 + 0.1, E.linear);
      if (ca <= 0) return;
      ctx.save(); ctx.globalAlpha *= ca;
      ctx.translate(x, COMP_Y);
      const s = 0.8 + 0.2 * popOf(t, t0); ctx.scale(s, s);
      icBuilding(ctx, 0, 0, 116, PAL.offWhite, tw(t, t0 + 0.2, t0 + 0.45, E.linear), j + 11);
      ctx.restore();
    });
    smallLabel(ctx, t, fi, 'AS MAIORES EMPRESAS DO MUNDO', (COMP_X[0] + COMP_X[5]) / 2, COMP_Y + 122, EW.maiores + 0.1, { size: 28, align: 'center', seed: 59 });
    // um telefone na mão: o selo de ligação aparece em cada grupo
    const SELOS = [[LAP[0] + 200, LAP[1] - CARD_H / 2], ...GEN_X.map((x) => [x + 48, GEN_Y - 48])];
    SELOS.forEach(([x, y], i) => {
      const t0 = EW.telefone + i * 0.07;
      selo(ctx, x, y, 66, tw(t, t0, t0 + 0.08, E.linear), popOf(t, t0, 0.26), t);
    });
    redTag(ctx, t, fi, 'COM UM TELEFONE NA MÃO', 4700, GEN_Y - 200, EW.telefone + 0.2, 60);
  }

  // ---------------------------------------------------------- F · tela final
  function brandFrame(ctx, R, t, t0) {
    const p = tw(t, t0, t0 + 0.42, E.inOut);
    if (p <= 0) return;
    const { x, y, w, h } = R, cx = x + w / 2;
    ctx.save();
    ctx.strokeStyle = '#888E96'; ctx.lineWidth = 2; ctx.setLineDash([14, 11]);
    partial(ctx, [[cx, y], [x + w, y], [x + w, y + h], [cx, y + h]], p);
    partial(ctx, [[cx, y], [x, y], [x, y + h], [cx, y + h]], p);
    ctx.setLineDash([]);
    const HS = [[x, y], [cx, y], [x + w, y], [x + w, y + h / 2], [x + w, y + h], [cx, y + h], [x, y + h], [x, y + h / 2]];
    HS.forEach(([hx, hy], i) => {
      const k = E.outBack(tw(t, t0 + 0.2 + i * 0.04, t0 + 0.42 + i * 0.04, E.linear));
      if (k <= 0) return;
      const s = 18 * k;
      ctx.fillStyle = '#B40E29'; ctx.fillRect(hx - s / 2, hy - s / 2, s, s);
    });
    ctx.restore();
  }
  function endCard(ctx, t, fi) {
    if (t < 31.3) return;
    brandFrame(ctx, NEXT, t, 31.40);
    const ia = tw(t, 31.85, 32.15, E.linear);
    if (ia > 0) {
      const cx = NEXT.x + NEXT.w / 2, cy = NEXT.y + NEXT.h / 2 - 24;
      ctx.save(); ctx.globalAlpha *= ia;
      ctx.strokeStyle = '#6A6E74'; ctx.lineWidth = 3;
      ctx.beginPath(); ctx.arc(cx, cy, 46, 0, Math.PI * 2); ctx.stroke();
      ctx.fillStyle = '#6A6E74'; ctx.beginPath(); ctx.moveTo(cx - 14, cy - 22); ctx.lineTo(cx + 24, cy); ctx.lineTo(cx - 14, cy + 22); ctx.closePath(); ctx.fill();
      ctx.restore();
    }
    smallLabel(ctx, t, fi, 'PRÓXIMO VÍDEO', NEXT.x + NEXT.w / 2, NEXT.y + NEXT.h / 2 + 76, 31.95, { color: '#6A6E74', size: 26, ls: 6, align: 'center', seed: 61 });
    const X = 190;
    setFont(ctx, FONTS.mono, 40, 700);
    drawSegs(ctx, [{ text: typeN('SE VOCÊ GOSTOU DESSE VÍDEO,', t, EW.se, EW.video_end), color: PAL.offWhite }], X, 520, { ls: 2 });
    drawSegs(ctx, [{ text: typeN('TENHO CERTEZA QUE GOSTARÁ', t, EW.tenho, EW.ainda), color: PAL.offWhite }], X, 590, { ls: 2 });
    drawSegs(ctx, [{ text: typeN('AINDA MAIS DESSE', t, EW.ainda, EW.desse_end), color: PAL.white }], X, 660, { ls: 2 });
    setFont(ctx, FONTS.mono, 40, 700);
    const ax0 = X + measure(ctx, 'AINDA MAIS DESSE', 2) + 30;
    link(ctx, ax0, 646, NEXT.x - 24, 646, tw(t, EW.desse, EW.desse + 0.36, E.inOut), { width: 4 });
    wipeText(ctx, [{ text: 'TE VEJO LÁ.', color: PAL.white }], X, 900, 150, tw(t, EW.te, EW.la_end, E.inOut), { ls: 3 });
    const la = tw(t, EW.muito, EW.muito + 0.32, E.out);
    if (la > 0) {
      const lh = 104, lw = (lh * logo.width) / logo.height;
      ctx.save(); ctx.globalAlpha *= la;
      ctx.drawImage(logo, X - 6, 1012 + 18 * (1 - la), lw, lh);
      ctx.restore();
      setFont(ctx, FONTS.mono, 34, 700);
      drawSegs(ctx, [{ text: typeN('MUITO OBRIGADO.', t, EW.muito, EW.obrigado_end), color: PAL.offWhite }], X + lw + 40, 1082, { ls: 4 });
    }
  }

  // ---------------------------------------------------------- quadro inteiro
  function ui(ctx, t, fi) {
    const cam = camAt(t);
    const boardA = 1 - tw(t, 31.05, 31.45, E.inOut);
    if (boardA > 0) {
      ctx.save();
      ctx.globalAlpha = boardA;
      ctx.translate(W / 2, H / 2); ctx.scale(cam.z, cam.z); ctx.translate(-cam.cx, -cam.cy);
      boardGrid(ctx, cam);
      regionA(ctx, t, fi);
      regionB(ctx, t);
      regionC(ctx, t, fi);
      regionD(ctx, t, fi);
      regionE(ctx, t, fi);
      ctx.restore();
    }
    endCard(ctx, t, fi);
    drawHud(ctx, t, fi, { t0: 0.08, title: 'EPÍLOGO', subtitle: 'O NOME VOLTOU', active: 2, out: 31.0, outDur: 0.4 });
    drawBottomBrackets(ctx, tw(t, 0.26, 0.58, E.linear));
  }

  // Motion blur adaptativo: deslocamento dos cantos da tela pela câmera durante o
  // obturador + mínimos para os elementos que entram com pop ou varredura.
  const POPS = [
    EW.rockstar, EW.shiny, EW.fornecedor, EW.disse - 0.06, 12.66, 20.0, 22.36, 24.45,
    ...GEN_X.map((_, i) => EW.geracao + i * 0.17), ...COMP_X.map((_, j) => EW.maiores + j * 0.07),
    ...[0, 1, 2, 3, 4].map((i) => EW.telefone + i * 0.07),
  ];
  function samples(t) {
    const h = 0.25 / 24;
    const a = camAt(t - h), b = camAt(t + h), c = camAt(t);
    let m = 0;
    for (const [sx, sy] of [[0, 0], [W, 0], [0, H], [W, H], [W / 2, H / 2]]) {
      const px = (sx - W / 2) / c.z + c.cx, py = (sy - H / 2) / c.z + c.cy;
      const ax = (px - a.cx) * a.z, ay = (py - a.cy) * a.z, bx = (px - b.cx) * b.z, by = (py - b.cy) * b.z;
      m = Math.max(m, Math.hypot(bx - ax, by - ay));
    }
    let n = Math.ceil(m / 1.6);
    for (const t0 of POPS) if (t >= t0 && t < t0 + 0.3) n = Math.max(n, 6);
    return clamp(n, 2, 24);
  }

  return { ui, samples, camAt };
}
