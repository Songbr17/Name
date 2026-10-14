// CTA "apoia.se/flux" (2D). Conceito: o vídeo PAUSA antes da madrugada do dia
// 30 e o Flux se investiga como se fosse um caso: a câmera viaja por um quadro
// de investigação, estação por estação, enquanto uma
// contagem regressiva de 30 s corre no canto (00:30 -> 00:00 exatamente no
// "agradeço").
//
// Estações: 1 linha do tempo pausada · 2 FLUX_ = 1 PESSOA / SEM… · 3 ficha do
// caso (escolhido, investigado, montado + carimbo) · 4 objetivo (cada vídeo
// melhor que o anterior) · 5 medidores · 6 navegador: apoia.se/flux ·
// 7 créditos · 8 00:00 / OBRIGADO.
import { W, H, PAL, FONTS, fq } from '../../core/config.js';
import { E, tw, kf, spring, clamp, lerp, env, dampedSine } from '../../core/ease.js';
import { hash, fbm1, mulberry32 } from '../../core/rand.js';
import { transformBox, drawLine, drawPolyline, node, labelBox, withAlpha, underline, shadowOn, shadowOff, drawBottomBrackets, HUD } from '../../core/draw.js';
import { decode, setFont, drawSegs, measure } from '../../core/text.js';
import { makeCanvas } from '../../core/three-utils.js';
import { AW, COUNT } from './words.js';
import { fluxLogo, fluxAvatar, drawBrowser, drawRewardCard, drawCursor, CARD, PAGE_W, ADDR_H } from './apoiase.js';
import { TB, FR } from '../camada/windows.js';

// ------------------------------------------------------------ quadro (coordenadas de "mesa")
const S1 = [1280, 720], S2 = [4250, 760], S3 = [7300, 860], S4 = [10250, 820];
const S5 = [9990, 2380], S6 = [7300, 2440], S7 = [4250, 2400], S8 = [1300, 2400];
const BROWSER = { x: 6300, y: 1880, w: 2000, h: 1200 };
const PAGE_S = (BROWSER.w - FR * 2) / PAGE_W;
// ponto da página (px da captura) -> mesa
const pageToDesk = (px, py) => [BROWSER.x + FR + px * PAGE_S, BROWSER.y + TB + ADDR_H + py * PAGE_S];
const ADDR = { x: BROWSER.x + FR + 150, y: BROWSER.y + TB + 13, h: ADDR_H - 26 };
const URL_X = ADDR.x + 52;
const BTN = pageToDesk(1268, 396);

// Panorâmicas entre estações: easy ease + "respiro" de zoom no meio do caminho
// (a câmera sobe um pouco e mostra o quadro — o rastro fica menor na tela).
const PANS = [
  { t0: 2.92, t1: 3.66, dip: 0.34 },
  { t0: 7.50, t1: 8.24, dip: 0.34 },
  { t0: 11.72, t1: 12.44, dip: 0.34 },
  { t0: 15.30, t1: 15.98, dip: 0.24 },
  { t0: 22.95, t1: 23.65, dip: 0.30 },
  { t0: 29.50, t1: 30.24, dip: 0.34 },
  { t0: 31.80, t1: 32.52, dip: 0.34 },
];
const URL_C = [URL_X + 170, ADDR.y + ADDR.h / 2];
const CAM = [
  [0.00, [...S1, 1.000]],
  [2.92, [S1[0] + 10, S1[1] + 6, 1.030], E.inOutSoft],
  [3.66, [...S2, 1.000], E.inOut],
  [7.50, [S2[0] + 10, S2[1] + 8, 1.035], E.inOutSoft],
  [8.24, [...S3, 1.000], E.inOut],
  [11.72, [S3[0] + 10, S3[1] + 8, 1.040], E.inOutSoft],
  [12.44, [...S4, 1.000], E.inOut],
  [15.30, [S4[0] + 10, S4[1] + 8, 1.030], E.inOutSoft],
  [15.98, [...S5, 1.000], E.inOut],
  [22.95, [S5[0] + 12, S5[1] + 10, 1.045], E.inOutSoft],
  [23.65, [S6[0], S6[1] - 10, 0.940], E.inOut],
  [23.82, [S6[0] + 4, S6[1] - 8, 0.950], E.inOutSoft],
  [24.40, [...URL_C, 3.000], E.inOut],
  [25.86, [URL_C[0] + 70, URL_C[1], 3.050], E.inOutSoft],
  [26.62, [S6[0], S6[1] - 10, 0.940], E.inOut],
  [27.70, [S6[0], S6[1] - 4, 0.960], E.inOutSoft],
  [28.20, [S6[0], S6[1] + 20, 0.900], E.inOutStrong],
  [29.50, [S6[0], S6[1] + 20, 0.925], E.inOutSoft],
  [30.24, [...S7, 1.000], E.inOut],
  [31.80, [S7[0] + 8, S7[1] + 6, 1.030], E.inOutSoft],
  [32.52, [...S8, 1.000], E.inOut],
  [33.60, [S8[0], S8[1], 1.020], E.inOutSoft],
];

export function camAt(t) {
  const [cx, cy, z0] = kf(t, CAM);
  let dip = 0;
  for (const p of PANS) if (t > p.t0 && t < p.t1) dip = Math.max(dip, p.dip * Math.sin(Math.PI * (t - p.t0) / (p.t1 - p.t0)));
  // tremida curta no carimbo e no 00:00
  let sx = 0, sy = 0;
  for (const [ts, amp] of [[AW.por_mim + 0.06, 7], [COUNT.t1, 5]]) {
    const a = t - ts;
    if (a > 0) { const k = Math.exp(-a * 14) * amp; sx += Math.sin(a * 2 * Math.PI * 11) * k; sy += Math.cos(a * 2 * Math.PI * 9) * k * 0.7; }
  }
  return { cx: cx + fbm1(t * 0.2, 71) * 5 + sx, cy: cy + fbm1(t * 0.17, 73) * 4 + sy, z: z0 * (1 - dip) };
}


// ------------------------------------------------------------ utilidades
const type = (text, t, t0, cps = 26) => (t < t0 ? '' : text.slice(0, Math.min(text.length, Math.floor((fq(t) - t0) * cps) + 1)));

function typeLine(ctx, segs, x, y, t, t0, size, { cps = 26, shadow = true } = {}) {
  // segs: [{text, color}] digitados em sequência
  const full = segs.map((s) => s.text).join('');
  const shown = type(full, t, t0, cps);
  if (!shown) return null;
  let k = 0;
  const out = [];
  for (const s of segs) { const take = Math.max(0, Math.min(s.text.length, shown.length - k)); if (take > 0) out.push({ text: s.text.slice(0, take), color: s.color }); k += s.text.length; }
  setFont(ctx, FONTS.typeIt, size);
  ctx.save();
  const r = drawSegs(ctx, out, x, y, { ls: 2, shadow: shadow ? { color: 'rgba(0,0,0,0.6)', blur: 6, x: 3, y: 4 } : null });
  ctx.restore();
  return r;
}

function playIcon(ctx, cx, cy, s, color = '#FFFFFF') {
  ctx.fillStyle = color;
  ctx.beginPath(); ctx.moveTo(cx - s * 0.4, cy - s * 0.5); ctx.lineTo(cx + s * 0.55, cy); ctx.lineTo(cx - s * 0.4, cy + s * 0.5); ctx.closePath(); ctx.fill();
}

// selo vermelho do Flux (impressão de carimbo com falhas de tinta)
function fluxSealCanvas() {
  const S = 640;
  const c = makeCanvas(S, S);
  const g = c.getContext('2d');
  const cx = S / 2, cy = S / 2;
  g.strokeStyle = '#B21E2C'; g.fillStyle = '#B21E2C';
  g.lineWidth = 22; g.beginPath(); g.arc(cx, cy, 282, 0, Math.PI * 2); g.stroke();
  g.lineWidth = 7; g.beginPath(); g.arc(cx, cy, 222, 0, Math.PI * 2); g.stroke();
  const txt = 'TRUE CRIME DIGITAL • INVESTIGADO • ';
  g.font = '700 36px "FreeMonoBold"';
  const step = (Math.PI * 2) / txt.length;
  for (let i = 0; i < txt.length; i++) {
    const a = -Math.PI / 2 + i * step;
    g.save(); g.translate(cx + Math.cos(a) * 252, cy + Math.sin(a) * 252); g.rotate(a + Math.PI / 2);
    g.textAlign = 'center'; g.fillText(txt[i], 0, 12); g.restore();
  }
  g.font = '900 150px "Inter"'; g.textAlign = 'center';
  g.fillText('FLUX', cx - 22, cy + 50);
  g.fillRect(cx + 108, cy + 30, 70, 20);
  g.fillRect(cx - 160, cy - 110, 320, 8); g.fillRect(cx - 160, cy + 92, 320, 8);
  const r = mulberry32(9);
  g.globalCompositeOperation = 'destination-out';
  for (let i = 0; i < 1500; i++) { g.globalAlpha = 0.25 + r() * 0.75; g.beginPath(); g.arc(r() * S, r() * S, 1 + r() * r() * 6, 0, Math.PI * 2); g.fill(); }
  const grad = g.createLinearGradient(0, 0, S, S * 0.5);
  grad.addColorStop(0, 'rgba(0,0,0,0.4)'); grad.addColorStop(0.5, 'rgba(0,0,0,0)');
  g.globalAlpha = 1; g.fillStyle = grad; g.fillRect(0, 0, S, S);
  return c;
}

// assinatura manuscrita
const SIG = (() => {
  const pts = [];
  const ctrl = [[0, 0.55], [0.05, 0.15], [0.1, 0.8], [0.16, 0.3], [0.2, 0.75], [0.27, 0.42], [0.31, 0.62], [0.36, 0.2], [0.41, 0.85],
    [0.47, 0.45], [0.53, 0.6], [0.59, 0.25], [0.64, 0.7], [0.7, 0.4], [0.78, 0.6], [0.86, 0.32], [0.93, 0.55], [1, 0.45]];
  for (let i = 0; i < ctrl.length - 1; i++) {
    const [x0, y0] = ctrl[i], [x1, y1] = ctrl[i + 1];
    for (let k = 0; k < 6; k++) { const u = k / 6; pts.push([lerp(x0, x1, u), lerp(y0, y1, u * u * (3 - 2 * u))]); }
  }
  pts.push(ctrl[ctrl.length - 1]);
  return pts;
})();

export function createBoard() {
  const seal = fluxSealCanvas();

  // ---------------------------------------------------------- fundo do quadro
  function boardGrid(ctx, cam) {
    // pontos bem discretos presos à mesa: dão leitura de movimento nas panorâmicas
    const step = 120;
    const x0 = cam.cx - W / 2 / cam.z - step, x1 = cam.cx + W / 2 / cam.z + step;
    const y0 = cam.cy - H / 2 / cam.z - step, y1 = cam.cy + H / 2 / cam.z + step;
    ctx.fillStyle = 'rgba(200,205,210,0.055)';
    const s = 2.4 / cam.z;
    for (let x = Math.floor(x0 / step) * step; x < x1; x += step) for (let y = Math.floor(y0 / step) * step; y < y1; y += step) ctx.fillRect(x - s / 2, y - s / 2, s, s);
  }

  // ---------------------------------------------------------- 1 · linha do tempo
  const TL = { x0: 330, x1: 2230, y: 1000, marks: [560, 900, 1250, 1690, 2010], key: 1690 };
  function station1(ctx, t, fi) {
    const A = 1 - tw(t, 3.4, 3.9, E.linear);
    if (A <= 0) return;
    withAlpha(ctx, A, () => {
      const inP = tw(t, 0.0, 0.35, E.outQuart);
      // trilho
      ctx.fillStyle = '#2B2E31'; ctx.fillRect(TL.x0, TL.y - 4, (TL.x1 - TL.x0) * inP, 8);
      const ph = lerp(1000, 1610, E.out(tw(t, 0.0, AW.n30 - 0.05)));
      ctx.fillStyle = PAL.hudRed; ctx.fillRect(TL.x0, TL.y - 4, (ph - TL.x0) * inP, 8);
      TL.marks.forEach((x, i) => {
        if (x > TL.x0 + (TL.x1 - TL.x0) * inP) return;
        const key = x === TL.key;
        ctx.fillStyle = key ? PAL.redBox : '#4A4D50';
        ctx.fillRect(x - 1.5, TL.y - (key ? 22 : 14), 3, key ? 44 : 28);
        setFont(ctx, FONTS.mono, 22, 500);
        drawSegs(ctx, [{ text: String(i + 1).padStart(2, '0'), color: '#5E6164' }], x, TL.y + 58, { ls: 3, align: 'center' });
      });
      // marcador "MADRUGADA DO DIA 30"
      const mk = decode('MADRUGADA DO DIA 30', t, AW.madrugada - 0.04, { cps: 28, seed: 901, fi });
      if (mk.visible) {
        ctx.save();
        ctx.strokeStyle = PAL.redBox; ctx.lineWidth = 2; ctx.setLineDash([8, 7]);
        const lp = tw(t, AW.madrugada - 0.04, AW.madrugada + 0.3, E.outQuart);
        ctx.beginPath(); ctx.moveTo(TL.key, TL.y - 26); ctx.lineTo(TL.key, lerp(TL.y - 26, TL.y - 150, lp)); ctx.stroke();
        ctx.setLineDash([]);
        ctx.restore();
        setFont(ctx, FONTS.mono, 30, 700);
        drawSegs(ctx, [{ text: mk.text, color: PAL.red }], TL.key, TL.y - 172, { ls: 5, align: 'center', glow: { color: PAL.red, blur: 12, alpha: 0.35 } });
      }
      // a distância que falta até a madrugada
      const gap = tw(t, AW.n30, AW.n30 + 0.3, E.outQuart);
      if (gap > 0) {
        ctx.save(); ctx.strokeStyle = 'rgba(224,69,81,0.6)'; ctx.lineWidth = 2; ctx.setLineDash([4, 6]);
        ctx.beginPath(); ctx.moveTo(ph + 22, TL.y); ctx.lineTo(lerp(ph + 22, TL.key - 6, gap), TL.y); ctx.stroke(); ctx.restore();
      }
      // cabeça de leitura
      ctx.save();
      shadowOn(ctx, { color: 'rgba(0,0,0,0.6)', blur: 8, x: 2, y: 3 });
      ctx.fillStyle = '#EEF0F0'; ctx.beginPath(); ctx.arc(ph, TL.y, 17 * inP, 0, Math.PI * 2); ctx.fill();
      shadowOff(ctx);
      ctx.strokeStyle = PAL.hudRed; ctx.lineWidth = 4; ctx.beginPath(); ctx.arc(ph, TL.y, 17 * inP, 0, Math.PI * 2); ctx.stroke();
      ctx.restore();
      // pausa
      const pz = tw(t, AW.n30 + 0.06, AW.n30 + 0.3, E.outBack);
      if (pz > 0) {
        ctx.save();
        ctx.translate(ph, TL.y - 110); ctx.scale(pz, pz);
        shadowOn(ctx, { color: 'rgba(0,0,0,0.6)', blur: 8, x: 3, y: 4 });
        ctx.fillStyle = '#EEF0F0'; ctx.fillRect(-26, -38, 18, 76); ctx.fillRect(8, -38, 18, 76);
        ctx.restore();
        const pd = decode('PAUSADO', t, AW.n30 + 0.15, { cps: 24, seed: 902, fi });
        setFont(ctx, FONTS.mono, 22, 700);
        drawSegs(ctx, [{ text: pd.text, color: '#B9BBBC' }], ph, TL.y - 44 - 8, { ls: 6, align: 'center' });
      }
    });
  }

  // ---------------------------------------------------------- 2 · FLUX_ = 1 PESSOA / SEM…
  function station2(ctx, t, fi) {
    if (t < 3.1 || t > 8.6) return;
    const L0 = AW.o_flux - 0.04;
    const letterP = [0, 1, 2, 3].map((i) => tw(t, L0 + i * (2 / 24), L0 + i * (2 / 24) + 0.32, E.linear));
    const base = 800, size = 250, lx = 3420;
    const lg = fluxLogo(ctx, lx, base, size, {
      letterP, underscore: tw(t, L0 + 0.26, L0 + 0.5, E.linear), box: tw(t, L0 + 0.3, L0 + 0.8, E.linear),
    });
    // "=" "1" "PESSOA" "SÓ."
    const eqA = tw(t, AW.e - 0.02, AW.e + 0.14, E.outQuart);
    if (eqA > 0) {
      ctx.save(); ctx.globalAlpha *= eqA;
      setFont(ctx, FONTS.big, 190); ctx.fillStyle = '#9A9D9F';
      ctx.fillText('=', lg.x1 + 70, base - 36 + (1 - eqA) * 20);
      ctx.restore();
    }
    const oneP = tw(t, AW.uma - 0.02, AW.uma + 0.2, E.outBack);
    const ox = lg.x1 + 230;
    if (oneP > 0) {
      ctx.save();
      ctx.translate(ox + 70, base - 120); ctx.scale(lerp(0.6, 1, oneP), lerp(0.6, 1, oneP)); ctx.translate(-(ox + 70), -(base - 120));
      ctx.globalAlpha *= clamp(oneP * 2);
      shadowOn(ctx, { color: 'rgba(0,0,0,0.75)', blur: 4, x: 6, y: 7 });
      setFont(ctx, FONTS.big, 330); ctx.fillStyle = PAL.white;
      ctx.fillText('1', ox, base + 4);
      ctx.restore();
    }
    const pd = decode('PESSOA', t, AW.pessoa - 0.02, { cps: 26, seed: 910, fi });
    if (pd.visible) {
      setFont(ctx, FONTS.mono, 70, 800);
      drawSegs(ctx, [{ text: pd.text, color: PAL.white }], ox + 190, base - 118, { ls: 8, shadow: { color: 'rgba(0,0,0,0.6)', blur: 6, x: 3, y: 4 } });
    }
    typeLine(ctx, [{ text: 'SÓ.', color: PAL.red }], ox + 194, base - 6, t, AW.so, 96, { cps: 14 });
    // sublinhado dourado sob "PESSOA SÓ."
    underline(ctx, ox + 190, ox + 190 + 420, base + 26, tw(t, AW.so + 0.1, AW.so + 0.5, E.outQuart), { color: PAL.gold, lw: 3 });
    // SEM EQUIPE / SEM ESTÚDIO / SEM PRODUTORA
    const rows = [['EQUIPE.', AW.sem1], ['ESTÚDIO.', AW.sem2], ['PRODUTORA.', AW.sem3]];
    rows.forEach(([w, t0], i) => {
      typeLine(ctx, [{ text: 'SEM ', color: PAL.red }, { text: w, color: PAL.white }], lx + 40, 1040 + i * 92, t, t0 - 0.02, 66, { cps: 22 });
    });
    // risco fino em cada "SEM ..." quando a próxima linha entra (riscado de "lista")
    const ul = tw(t, AW.produtora_end - 0.1, AW.produtora_end + 0.3, E.outQuart);
    underline(ctx, lx + 40, lx + 40 + 640, 1040 + 2 * 92 + 22, ul, { color: PAL.gold, lw: 3 });
  }

  // ---------------------------------------------------------- 3 · ficha do caso
  const CARD3 = { x: 6790, y: 420, w: 720, h: 920 };
  function caseCard(ctx, t, fi) {
    const { x, y, w, h } = CARD3;
    ctx.save();
    shadowOn(ctx, { color: 'rgba(0,0,0,0.65)', blur: 18, x: 6, y: 10 });
    ctx.fillStyle = PAL.paper; ctx.fillRect(x, y, w, h);
    shadowOff(ctx);
    ctx.fillStyle = PAL.redDeep; ctx.fillRect(x, y, w, 76);
    setFont(ctx, '"FreeMonoBold"', 50); ctx.fillStyle = PAL.paper; ctx.letterSpacing = '4px';
    ctx.fillText('CASO', x + 34, y + 54);
    setFont(ctx, FONTS.mono, 28, 800); ctx.letterSpacing = '2px';
    ctx.fillText('FLUX_', x + w - 150, y + 50);
    const d = decode('CADA CASO QUE CHEGA AO CANAL', t, AW.cada, { cps: 34, seed: 920, fi });
    setFont(ctx, FONTS.mono, 23, 700);
    drawSegs(ctx, [{ text: d.text, color: '#6A6964' }], x + 36, y + 136, { ls: 2 });
    ctx.fillStyle = '#C9C5BB'; ctx.fillRect(x + 36, y + 162, w - 72, 2);
    const items = [['ESCOLHIDO', AW.escolhido], ['INVESTIGADO', AW.investigado], ['MONTADO', AW.montado]];
    items.forEach(([label, tc], i) => {
      const ry = y + 250 + i * 140;
      ctx.strokeStyle = '#3A3A38'; ctx.lineWidth = 4; ctx.strokeRect(x + 46, ry - 46, 58, 58);
      const ld = decode(label, t, tc - 0.18, { cps: 30, seed: 930 + i, fi });
      setFont(ctx, FONTS.type, 62); ctx.letterSpacing = '2px';
      drawSegs(ctx, [{ text: ld.text, color: '#23211E' }], x + 140, ry, { ls: 2 });
      const cp = tw(t, tc + 0.02, tc + 0.24, E.inOut);
      if (cp > 0) {
        ctx.save(); ctx.lineCap = 'round'; ctx.lineJoin = 'round';
        drawPolyline(ctx, [[x + 52, ry - 20], [x + 72, ry + 2], [x + 112, ry - 58]], cp, { color: '#B21E2C', width: 10 });
        ctx.restore();
      }
    });
    // assinatura
    ctx.fillStyle = '#6D6A63'; ctx.fillRect(x + 36, y + h - 120, 420, 2);
    setFont(ctx, FONTS.mono, 20, 700);
    drawSegs(ctx, [{ text: 'RESPONSÁVEL', color: '#6A6964' }], x + 36, y + h - 88, { ls: 3 });
    const sp = tw(t, AW.por_mim - 0.04, AW.por_mim + 0.32, E.inOut);
    if (sp > 0) {
      ctx.save(); ctx.lineCap = 'round'; ctx.lineJoin = 'round';
      drawPolyline(ctx, SIG.map(([u, v]) => [x + 50 + u * 380, y + h - 196 + v * 70]), sp, { color: '#1E2A44', width: 5 });
      ctx.restore();
    }
    ctx.restore();
  }

  function station3(ctx, t, fi) {
    if (t < 7.3 || t > 12.9) return;
    // três fichas chegam e empilham (a de cima é o caso)
    const backs = [[-0.07, -30, 24], [0.05, 26, -18]];
    backs.forEach(([rot, dx, dy], i) => {
      const p = tw(t, AW.cada - 0.2 + i * (3 / 24), AW.cada + 0.25 + i * (3 / 24), E.outQuart);
      if (p <= 0) return;
      ctx.save();
      ctx.translate(CARD3.x + CARD3.w / 2 + dx + (1 - p) * -900, CARD3.y + CARD3.h / 2 + dy);
      ctx.rotate(rot * p);
      shadowOn(ctx, { color: 'rgba(0,0,0,0.6)', blur: 16, x: 5, y: 8 });
      ctx.fillStyle = i ? '#D3D1C9' : '#C9C6BD';
      ctx.fillRect(-CARD3.w / 2, -CARD3.h / 2, CARD3.w, CARD3.h);
      shadowOff(ctx);
      ctx.fillStyle = '#6E1A24'; ctx.fillRect(-CARD3.w / 2, -CARD3.h / 2, CARD3.w, 76);
      ctx.restore();
    });
    const p = tw(t, AW.cada - 0.1 + 6 / 24, AW.cada + 0.4 + 6 / 24, E.outQuart);
    if (p > 0) {
      ctx.save();
      ctx.translate((1 - p) * -1000, 0);
      caseCard(ctx, t, fi);
      // carimbo FLUX bate em "por mim"
      const st = AW.por_mim + 0.04;
      if (t >= st - 0.08) {
        const k = tw(t, st - 0.08, st, E.inQuad);
        const sc = lerp(1.7, 1, k);
        ctx.save();
        ctx.translate(CARD3.x + CARD3.w - 190, CARD3.y + CARD3.h - 200);
        ctx.rotate(-0.21);
        ctx.scale(sc, sc);
        ctx.globalAlpha *= 0.9 * clamp(k * 1.5);
        ctx.drawImage(seal, -150, -150, 300, 300);
        ctx.restore();
      }
      ctx.restore();
    }
    typeLine(ctx, [{ text: 'POR ', color: PAL.white }, { text: 'MIM.', color: PAL.red }], CARD3.x + CARD3.w + 90, CARD3.y + CARD3.h - 110, t, AW.por_mim, 92, { cps: 16 });
  }

  // ---------------------------------------------------------- 4 · objetivo
  const VIDS = [
    { x: 9300, y: 930, w: 380, h: 214, label: 'VÍDEO 1' },
    { x: 9770, y: 820, w: 420, h: 236, label: 'VÍDEO 2' },
    { x: 10280, y: 700, w: 460, h: 259, label: 'VÍDEO 3' },
    { x: 10830, y: 560, w: 520, h: 292, label: 'O PRÓXIMO' },
  ];
  function station4(ctx, t, fi) {
    if (t < 11.6 || t > 16.3) return;
    const od = decode('OBJETIVO', t, AW.objetivo - 0.06, { cps: 26, seed: 940, fi });
    if (od.visible) {
      ctx.fillStyle = PAL.hudRed; ctx.fillRect(9300, 404, 22, 22);
      setFont(ctx, FONTS.mono, 34, 700);
      drawSegs(ctx, [{ text: od.text, color: PAL.title }], 9346, 428, { ls: 6 });
    }
    typeLine(ctx, [{ text: 'É SIMPLES.', color: PAL.white }], 9300, 530, t, AW.simples - 0.1, 78, { cps: 20 });
    VIDS.forEach((v, i) => {
      const t0 = AW.fazer + i * 0.12;
      const p = tw(t, t0, t0 + 0.3, E.outQuart);
      if (p <= 0) return;
      const last = i === VIDS.length - 1;
      const hot = last ? tw(t, AW.melhor - 0.04, AW.melhor + 0.2, E.outQuart) : 0;
      ctx.save();
      ctx.globalAlpha *= clamp(p * 1.5);
      ctx.translate(v.x + v.w / 2, v.y + v.h / 2 + (1 - p) * 40);
      const sc = lerp(0.9, 1, p) * (1 + 0.05 * hot);
      ctx.scale(sc, sc);
      ctx.translate(-v.w / 2, -v.h / 2);
      shadowOn(ctx, { color: 'rgba(0,0,0,0.6)', blur: 12, x: 4, y: 7 });
      const g = ctx.createLinearGradient(0, 0, 0, v.h);
      g.addColorStop(0, '#1F2327'); g.addColorStop(1, '#121417');
      ctx.fillStyle = g; ctx.fillRect(0, 0, v.w, v.h);
      shadowOff(ctx);
      ctx.strokeStyle = hot > 0.3 ? PAL.redBox : '#5E6266'; ctx.lineWidth = hot > 0.3 ? 3 : 2;
      ctx.strokeRect(1, 1, v.w - 2, v.h - 2);
      // cada vídeo um pouco mais rico que o anterior
      ctx.fillStyle = PAL.hudRed; if (i >= 1) ctx.fillRect(18, 18, 12, 12);
      if (i >= 2) { ctx.fillStyle = '#3E4245'; ctx.fillRect(40, 23, v.w * 0.4, 2); }
      if (i >= 3) fluxLogo(ctx, v.w - 150, v.h - 30, 40, { box: 0 });
      playIcon(ctx, v.w / 2, v.h / 2, v.h * 0.22, hot > 0.3 ? PAL.red : '#D9DBDB');
      ctx.fillStyle = '#2B2E31'; ctx.fillRect(0, v.h - 8, v.w, 8);
      ctx.fillStyle = PAL.hudRed; ctx.fillRect(0, v.h - 8, v.w * (0.25 + i * 0.22), 8);
      ctx.restore();
      setFont(ctx, FONTS.mono, 24, 700);
      drawSegs(ctx, [{ text: v.label, color: last ? PAL.red : '#7E8285' }], v.x, v.y + v.h + 44, { ls: 4 });
      if (last && hot > 0) transformBox(ctx, v.x - 26, v.y - 26, v.w + 52, v.h + 52, hot, { color: PAL.redBox, hs: 14 });
    });
    typeLine(ctx, [{ text: 'MELHOR ', color: PAL.red }, { text: 'QUE O ANTERIOR.', color: PAL.white }], 9300, 1370, t, AW.melhor - 0.02, 76, { cps: 22 });
  }

  // ---------------------------------------------------------- 5 · medidores
  const METERS = [
    { label: 'ANIMAÇÃO', more: 'MAIS ELABORADA', t0: AW.elaborada - 0.04 },
    { label: 'SOM', more: 'MAIS TRABALHADO', t0: AW.trabalhado - 0.04 },
    { label: 'INVESTIGAÇÃO', more: 'MAIS COMPLETA', t0: AW.completa - 0.04 },
  ];
  function station5(ctx, t, fi) {
    if (t < 15.1 || t > 24.0) return;
    const X0 = 9180, SEGW = 86, GAP = 14;
    const goal = tw(t, AW.chegar - 0.06, AW.chegar + 0.2, E.outQuart);
    const glowGoal = goal > 0 ? 0.5 + 0.5 * Math.sin((t - AW.chegar) * Math.PI * 2 * 1.6) : 0;
    METERS.forEach((m, r) => {
      const ry = 2040 + r * 220;
      const a0 = AW.animacao - 0.12 + r * (3 / 24);
      const ld = decode(m.label, t, a0, { cps: 30, seed: 950 + r, fi });
      if (!ld.visible) return;
      setFont(ctx, FONTS.mono, 46, 800);
      drawSegs(ctx, [{ text: ld.text, color: PAL.white }], X0, ry, { ls: 5, shadow: { color: 'rgba(0,0,0,0.6)', blur: 6, x: 3, y: 4 } });
      for (let k = 0; k < 10; k++) {
        const sx = X0 + k * (SEGW + GAP), sy = ry + 34;
        const on0 = tw(t, a0 + 0.12 + k * (1 / 24), a0 + 0.16 + k * (1 / 24), E.linear);
        if (on0 <= 0) continue;
        ctx.save(); ctx.globalAlpha *= on0;
        const base = k < 5;
        const up = !base ? tw(t, m.t0 + (k - 5) * (2 / 24), m.t0 + (k - 5) * (2 / 24) + 0.08, E.linear) : 0;
        if (base) { ctx.fillStyle = '#C9CBCB'; ctx.fillRect(sx, sy, SEGW, 44); }
        else if (up > 0) {
          ctx.fillStyle = PAL.red; ctx.globalAlpha *= up;
          ctx.shadowColor = PAL.red; ctx.shadowBlur = 16 + 18 * glowGoal * goal; ctx.fillRect(sx, sy, SEGW, 44);
        } else { ctx.strokeStyle = '#4A4D50'; ctx.lineWidth = 2; ctx.strokeRect(sx + 1, sy + 1, SEGW - 2, 42); }
        ctx.restore();
      }
      typeLine(ctx, [{ text: m.more, color: PAL.white }], X0 + 10 * (SEGW + GAP) + 50, ry + 72, t, m.t0, 62, { cps: 24 });
    });
    // "chegar lá": caixa tracejada em volta dos segmentos novos
    if (goal > 0) {
      const gx = X0 + 5 * (SEGW + GAP) - 16, gy = 2040 + 34 - 16, gw = 5 * (SEGW + GAP) + 18, gh = 2 * 220 + 44 + 32;
      ctx.save(); ctx.globalAlpha *= goal;
      ctx.strokeStyle = PAL.red; ctx.lineWidth = 2.5; ctx.setLineDash([12, 9]);
      ctx.strokeRect(gx, gy, gw, gh); ctx.setLineDash([]);
      ctx.restore();
      const md = decode('META', t, AW.chegar, { cps: 20, seed: 958, fi });
      setFont(ctx, FONTS.mono, 26, 800);
      drawSegs(ctx, [{ text: md.text, color: PAL.red }], gx, gy - 16, { ls: 8, glow: { color: PAL.red, blur: 10, alpha: 0.35 } });
    }
    const vd = decode('SE ESSE VÍDEO ESTÁ VALENDO SEU TEMPO,', t, AW.se_esse, { cps: 34, seed: 959, fi });
    if (vd.visible) {
      setFont(ctx, FONTS.mono, 32, 700);
      drawSegs(ctx, [{ text: vd.text, color: '#B9BBBC' }], X0, 2740, { ls: 4 });
    }
    typeLine(ctx, [{ text: 'VOCÊ PODE ME AJUDAR A ', color: PAL.white }, { text: 'CHEGAR LÁ.', color: PAL.red }], X0, 2846, t, AW.voce - 0.02, 70, { cps: 24 });
  }

  // ---------------------------------------------------------- 6 · navegador
  const URL = 'apoia.se/flux';
  const TYPE_T = [AW.apoia, AW.apoia + 0.08, AW.apoia + 0.16, AW.apoia + 0.24, AW.apoia + 0.32,
    AW.ponto_se, AW.ponto_se + 0.1, AW.ponto_se + 0.2,
    AW.barra_flux, AW.barra_flux + 0.1, AW.barra_flux + 0.2, AW.barra_flux + 0.3, AW.barra_flux + 0.4];
  const ENTER = AW.flux_end + 0.04;
  // cursor: [t, [x, y]] na mesa
  const SEG10 = [9180 + 9 * 100 + 50, 2040 + 2 * 220 + 34 + 30];
  const CUR = [
    [AW.voce + 0.1, [S5[0] + 1500, S5[1] + 900]],
    [AW.la - 0.05, [SEG10[0] + 10, SEG10[1] + 6], E.inOutStrong],
    [22.95, [SEG10[0] + 14, SEG10[1] + 10]],
    [23.62, [URL_X + 120, ADDR.y + ADDR.h / 2 + 4], E.inOutStrong],
    [ENTER + 0.3, [URL_X + 120, ADDR.y + ADDR.h / 2 + 4]],
    [ENTER + 0.9, [URL_X + 160, ADDR.y + 200], E.inOut],
    [AW.qualquer, [BTN[0] - 260, BTN[1] + 220], E.inOut],
    [AW.valor - 0.1, [BTN[0] + 20, BTN[1] + 10], E.inOutStrong],
    [AW.quem_apoia + 0.4, [BTN[0] + 24, BTN[1] + 12]],
  ];
  function station6(ctx, t, fi) {
    if (t < 22.9 || t > 30.6) return;
    const tIn = 23.18;
    if (t < tIn) return;
    const sp = spring(t, tIn, 2.6, 0.72);
    const s = lerp(0.9, 1, sp);
    const op = clamp((t - tIn) / 0.12);
    let n = 0;
    for (const tc of TYPE_T) if (fq(t) >= tc) n++;
    const focus = tw(t, 23.66, 23.74, E.linear);
    const load = tw(t, ENTER + 0.02, ENTER + 0.6, E.inOut) * (t > ENTER ? 1 : 0) + (t > ENTER + 0.6 ? tw(t, ENTER + 0.6, ENTER + 0.8, E.linear) * 0.2 : 0);
    const reveal = tw(t, ENTER + 0.12, ENTER + 1.0, E.out);
    const hover = tw(t, AW.valor - 0.1, AW.valor, E.linear);
    const press = env(t, AW.valor, AW.valor + 0.04, AW.valor + 0.1, AW.valor + 0.2, E.linear, E.linear);
    const caretOn = t >= 23.68 && t < ENTER + 0.1 && (Math.floor(fq(t) * 2.5) % 2 === 0 || (n > 0 && n < URL.length));
    const B = {
      w: BROWSER.w, h: BROWSER.h,
      caption: reveal > 0.3 ? 'Flux — Crimes Digitais do Brasil · Apoia.se' : 'Nova guia',
      url: URL.slice(0, n), caret: caretOn, focus: t < ENTER + 0.1 ? focus : 0, load, reveal, hover, press,
    };
    ctx.save();
    ctx.globalAlpha *= op;
    ctx.translate(BROWSER.x + BROWSER.w / 2, BROWSER.y + BROWSER.h / 2 + (1 - sp) * 50);
    ctx.scale(s, s);
    ctx.translate(-BROWSER.w / 2, -BROWSER.h / 2);
    drawBrowser(ctx, B);
    ctx.restore();

    // "QUALQUER VALOR AJUDA." + as três recompensas da página
    const dim = tw(t, AW.qualquer - 0.1, AW.qualquer + 0.25, E.inOut) * (1 - tw(t, 30.0, 30.3, E.linear));
    if (dim > 0) {
      ctx.save(); ctx.fillStyle = `rgba(6,7,9,${0.78 * dim})`;
      ctx.fillRect(BROWSER.x + FR, BROWSER.y + TB, BROWSER.w - FR * 2, BROWSER.h - TB - FR);
      ctx.restore();
    }
    typeLine(ctx, [{ text: 'QUALQUER ', color: PAL.white }, { text: 'VALOR ', color: PAL.gold }, { text: 'AJUDA.', color: PAL.white }], BROWSER.x + 230, BROWSER.y + 490, t, AW.qualquer, 82, { cps: 22 });
    const CS = 1.42;
    [0, 1, 2].forEach((i) => {
      const t0 = AW.valor + 0.1 + i * (3 / 24);
      const p = tw(t, t0, t0 + 0.36, E.outQuart);
      if (p <= 0) return;
      const glow = i === 1 ? tw(t, AW.quem_apoia + 0.1, AW.quem_apoia + 0.35, E.outQuart) : 0;
      const fx = BROWSER.x + 230 + i * (CARD.w * CS + 46);
      const fy = BROWSER.y + 560;
      // saem do botão verde e abrem em leque
      const sx = lerp(BTN[0] - CARD.w * CS / 2, fx, p), sy = lerp(BTN[1], fy, p);
      const sc = lerp(0.3, CS, p) * (1 + 0.07 * glow);
      ctx.save();
      ctx.translate(sx + CARD.w * sc / 2, sy + CARD.h * sc / 2);
      ctx.rotate((1 - p) * (i - 1) * 0.12);
      ctx.scale(sc, sc);
      ctx.translate(-CARD.w / 2, -CARD.h / 2);
      ctx.globalAlpha *= clamp(p * 2) * (1 - 0.55 * (i !== 1 ? tw(t, AW.quem_apoia + 0.1, AW.quem_apoia + 0.35, E.linear) : 0));
      drawRewardCard(ctx, i, { glow });
      ctx.restore();
    });

  }

  // cursor: posição na mesa, desenhado em tela (tamanho fixo, como o do sistema)
  const CLICKS = [23.68, AW.valor + 0.02];
  function cursor(ctx, t, cam) {
    if (t < CUR[0][0] || t >= 29.9) return;
    const [dx, dy] = kf(t, CUR);
    const x = (dx - cam.cx) * cam.z + W / 2, y = (dy - cam.cy) * cam.z + H / 2;
    let click = -1;
    for (const tc of CLICKS) if (t >= tc && t < tc + 0.4) click = (t - tc) / 0.4;
    drawCursor(ctx, x, y, 44, click);
  }

  // "O link também está na descrição" (em tela)
  function linkCallout(ctx, t, fi) {
    const A = env(t, AW.link, AW.link + 0.12, AW.descricao_end + 0.15, AW.descricao_end + 0.35, E.linear, E.linear);
    if (A <= 0) return;
    withAlpha(ctx, A, () => {
      const cx = W / 2, y = 1230;
      ctx.save();
      shadowOn(ctx, { color: 'rgba(0,0,0,0.7)', blur: 14, x: 0, y: 6 });
      ctx.fillStyle = 'rgba(14,16,18,0.92)';
      ctx.fillRect(cx - 360, y - 62, 720, 92);
      shadowOff(ctx);
      ctx.strokeStyle = PAL.redBox; ctx.lineWidth = 2; ctx.strokeRect(cx - 359, y - 61, 718, 90);
      ctx.restore();
      const d = decode('LINK NA DESCRIÇÃO', t, AW.link + 0.06, { cps: 30, seed: 960, fi });
      setFont(ctx, FONTS.mono, 38, 800);
      drawSegs(ctx, [{ text: d.text, color: PAL.white }], cx - 40, y - 2, { ls: 6, align: 'center' });
      // seta para baixo quicando (molinha amortecida)
      const b = Math.abs(dampedSine(t, AW.link + 0.1, 2.2, 2.0, 0)) * 16;
      ctx.save(); ctx.translate(cx + 272, y - 16 + b);
      ctx.fillStyle = PAL.red;
      ctx.fillRect(-6, -26, 12, 26);
      ctx.beginPath(); ctx.moveTo(-20, 0); ctx.lineTo(20, 0); ctx.lineTo(0, 22); ctx.closePath(); ctx.fill();
      ctx.restore();
    });
  }

  // ---------------------------------------------------------- 7 · créditos
  const ROWS = 18, ROW_H = 96;
  const HERO = 6;
  function station7(ctx, t, fi) {
    if (t < 29.2 || t > 33.0) return;
    const PW = 1100, PH = 1000, PX = S7[0] - 900, PY = S7[1] - 470;
    const PCX = PX + PW / 2;
    const A = tw(t, 29.3, 29.7, E.linear);
    withAlpha(ctx, A, () => {
      ctx.save();
      shadowOn(ctx, { color: 'rgba(0,0,0,0.6)', blur: 20, x: 0, y: 10 });
      ctx.fillStyle = '#0B0C0E'; ctx.fillRect(PX, PY, PW, PH);
      shadowOff(ctx);
      ctx.strokeStyle = '#2B2E31'; ctx.lineWidth = 2; ctx.strokeRect(PX + 1, PY + 1, PW - 2, PH - 2);
      const td = decode('APOIADORES', t, 29.45, { cps: 26, seed: 970, fi });
      setFont(ctx, FONTS.mono, 40, 800);
      drawSegs(ctx, [{ text: td.text, color: PAL.title }], PCX, PY + 100, { ls: 16, align: 'center' });
      ctx.fillStyle = '#2B2E31'; ctx.fillRect(PX + 200, PY + 140, PW - 400, 2);
      // rolagem dos créditos (nomes tarjados) — a linha "SEU NOME AQUI" passa no centro em "créditos"
      ctx.save();
      ctx.beginPath(); ctx.rect(PX, PY + 160, PW, PH - 180); ctx.clip();
      const speed = 110;
      const yHero = PY + PH / 2 + 60 - (t - AW.creditos) * speed;
      const rnd = mulberry32(31);
      for (let r = 0; r < ROWS; r++) {
        const y = yHero + (r - HERO) * ROW_H;
        const ww = 200 + rnd() * 380;
        if (y < PY + 110 || y > PY + PH + 60) continue;
        const fade = clamp((y - (PY + 160)) / 130) * clamp((PY + PH - 20 - y) / 130);
        ctx.save(); ctx.globalAlpha *= fade;
        if (r === HERO) {
          const hp = tw(t, AW.creditos - 0.1, AW.creditos + 0.2, E.outQuart);
          setFont(ctx, FONTS.type, 64);
          const label = 'SEU NOME AQUI';
          const lw = measure(ctx, label, 3);
          drawSegs(ctx, [{ text: label, color: hp > 0 ? PAL.gold : '#3A3D40' }], PCX, y + 22, { ls: 3, align: 'center', glow: hp > 0 ? { color: PAL.gold, blur: 14, alpha: 0.4 * hp } : null });
          if (hp > 0) transformBox(ctx, PCX - lw / 2 - 30, y - 42, lw + 60, 84, hp, { color: PAL.gold, hs: 12 });
        } else {
          ctx.fillStyle = '#1D2023'; ctx.fillRect(PCX - ww / 2, y - 18, ww, 36);
          ctx.fillStyle = 'rgba(255,255,255,0.03)'; ctx.fillRect(PCX - ww / 2, y - 18, ww, 2);
        }
        ctx.restore();
      }
      ctx.restore();
      ctx.restore();
    });
    // legenda
    const c1 = decode('NOS CRÉDITOS DOS', t, AW.aparece + 0.1, { cps: 30, seed: 980, fi });
    const c2 = decode('PRÓXIMOS VÍDEOS', t, AW.proximos - 0.04, { cps: 26, seed: 981, fi });
    setFont(ctx, FONTS.mono, 30, 700);
    drawSegs(ctx, [{ text: c1.text, color: '#B9BBBC' }], PX + PW + 70, S7[1] - 20, { ls: 6 });
    setFont(ctx, FONTS.typeIt, 76);
    drawSegs(ctx, [{ text: c2.text, color: PAL.white }], PX + PW + 64, S7[1] + 72, { ls: 2, shadow: { color: 'rgba(0,0,0,0.6)', blur: 6, x: 3, y: 4 } });
  }

  // ---------------------------------------------------------- 8 · obrigado (em tela)
  function station8(ctx, t, fi) {
    if (t < AW.desde - 0.1) return;
    const d = decode('DESDE JÁ,', t, AW.desde, { cps: 22, seed: 990, fi });
    setFont(ctx, FONTS.mono, 34, 700);
    drawSegs(ctx, [{ text: d.text, color: '#B9BBBC' }], W / 2, 900, { ls: 10, align: 'center' });
    const op = tw(t, AW.agradeco - 0.04, AW.agradeco + 0.08, E.linear);
    if (op > 0) {
      setFont(ctx, FONTS.typeIt, 132);
      ctx.letterSpacing = '4px';
      const word = 'OBRIGADO.';
      const shown = type(word, t, AW.agradeco - 0.04, 22);
      ctx.save(); shadowOn(ctx, { color: 'rgba(0,0,0,0.6)', blur: 8, x: 4, y: 5 });
      ctx.fillStyle = PAL.white; ctx.textAlign = 'center';
      const full = measure(ctx, word, 4);
      ctx.textAlign = 'left';
      ctx.fillText(shown, W / 2 - full / 2, 1060);
      ctx.restore();
      underline(ctx, W / 2 - full / 2, W / 2 + full / 2, 1090, tw(t, AW.agradeco + 0.2, AW.agradeco + 0.55, E.outQuart), { color: PAL.gold, lw: 4 });
    }
    const fa = tw(t, AW.ja, AW.ja + 0.3, E.outQuart);
    if (fa > 0) {
      withAlpha(ctx, fa, () => {
        fluxAvatar(ctx, W / 2 - 200, 1220, 42);
        setFont(ctx, FONTS.mono, 38, 800);
        drawSegs(ctx, [{ text: 'apoia.se/flux', color: PAL.white }], W / 2 - 140, 1234, { ls: 3 });
      });
    }
  }

  // ---------------------------------------------------------- contagem regressiva
  // grande no centro em "30 segundos" -> voa para o canto -> volta no fim
  function timerState(t) {
    const big = { x: W / 2, y: 610, size: 260 };
    const corner = { x: 2445, y: 141, size: 46 };
    const fly1 = tw(t, 2.92, 3.42, E.inOutStrong);
    const fly2 = tw(t, 31.82, 32.3, E.inOutStrong);
    let p = 1 - fly1;            // 1 = grande
    if (t > 31.82) p = fly2;
    const x = lerp(corner.x, big.x, p), y = lerp(corner.y, big.y, p), size = lerp(corner.size, big.size, p);
    return { x, y, size, p };
  }
  function countdown(ctx, t, fi) {
    if (t < AW.s30 - 0.02) return;
    const st = timerState(t);
    const rem = Math.max(0, Math.ceil(COUNT.t1 - fq(t) - 1e-6));
    const txt = `00:${String(Math.min(30, rem)).padStart(2, '0')}`;
    const pop = tw(t, AW.s30 - 0.02, AW.s30 + 0.16, E.outBack);
    const pulse = env(t, AW.tempo - 0.04, AW.tempo + 0.08, AW.tempo + 0.2, AW.tempo + 0.5, E.out, E.inOut);
    const zero = t >= COUNT.t1;
    ctx.save();
    const align = st.p > 0.5 ? 'center' : 'right';
    ctx.translate(st.x, st.y);
    const sc = (t < 2.92 ? lerp(0.82, 1, pop) : 1) * (1 + 0.32 * pulse);
    ctx.scale(sc, sc);
    ctx.globalAlpha *= clamp(pop * 2);
    setFont(ctx, FONTS.mono, st.size, 800);
    ctx.letterSpacing = `${st.size * 0.02}px`;
    const w = ctx.measureText(txt).width;
    // ancoragem: centro quando grande, borda direita no canto
    const ax = lerp(-w, -w / 2, clamp((st.p - 0.0) / 1));
    const col = zero || pulse > 0.2 ? PAL.red : PAL.white;
    shadowOn(ctx, { color: 'rgba(0,0,0,0.7)', blur: 8, x: 3, y: 5 });
    ctx.fillStyle = col;
    ctx.fillText(txt, ax, 0);
    shadowOff(ctx);
    if (zero || pulse > 0.2) { ctx.shadowColor = PAL.red; ctx.shadowBlur = 24; ctx.globalAlpha *= 0.45; ctx.fillText(txt, ax, 0); }
    ctx.restore();
    // ícone de pausa ao lado (no canto)
    if (st.p < 0.4) {
      const a = 1 - st.p / 0.4;
      ctx.save(); ctx.globalAlpha *= a;
      setFont(ctx, FONTS.mono, st.size, 800); ctx.letterSpacing = `${st.size * 0.02}px`;
      const w2 = ctx.measureText(txt).width;
      ctx.fillStyle = PAL.hudRed;
      const px = st.x - w2 - 34, py = st.y - st.size * 0.72;
      ctx.fillRect(px, py, 8, st.size * 0.72); ctx.fillRect(px + 14, py, 8, st.size * 0.72);
      ctx.restore();
    }
    // "SEGUNDOS" sob o número grande
    const sl = (1 - tw(t, 2.92, 3.15, E.linear));
    if (t < 3.2) {
      const d = decode('SEGUNDOS', t, AW.segundos - 0.02, { cps: 26, seed: 995, fi });
      setFont(ctx, FONTS.mono, 40, 700);
      withAlpha(ctx, sl, () => drawSegs(ctx, [{ text: d.text, color: '#B9BBBC' }], W / 2, 700, { ls: 18, align: 'center' }));
    }
    // "SEU TEMPO" ao lado do relógio quando a fala cita
    const stA = env(t, AW.seu_tempo, AW.seu_tempo + 0.1, AW.tempo_end + 0.5, AW.tempo_end + 0.8, E.linear, E.linear);
    if (stA > 0) {
      const d = decode('SEU TEMPO', t, AW.seu_tempo, { cps: 30, seed: 996, fi });
      setFont(ctx, FONTS.mono, 22, 700);
      withAlpha(ctx, stA, () => drawSegs(ctx, [{ text: d.text, color: PAL.red }], 2445, 186, { ls: 6, align: 'right' }));
    }
    // anel no 00:00
    if (zero) {
      const a = t - COUNT.t1;
      if (a < 0.6) {
        ctx.save(); ctx.strokeStyle = `rgba(224,69,81,${0.8 * (1 - a / 0.6)})`; ctx.lineWidth = 6 * (1 - a / 0.6) + 1;
        ctx.beginPath(); ctx.arc(st.x, st.y - st.size * 0.36, 180 + a * 700, 0, Math.PI * 2); ctx.stroke(); ctx.restore();
      }
    }
  }

  // ---------------------------------------------------------- cabeçalho do CTA
  function hud(ctx, t, fi) {
    const t0 = 0.08;
    const a = tw(t, t0, t0 + 0.06, E.linear);
    if (a <= 0) return;
    ctx.save(); ctx.globalAlpha *= a;
    const sqA = t < t0 + 0.26 ? 0 : (t < t0 + 0.30 ? 0.45 : 1);
    if (sqA > 0) { ctx.save(); ctx.globalAlpha *= sqA; ctx.fillStyle = PAL.hudRed; ctx.fillRect(HUD.sq.x, HUD.sq.y, HUD.sq.s, HUD.sq.s); ctx.restore(); }
    const tt = decode('ANTES DA MADRUGADA', t, t0 + 0.2, { cps: 24, tail: 5, seed: 11, fi });
    setFont(ctx, FONTS.mono, HUD.title.size, 700);
    drawSegs(ctx, [{ text: tt.text, color: PAL.title }], HUD.title.x, HUD.title.y, { ls: HUD.title.ls, shadow: { color: 'rgba(0,0,0,0.5)', blur: 6, x: 2, y: 3 } });
    const st = decode('DO DIA 30 · 30 SEGUNDOS', t, t0 + 0.4, { cps: 28, tail: 4, seed: 12, fi });
    setFont(ctx, FONTS.mono, HUD.sub.size, 500);
    drawSegs(ctx, [{ text: st.text, color: PAL.subtitle }], HUD.sub.x, HUD.sub.y, { ls: HUD.sub.ls });
    const lp = tw(t, t0 + 0.36, t0 + 1.05, E.outQuart);
    ctx.fillStyle = PAL.hudLine;
    if (lp > 0) ctx.fillRect(HUD.line.x0, HUD.line.y, (2150 - HUD.line.x0) * lp, 2);
    ctx.restore();
    drawBottomBrackets(ctx, tw(t, t0 + 0.18, t0 + 0.5, E.linear));
  }

  // ---------------------------------------------------------- quadro inteiro
  function ui(ctx, t, fi) {
    const cam = camAt(t);
    ctx.save();
    ctx.translate(W / 2, H / 2); ctx.scale(cam.z, cam.z); ctx.translate(-cam.cx, -cam.cy);
    boardGrid(ctx, cam);
    station1(ctx, t, fi);
    station2(ctx, t, fi);
    station3(ctx, t, fi);
    station4(ctx, t, fi);
    station5(ctx, t, fi);
    station6(ctx, t, fi);
    station7(ctx, t, fi);
    ctx.restore();
    cursor(ctx, t, cam);
    // escurece o quadro no fim (o obrigado fica sozinho)
    const endDim = tw(t, 31.9, 32.4, E.inOut);
    if (endDim > 0) { ctx.fillStyle = `rgba(8,9,10,${0.55 * endDim})`; ctx.fillRect(0, 0, W, H); }
    linkCallout(ctx, t, fi);
    station8(ctx, t, fi);
    hud(ctx, t, fi);
    countdown(ctx, t, fi);
  }

  // Motion blur adaptativo: deslocamento dos cantos da tela pela câmera durante o
  // obturador + mínimos para os elementos rápidos (letras, cartões, relógio).
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
    const fast = [
      [2.9, 3.45, 16], [31.8, 32.32, 16],                       // relógio voando
      [AW.o_flux - 0.05, AW.o_flux + 0.5, 10],                  // letras do FLUX
      [AW.cada - 0.25, AW.cada + 0.75, 14],                     // fichas chegando
      [AW.por_mim, AW.por_mim + 0.12, 12],                      // carimbo
      [23.18, 23.5, 10],                                         // janela
      [AW.voce + 0.1, AW.la, 12], [22.95, 23.7, 12], [ENTER + 0.3, AW.valor + 0.05, 10], // cursor
      [AW.valor, AW.valor + 0.7, 14],                           // recompensas
      [COUNT.t1, COUNT.t1 + 0.3, 8],
    ];
    for (const [t0, t1, k] of fast) if (t >= t0 && t < t1) n = Math.max(n, k);
    return clamp(n, 2, 40);
  }

  return { ui, samples, camAt };
}
