// 9,8 – 20,4 s (2D, estilo da referência):
// "E para conseguir assinar ordens em nome dessas instituições, ela precisava
//  guardar uma coisa. Os certificados digitais e as chaves privadas de cada
//  cliente. Pensa no que isso significa fisicamente."
//
// Diagrama instituições -> C&M (Corner) -> SPB. Cada ordem chega por um
// conector, é assinada dentro da C&M "em nome de" uma instituição e segue para
// o SPB (ciclos iguais defasados no tempo, como um precomp duplicado no AE).
// A câmera entra no painel da C&M: uma vaga com "?" vira certificado digital +
// chave privada; a vaga se repete para cada cliente. A frase final é digitada
// no itálico de máquina de escrever.
import { W, H, PAL, FONTS, fq } from '../../core/config.js';
import { E, tw, kf, clamp, lerp, env } from '../../core/ease.js';
import { hash, fbm1 } from '../../core/rand.js';
import { transformBox, drawLine, drawPolyline, node, withAlpha, shadowOn, shadowOff, underline } from '../../core/draw.js';
import { decode, undecode, setFont, drawSegs, measure } from '../../core/text.js';
import { CW } from './words.js';

export const DIG_T = {
  start: 9.84,
  sign0: CW.assinar - 0.02,      // 10.38 primeiro ciclo de assinatura
  cycle: 0.34,
  emNome: CW.em_nome,            // 11.22
  dessas: CW.dessas,             // 11.58
  zoom: 12.62,
  guardar: CW.guardar,           // 13.30
  slot: CW.coisa - 0.06,         // 13.94
  cert: CW.certificados - 0.02,  // 14.86
  key: CW.chaves - 0.04,         // 16.50
  rows: CW.cada - 0.08,          // 17.50
  think: CW.pensa - 0.02,        // 18.74
  fis: CW.fisicamente,           // 19.88
  glitch: 20.30,
  end: 20.44,
};

// ------------------------------------------------------------ layout (px do "palco")
const INST = { x: 230, y0: 392, w: 430, h: 104, gap: 136, n: 5 };
const BUS_X = 838;
const MID_Y = 780;
const CM = { x: 1000, y: 430, w: 560, th: 100, gap: 28 };
CM.py = CM.y + CM.th + CM.gap;   // 558 painel
CM.ph = 444;                     // altura base do painel
const SPB = { x: 1930, y: 690, w: 400, h: 180 };
const DOC = { w: 300, h: 196, cx: 1280, cy: 806 };
const SLOT = { x: 1040, y: 644, w: 480, h: 336 };
const CARD = { w: 232, h: 336 };

const instY = (i) => INST.y0 + i * INST.gap;
const instName = (i) => `INSTITUIÇÃO ${String(i + 1).padStart(2, '0')}`;

// ordem de chegada das ordens (instituição de cada ciclo)
const SEQ = [0, 2, 1, 4, 3, 0];

// câmera (null 2D): [t, [cx, cy, zoom], ease]
const CAM = [
  [9.84, [1280, 722, 1.000]],
  [12.62, [1282, 728, 1.030], E.inOutSoft],
  [13.42, [1280, 742, 1.720], E.inOutStrong],
  [17.50, [1280, 752, 1.780], E.inOutSoft],
  [18.46, [1300, 1000, 1.120], E.inOutStrong],
  [20.44, [1304, 1004, 1.085], E.inOutSoft],
];

function camAt(t) {
  const [cx, cy, z] = kf(t, CAM);
  return { cx: cx + fbm1(t * 0.21, 61) * 4, cy: cy + fbm1(t * 0.18, 67) * 3, z };
}

// ícone de banco (colunas), como o do card "INSTITUIÇÕES" da referência
function bankIcon(ctx, cx, cy, s, color) {
  ctx.save(); ctx.fillStyle = color;
  ctx.beginPath(); ctx.moveTo(cx - s * 0.5, cy - s * 0.22); ctx.lineTo(cx, cy - s * 0.5); ctx.lineTo(cx + s * 0.5, cy - s * 0.22); ctx.closePath(); ctx.fill();
  ctx.fillRect(cx - s * 0.46, cy - s * 0.17, s * 0.92, s * 0.07);
  for (let k = 0; k < 4; k++) ctx.fillRect(cx - s * 0.38 + k * s * 0.24, cy - s * 0.07, s * 0.1, s * 0.4);
  ctx.fillRect(cx - s * 0.5, cy + s * 0.36, s, s * 0.09);
  ctx.restore();
}

function keyIcon(ctx, x, y, s, color) {
  ctx.save(); ctx.strokeStyle = color; ctx.lineWidth = s * 0.13; ctx.lineCap = 'square';
  ctx.beginPath(); ctx.arc(x + s * 0.3, y, s * 0.24, 0, Math.PI * 2); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(x + s * 0.54, y); ctx.lineTo(x + s * 1.18, y);
  ctx.moveTo(x + s * 0.98, y); ctx.lineTo(x + s * 0.98, y + s * 0.22);
  ctx.moveTo(x + s * 1.14, y); ctx.lineTo(x + s * 1.14, y + s * 0.16);
  ctx.stroke(); ctx.restore();
}

function lockIcon(ctx, x, y, s, color, closed) {
  ctx.save(); ctx.strokeStyle = color; ctx.fillStyle = color; ctx.lineWidth = s * 0.12;
  ctx.beginPath();
  const lift = (1 - closed) * s * 0.22;
  ctx.arc(x, y - s * 0.12 - lift, s * 0.26, Math.PI, 0); ctx.lineTo(x + s * 0.26, y - lift + s * 0.02);
  ctx.moveTo(x - s * 0.26, y - s * 0.12 - lift); ctx.lineTo(x - s * 0.26, y - s * 0.02 - lift * (closed < 1 ? 1 : 0));
  ctx.stroke();
  ctx.fillRect(x - s * 0.4, y, s * 0.8, s * 0.56);
  ctx.restore();
}

// assinatura manuscrita (traço contínuo, desenhado com "trim path")
const SIG = (() => {
  const pts = [];
  const ctrl = [[0, 0.62], [0.06, 0.2], [0.12, 0.75], [0.17, 0.32], [0.22, 0.86], [0.28, 0.4], [0.33, 0.58], [0.38, 0.18], [0.42, 0.78],
    [0.48, 0.5], [0.55, 0.62], [0.6, 0.3], [0.66, 0.7], [0.72, 0.46], [0.8, 0.58], [0.88, 0.36], [1, 0.52]];
  for (let i = 0; i < ctrl.length - 1; i++) {
    const [x0, y0] = ctrl[i], [x1, y1] = ctrl[i + 1];
    for (let k = 0; k < 6; k++) {
      const u = k / 6, s = u * u * (3 - 2 * u);
      pts.push([lerp(x0, x1, u), lerp(y0, y1, s)]);
    }
  }
  pts.push(ctrl[ctrl.length - 1]);
  return pts;
})();

const B64 = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';
const b64line = (seed, n) => { let s = ''; for (let i = 0; i < n; i++) s += B64[Math.floor(hash(seed, i, 77) * 64)]; return s; };
const PEM = [0, 1, 2, 3, 4].map((k) => b64line(900 + k, 22));

export function createDigital() {
  // ------------------------------------------------------------ peças
  function instCard(ctx, t, fi, i, dimA) {
    const y = instY(i);
    const t0 = DIG_T.start + 0.04 + i * 0.07;
    const p = tw(t, t0, t0 + 0.4, E.outQuart);
    if (p <= 0) return;
    const redAt = DIG_T.dessas + 0.02 + i * 0.07;
    const red = tw(t, redAt, redAt + 0.08, E.linear);
    // ordem saindo desta instituição: borda acende
    let act = 0;
    SEQ.forEach((s, k) => { if (s === i) { const tk = DIG_T.sign0 + k * DIG_T.cycle; act = Math.max(act, env(t, tk - 0.26, tk - 0.2, tk + 0.02, tk + 0.2, E.linear, E.inOut)); } });
    withAlpha(ctx, dimA, () => {
      ctx.save();
      ctx.globalAlpha *= clamp(p * 1.6);
      shadowOn(ctx, { color: 'rgba(0,0,0,0.55)', blur: 10, x: 4, y: 6 });
      ctx.fillStyle = PAL.boxFill; ctx.fillRect(INST.x, y, INST.w * p, INST.h);
      shadowOff(ctx);
      const bc = red > 0.5 ? PAL.redBox : act > 0.5 ? PAL.tealBright : '#6F7377';
      ctx.strokeStyle = bc; ctx.lineWidth = 2; ctx.strokeRect(INST.x + 1, y + 1, INST.w * p - 2, INST.h - 2);
      if (red > 0) { ctx.globalAlpha *= red * 0.16; ctx.fillStyle = PAL.redBox; ctx.fillRect(INST.x, y, INST.w, INST.h); }
      ctx.restore();
      const ia = tw(t, t0 + 0.12, t0 + 0.3, E.linear);
      if (ia > 0) withAlpha(ctx, ia, () => bankIcon(ctx, INST.x + 58, y + INST.h / 2 + 4, 50, red > 0.5 ? '#E7A0A6' : '#C9CBCB'));
      const d = decode(instName(i), t, t0 + 0.16, { cps: 30, seed: 600 + i, fi });
      if (d.visible) {
        setFont(ctx, FONTS.type, 29);
        drawSegs(ctx, [{ text: d.text, color: '#E2E4E4' }], INST.x + 112, y + INST.h / 2 + 10, { ls: 2 });
      }
    });
  }

  function instPath(i) {
    const y = instY(i) + INST.h / 2;
    return [[INST.x + INST.w + 6, y], [BUS_X, y], [BUS_X, MID_Y], [CM.x - 6, MID_Y]];
  }

  function connectors(ctx, t, dimA) {
    withAlpha(ctx, dimA, () => {
      for (let i = 0; i < INST.n; i++) {
        const t0 = DIG_T.start + 0.22 + i * 0.06;
        const p = tw(t, t0, t0 + 0.5, E.inOut);
        const red = tw(t, DIG_T.dessas + 0.02 + i * 0.07, DIG_T.dessas + 0.12 + i * 0.07, E.linear);
        drawPolyline(ctx, instPath(i), p, { color: red > 0.5 ? '#8E2F37' : '#3E4245', width: 2 });
        if (p > 0.02) node(ctx, INST.x + INST.w + 6, instY(i) + INST.h / 2, 9, red > 0.5 ? PAL.redBox : '#6F7377', 1);
      }
      // C&M -> SPB
      const p2 = tw(t, DIG_T.start + 0.5, DIG_T.start + 0.9, E.inOut);
      drawLine(ctx, CM.x + CM.w + 6, MID_Y, SPB.x - 6, MID_Y, p2, { color: '#3E4245', width: 2 });
      if (p2 > 0) node(ctx, lerp(CM.x + CM.w + 6, SPB.x - 6, 0.5), MID_Y, 9, PAL.tealBright, p2 > 0.5 ? 1 : 0);
    });
  }

  // pulso que corre pelo conector antes de cada ciclo (trecho de "trim path")
  function pulses(ctx, t, dimA) {
    SEQ.forEach((i, k) => {
      const tk = DIG_T.sign0 + k * DIG_T.cycle;
      const p = tw(t, tk - 0.3, tk + 0.02, E.inOut);
      if (p <= 0 || p >= 1) return;
      const pts = instPath(i);
      // comprimento total e posição
      const seg = []; let tot = 0;
      for (let j = 1; j < pts.length; j++) { const l = Math.hypot(pts[j][0] - pts[j - 1][0], pts[j][1] - pts[j - 1][1]); seg.push(l); tot += l; }
      const at = (d) => { let r = d; for (let j = 1; j < pts.length; j++) { if (r <= seg[j - 1]) { const q = r / seg[j - 1]; return [lerp(pts[j - 1][0], pts[j][0], q), lerp(pts[j - 1][1], pts[j][1], q)]; } r -= seg[j - 1]; } return pts[pts.length - 1]; };
      const head = tot * p, tail = Math.max(0, head - 160);
      const trail = [at(tail)];
      // pontos intermediários (cantos) entre tail e head
      let acc = 0;
      for (let j = 1; j < pts.length; j++) { acc += seg[j - 1]; if (acc > tail && acc < head) trail.push(pts[j]); }
      trail.push(at(head));
      withAlpha(ctx, dimA, () => {
        ctx.save();
        ctx.shadowColor = PAL.tealBright; ctx.shadowBlur = 14;
        drawPolyline(ctx, trail, 1, { color: PAL.tealBright, width: 3 });
        ctx.restore();
        const [hx, hy] = at(head);
        node(ctx, hx, hy, 10, '#D8F2EA', 1);
      });
    });
  }

  function cmBox(ctx, t, fi, panelH) {
    const bp = tw(t, DIG_T.start + 0.12, DIG_T.start + 0.62, E.outQuart);
    if (bp <= 0) return;
    const fx = CM.x - 40, fy = CM.y - 40, fw = CM.w + 80, fh = CM.th + CM.gap + panelH + 80;
    // caixa de transformação some quando a câmera entra
    const tbA = 1 - tw(t, DIG_T.zoom, DIG_T.zoom + 0.4, E.inOut);
    transformBox(ctx, fx, fy, fw, fh, bp, { color: PAL.frame, hs: 13, alpha: tbA });
    const ta = tw(t, DIG_T.start + 0.25, DIG_T.start + 0.5, E.linear);
    if (ta <= 0) return;
    withAlpha(ctx, ta, () => {
      shadowOn(ctx, { color: 'rgba(0,0,0,0.55)', blur: 10, x: 4, y: 6 });
      ctx.fillStyle = PAL.boxFill; ctx.fillRect(CM.x, CM.y, CM.w, CM.th);
      ctx.fillRect(CM.x, CM.py, CM.w, panelH);
      shadowOff(ctx);
      ctx.strokeStyle = '#6F7377'; ctx.lineWidth = 2;
      ctx.strokeRect(CM.x + 1, CM.y + 1, CM.w - 2, CM.th - 2);
      // borda do painel: fica vermelha quando vira o "cofre"
      const vault = tw(t, DIG_T.guardar, DIG_T.guardar + 0.2, E.linear);
      ctx.strokeStyle = vault > 0.5 ? PAL.redBox : '#6F7377';
      ctx.strokeRect(CM.x + 1, CM.py + 1, CM.w - 2, panelH - 2);
      const cg = ctx.createLinearGradient(CM.x + CM.w / 2 - 14, 0, CM.x + CM.w / 2 + 14, 0);
      cg.addColorStop(0, 'rgba(78,111,104,0)'); cg.addColorStop(0.5, 'rgba(143,201,186,0.85)'); cg.addColorStop(1, 'rgba(78,111,104,0)');
      ctx.fillStyle = cg; ctx.fillRect(CM.x + CM.w / 2 - 14, CM.y + CM.th, 28, CM.gap);
    });
    const t1 = decode('C&M SOFTWARE', t, DIG_T.start + 0.32, { cps: 26, seed: 640, fi });
    const t2 = decode('CORNER', t, DIG_T.start + 0.5, { cps: 22, seed: 641, fi });
    setFont(ctx, FONTS.type, 37);
    drawSegs(ctx, [{ text: t1.text, color: '#E2E4E4' }], CM.x + CM.w / 2, CM.y + 48, { ls: 3, align: 'center' });
    setFont(ctx, FONTS.mono, 19, 500);
    drawSegs(ctx, [{ text: t2.text, color: '#7E8285' }], CM.x + CM.w / 2, CM.y + 82, { ls: 7, align: 'center' });
  }

  function spbBox(ctx, t, fi, dimA) {
    const t0 = DIG_T.start + 0.3;
    const p = tw(t, t0, t0 + 0.4, E.outQuart);
    if (p <= 0) return;
    withAlpha(ctx, dimA, () => {
      ctx.save(); ctx.globalAlpha *= clamp(p * 1.6);
      shadowOn(ctx, { color: 'rgba(0,0,0,0.55)', blur: 10, x: 4, y: 6 });
      ctx.fillStyle = PAL.boxFill; ctx.fillRect(SPB.x, SPB.y, SPB.w * p, SPB.h);
      shadowOff(ctx);
      ctx.strokeStyle = '#6F7377'; ctx.lineWidth = 2; ctx.strokeRect(SPB.x + 1, SPB.y + 1, SPB.w * p - 2, SPB.h - 2);
      ctx.restore();
      const d1 = decode('SPB', t, t0 + 0.12, { cps: 20, seed: 650, fi });
      setFont(ctx, '"FreeMonoBold"', 54);
      drawSegs(ctx, [{ text: d1.text, color: '#E9EBEB' }], SPB.x + SPB.w / 2, SPB.y + 92, { ls: 8, align: 'center', glow: { color: '#FFFFFF', blur: 14, alpha: 0.4 } });
      const d2 = decode('BANCO CENTRAL', t, t0 + 0.22, { cps: 28, seed: 651, fi });
      setFont(ctx, FONTS.mono, 19, 500);
      drawSegs(ctx, [{ text: d2.text, color: '#7E8285' }], SPB.x + SPB.w / 2, SPB.y + 140, { ls: 6, align: 'center' });
    });
  }

  // documento "ORDEM" assinado dentro do painel
  function orderDoc(ctx, t, fi, k) {
    const tk = DIG_T.sign0 + k * DIG_T.cycle;
    if (t < tk - 0.06 || t > tk + 0.7) return;
    const inP = tw(t, tk - 0.04, tk + 0.2, E.inOut);
    const outP = tw(t, tk + 0.32, tk + 0.68, E.inOut);
    const x = lerp(CM.x + 40, DOC.cx - DOC.w / 2, inP) + outP * (SPB.x - DOC.cx + 40);
    const y = DOC.cy - DOC.h / 2;
    const s = lerp(0.55, 1, inP) * lerp(1, 0.5, outP);
    ctx.save();
    // fica "dentro" do diagrama: some ao sair da área entre o painel e o SPB
    ctx.globalAlpha *= clamp(inP * 3) * (1 - clamp((outP - 0.8) / 0.2));
    ctx.translate(x + DOC.w / 2, y + DOC.h / 2); ctx.scale(s, s); ctx.translate(-DOC.w / 2, -DOC.h / 2);
    shadowOn(ctx, { color: 'rgba(0,0,0,0.6)', blur: 10, x: 4, y: 6 });
    ctx.fillStyle = PAL.paper; ctx.fillRect(0, 0, DOC.w, DOC.h);
    shadowOff(ctx);
    ctx.fillStyle = PAL.redDeep; ctx.fillRect(0, 0, DOC.w, 26);
    setFont(ctx, '"FreeMonoBold"', 18);
    drawSegs(ctx, [{ text: 'ORDEM DE PAGAMENTO', color: PAL.paper }], 14, 19, { ls: 1.5 });
    setFont(ctx, FONTS.type, 16);
    ctx.fillStyle = '#4A4A48';
    drawSegs(ctx, [{ text: 'EM NOME DE', color: '#6A6A66' }], 14, 52, { ls: 1.5 });
    drawSegs(ctx, [{ text: instName(SEQ[k]), color: '#1E1E1C' }], 14, 74, { ls: 1.5 });
    ctx.fillStyle = '#B9B8B1';
    ctx.fillRect(14, 92, 200, 4); ctx.fillRect(14, 104, 150, 4);
    // linha de assinatura + traço
    ctx.fillStyle = '#7A7972'; ctx.fillRect(14, DOC.h - 34, DOC.w - 28, 1.5);
    drawSegs(ctx, [{ text: 'ASSINATURA DIGITAL', color: '#6A6A66' }], 14, DOC.h - 12, { ls: 1.5 });
    const sp = tw(t, tk + 0.1, tk + 0.3, E.inOut);
    if (sp > 0) {
      const pts = SIG.map(([u, v]) => [26 + u * 230, DOC.h - 84 + v * 46]);
      ctx.save(); ctx.lineJoin = 'round'; ctx.lineCap = 'round';
      drawPolyline(ctx, pts, sp, { color: '#B3202E', width: 3.2 });
      ctx.restore();
    }
    ctx.restore();
  }

  function panelStatus(ctx, t, fi) {
    // "ASSINANDO" -> "EM NOME DE: INSTITUIÇÃO 0X"
    const A = env(t, DIG_T.sign0 - 0.05, DIG_T.sign0, DIG_T.zoom, DIG_T.zoom + 0.2, E.linear, E.linear);
    if (A <= 0) return;
    withAlpha(ctx, A, () => {
      const x = CM.x + 30, y = CM.py + 46;
      if (t < DIG_T.emNome) {
        const d = decode('ASSINANDO ORDENS', t, DIG_T.sign0, { cps: 30, seed: 660, fi });
        setFont(ctx, FONTS.mono, 20, 700);
        drawSegs(ctx, [{ text: d.text, color: '#B9BBBC' }], x, y, { ls: 4 });
        return;
      }
      setFont(ctx, FONTS.mono, 20, 700);
      const d = decode('EM NOME DE:', t, DIG_T.emNome, { cps: 30, seed: 661, fi });
      const r = drawSegs(ctx, [{ text: d.text, color: '#B9BBBC' }], x, y, { ls: 4 });
      // nome da instituição do ciclo atual (troca com scramble a cada ciclo)
      let k = 0;
      for (let j = 0; j < SEQ.length; j++) if (t >= DIG_T.sign0 + j * DIG_T.cycle) k = j;
      const tk = Math.max(DIG_T.emNome + 0.08, DIG_T.sign0 + k * DIG_T.cycle);
      const nd = decode(instName(SEQ[k]), t, tk, { cps: 40, tail: 4, seed: 670 + k, fi });
      drawSegs(ctx, [{ text: nd.text, color: PAL.red }], x + r.width + 14, y, { ls: 4, glow: { color: PAL.red, blur: 10, alpha: 0.35 } });
    });
  }

  // ------------------------------------------------------------ cofre
  function certCard(ctx, t, fi, x, y, w, h, t0) {
    const p = tw(t, t0, t0 + 0.32, E.outQuart);
    if (p <= 0) return;
    const dy = (1 - p) * -60;
    ctx.save();
    ctx.globalAlpha *= clamp(p * 2);
    ctx.translate(x, y + dy);
    shadowOn(ctx, { color: 'rgba(0,0,0,0.6)', blur: 12, x: 4, y: 7 });
    ctx.fillStyle = PAL.paper; ctx.fillRect(0, 0, w, h);
    shadowOff(ctx);
    ctx.fillStyle = PAL.redDeep; ctx.fillRect(0, 0, w, 30);
    const hd = decode('CERTIFICADO', t, t0 + 0.08, { cps: 28, seed: 680, fi });
    setFont(ctx, '"FreeMonoBold"', 19);
    drawSegs(ctx, [{ text: hd.text, color: PAL.paper }], 12, 21, { ls: 1.5 });
    const hd2 = decode('DIGITAL', t, t0 + 0.16, { cps: 28, seed: 681, fi });
    setFont(ctx, FONTS.type, 26);
    drawSegs(ctx, [{ text: hd2.text, color: '#1E1E1C' }], 12, 66, { ls: 2 });
    setFont(ctx, FONTS.type, 13);
    const rows = [['TITULAR', 'INSTITUIÇÃO 01'], ['EMISSOR', 'AUTORIDADE CERT.'], ['USO', 'ASSINATURA']];
    rows.forEach(([k, v], i) => {
      const rd = decode(v, t, t0 + 0.24 + i * 0.08, { cps: 34, seed: 682 + i, fi });
      drawSegs(ctx, [{ text: k, color: '#77766F' }], 12, 100 + i * 36, { ls: 1 });
      drawSegs(ctx, [{ text: rd.text, color: '#2A2A28' }], 12, 116 + i * 36, { ls: 1 });
    });
    // selo (roseta) — prenúncio do carimbo
    const sa = tw(t, t0 + 0.4, t0 + 0.6, E.outBack);
    if (sa > 0) {
      const cx = w - 54, cy = h - 58, r = 34 * sa;
      ctx.save();
      ctx.strokeStyle = PAL.redDeep; ctx.fillStyle = 'rgba(145,30,43,0.12)';
      ctx.lineWidth = 3; ctx.beginPath(); ctx.arc(cx, cy, r, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
      ctx.lineWidth = 1.5; ctx.beginPath(); ctx.arc(cx, cy, r * 0.74, 0, Math.PI * 2); ctx.stroke();
      ctx.beginPath();
      for (let k = 0; k < 12; k++) { const a = k / 12 * Math.PI * 2; ctx.moveTo(cx + Math.cos(a) * r * 0.32, cy + Math.sin(a) * r * 0.32); ctx.lineTo(cx + Math.cos(a) * r * 0.6, cy + Math.sin(a) * r * 0.6); }
      ctx.stroke();
      ctx.restore();
    }
    ctx.restore();
  }

  function keyCard(ctx, t, fi, x, y, w, h, t0) {
    const p = tw(t, t0, t0 + 0.32, E.outQuart);
    if (p <= 0) return;
    const dy = (1 - p) * -60;
    ctx.save();
    ctx.globalAlpha *= clamp(p * 2);
    ctx.translate(x, y + dy);
    shadowOn(ctx, { color: 'rgba(0,0,0,0.6)', blur: 12, x: 4, y: 7 });
    ctx.fillStyle = '#121518'; ctx.fillRect(0, 0, w, h);
    shadowOff(ctx);
    ctx.strokeStyle = PAL.redBox; ctx.lineWidth = 2; ctx.strokeRect(1, 1, w - 2, h - 2);
    keyIcon(ctx, 14, 26, 30, PAL.red);
    const hd = decode('CHAVE', t, t0 + 0.08, { cps: 28, seed: 690, fi });
    setFont(ctx, '"FreeMonoBold"', 19);
    drawSegs(ctx, [{ text: hd.text, color: PAL.red }], 62, 32, { ls: 1.5, glow: { color: PAL.red, blur: 8, alpha: 0.3 } });
    const hd2 = decode('PRIVADA', t, t0 + 0.16, { cps: 28, seed: 691, fi });
    setFont(ctx, FONTS.type, 26);
    drawSegs(ctx, [{ text: hd2.text, color: '#E2E4E4' }], 12, 72, { ls: 2 });
    setFont(ctx, FONTS.type, 11.5);
    const lines = ['-----BEGIN PRIVATE KEY-----', ...PEM, '-----END PRIVATE KEY-----'];
    lines.forEach((l, i) => {
      const d = decode(l, t, t0 + 0.22 + i * 0.05, { cps: 60, tail: 6, seed: 700 + i, fi });
      drawSegs(ctx, [{ text: d.text, color: i === 0 || i === lines.length - 1 ? '#8E9194' : '#5F6366' }], 12, 108 + i * 24, { ls: 0.4 });
    });
    ctx.restore();
  }

  function vault(ctx, t, fi, panelH) {
    if (t < DIG_T.guardar - 0.1) return;
    // cadeado no canto do painel
    const la = tw(t, DIG_T.guardar - 0.05, DIG_T.guardar + 0.15, E.linear);
    const lc = tw(t, DIG_T.guardar + 0.12, DIG_T.guardar + 0.3, E.outBack);
    withAlpha(ctx, la, () => lockIcon(ctx, CM.x + CM.w - 40, CM.py + 30, 26, PAL.red, lc));
    const ld = decode('GUARDADO NA C&M', t, DIG_T.guardar + 0.05, { cps: 30, seed: 710, fi });
    setFont(ctx, FONTS.mono, 15, 700);
    drawSegs(ctx, [{ text: ld.text, color: '#B9BBBC' }], SLOT.x, CM.py + 38, { ls: 3 });
    // vaga com "?" ("uma coisa")
    const sp = tw(t, DIG_T.slot, DIG_T.slot + 0.3, E.outQuart);
    if (sp > 0) {
      ctx.save();
      ctx.setLineDash([10, 8]);
      ctx.strokeStyle = '#5A5D61'; ctx.lineWidth = 2;
      const left = SLOT.x, right = SLOT.x + SLOT.w;
      const split = tw(t, DIG_T.cert - 0.04, DIG_T.cert + 0.2, E.inOut);
      // a vaga única se divide em duas (certificado | chave)
      const gapW = 16 * split;
      const hw = (SLOT.w - gapW) / 2;
      ctx.globalAlpha *= sp;
      ctx.strokeRect(left + 1, SLOT.y + 1, lerp(SLOT.w, hw, split) - 2, SLOT.h - 2);
      if (split > 0.01) ctx.strokeRect(right - hw + 1, SLOT.y + 1, hw - 2, SLOT.h - 2);
      ctx.setLineDash([]);
      ctx.restore();
      // "?" no centro da vaga, depois em cada metade
      const q1 = t < DIG_T.cert ? decode('?', t, DIG_T.slot + 0.08, { cps: 10, seed: 720, fi }).text : '';
      setFont(ctx, '"FreeMonoBold"', 120);
      if (q1) drawSegs(ctx, [{ text: q1, color: '#5E6164' }], SLOT.x + SLOT.w / 2, SLOT.y + SLOT.h / 2 + 40, { align: 'center' });
      if (t >= DIG_T.cert && t < DIG_T.key) {
        setFont(ctx, '"FreeMonoBold"', 80);
        drawSegs(ctx, [{ text: '?', color: '#4E5154' }], right - hw / 2, SLOT.y + SLOT.h / 2 + 28, { align: 'center' });
      }
    }
    certCard(ctx, t, fi, SLOT.x, SLOT.y, CARD.w, CARD.h, DIG_T.cert);
    keyCard(ctx, t, fi, SLOT.x + SLOT.w - CARD.w, SLOT.y, CARD.w, CARD.h, DIG_T.key);
    // rótulo da linha 1
    if (t >= DIG_T.cert) {
      const d = decode('INSTITUIÇÃO 01', t, DIG_T.cert + 0.1, { cps: 30, seed: 730, fi });
      setFont(ctx, FONTS.mono, 15, 700);
      drawSegs(ctx, [{ text: d.text, color: '#7E8285' }], SLOT.x, SLOT.y - 14, { ls: 3 });
    }
    // uma linha para cada cliente
    for (let r = 1; r < 14; r++) {
      const t0 = DIG_T.rows + 0.1 + (r - 1) * (3 / 24);
      const p = tw(t, t0, t0 + 0.3, E.outQuart);
      if (p <= 0) continue;
      const y = SLOT.y + SLOT.h + 40 + (r - 1) * 92;
      if (y > CM.py + panelH - 60) continue;
      ctx.save();
      ctx.globalAlpha *= clamp(p * 1.5);
      ctx.translate((1 - p) * -40, 0);
      const d = decode(instName(r), t, t0, { cps: 40, seed: 740 + r, fi });
      setFont(ctx, FONTS.mono, 15, 700);
      drawSegs(ctx, [{ text: d.text, color: '#7E8285' }], SLOT.x, y + 8, { ls: 3 });
      // mini certificado
      shadowOn(ctx, { color: 'rgba(0,0,0,0.55)', blur: 8, x: 3, y: 4 });
      ctx.fillStyle = PAL.paper; ctx.fillRect(SLOT.x, y + 20, CARD.w, 52);
      ctx.fillStyle = '#121518'; ctx.fillRect(SLOT.x + SLOT.w - CARD.w, y + 20, CARD.w, 52);
      shadowOff(ctx);
      ctx.fillStyle = PAL.redDeep; ctx.fillRect(SLOT.x, y + 20, 10, 52);
      setFont(ctx, FONTS.type, 15);
      drawSegs(ctx, [{ text: 'CERTIFICADO DIGITAL', color: '#2A2A28' }], SLOT.x + 22, y + 51, { ls: 1 });
      ctx.strokeStyle = PAL.redBox; ctx.lineWidth = 2; ctx.strokeRect(SLOT.x + SLOT.w - CARD.w + 1, y + 21, CARD.w - 2, 50);
      keyIcon(ctx, SLOT.x + SLOT.w - CARD.w + 14, y + 46, 18, PAL.red);
      drawSegs(ctx, [{ text: 'CHAVE PRIVADA', color: '#C9CBCB' }], SLOT.x + SLOT.w - CARD.w + 48, y + 51, { ls: 1 });
      ctx.restore();
    }
  }

  // ------------------------------------------------------------ frase final
  const THINK = [
    { text: 'PENSA NO QUE', t: CW.pensa, y: 0 },
    { text: 'ISSO SIGNIFICA', t: CW.significa - 0.12, y: 1 },
  ];
  function thinkText(ctx, t, fi) {
    if (t < DIG_T.think) return;
    const x = 1700, y0 = 600, lh = 84;
    setFont(ctx, FONTS.typeIt, 62);
    ctx.letterSpacing = '2px';
    for (const l of THINK) {
      if (t < l.t) continue;
      const n = Math.min(l.text.length, Math.floor((fq(t) - l.t) * 26) + 1);
      ctx.save(); shadowOn(ctx, { color: 'rgba(0,0,0,0.6)', blur: 6, x: 3, y: 4 });
      ctx.fillStyle = PAL.white; ctx.fillText(l.text.slice(0, n), x, y0 + l.y * lh);
      ctx.restore();
    }
    if (t >= DIG_T.fis) {
      const word = 'FISICAMENTE.';
      const n = Math.min(word.length, Math.floor((fq(t) - DIG_T.fis) * 30) + 1);
      setFont(ctx, FONTS.typeIt, 84);
      ctx.letterSpacing = '3px';
      const yy = y0 + 2 * lh + 64;
      ctx.save(); shadowOn(ctx, { color: 'rgba(0,0,0,0.6)', blur: 6, x: 3, y: 4 });
      ctx.fillStyle = PAL.red; ctx.fillText(word.slice(0, n), x, yy);
      ctx.shadowColor = PAL.red; ctx.shadowBlur = 16; ctx.shadowOffsetX = 0; ctx.shadowOffsetY = 0; ctx.globalAlpha *= 0.35;
      ctx.fillText(word.slice(0, n), x, yy);
      ctx.restore();
      const w = measure(ctx, word.slice(0, n), 3);
      underline(ctx, x, x + w, yy + 22, 1, { color: PAL.gold, lw: 3 });
    }
  }

  // ------------------------------------------------------------ quadro
  function ui(ctx, t, fi) {
    if (t < DIG_T.start || t >= DIG_T.end) return;
    const cam = camAt(t);
    const dimA = (1 - 0.78 * tw(t, DIG_T.zoom, DIG_T.zoom + 0.5, E.inOut)) * (1 - tw(t, DIG_T.rows, DIG_T.rows + 0.45, E.inOut));
    const spbA = dimA * (1 - tw(t, DIG_T.rows, DIG_T.rows + 0.4, E.inOut));
    const panelH = CM.ph + 820 * tw(t, DIG_T.rows, DIG_T.rows + 0.75, E.inOutStrong);
    ctx.save();
    ctx.translate(W / 2, H / 2); ctx.scale(cam.z, cam.z); ctx.translate(-cam.cx, -cam.cy);
    connectors(ctx, t, dimA);
    pulses(ctx, t, dimA);
    for (let i = 0; i < INST.n; i++) instCard(ctx, t, fi, i, dimA);
    spbBox(ctx, t, fi, spbA);
    cmBox(ctx, t, fi, panelH);
    // conteúdo do painel (recortado pelo painel)
    ctx.save();
    ctx.beginPath(); ctx.rect(CM.x + 2, CM.py + 2, CM.w - 4, panelH - 4); ctx.clip();
    panelStatus(ctx, t, fi);
    vault(ctx, t, fi, panelH);
    ctx.restore();
    // ordens (podem sair do painel em direção ao SPB)
    for (let k = 0; k < SEQ.length; k++) orderDoc(ctx, t, fi, k);
    ctx.restore();
    thinkText(ctx, t, fi);
  }

  // sub-quadros de motion blur: o bastante para o rastro ficar contínuo (sem
  // "cópias" escalonadas) nos movimentos rápidos
  function samples(t) {
    if (t >= DIG_T.sign0 - 0.34 && t < DIG_T.zoom + 0.1) return 24;  // ordens indo e vindo
    if (t >= DIG_T.zoom && t < DIG_T.zoom + 0.85) return 14;         // câmera entrando
    if (t >= DIG_T.rows && t < DIG_T.rows + 1.0) return 14;          // recuo
    if (t >= DIG_T.cert && t < DIG_T.cert + 0.35) return 10;         // cartões entrando
    if (t >= DIG_T.key && t < DIG_T.key + 0.35) return 10;
    if (t >= DIG_T.slot && t < DIG_T.cert) return 3;
    return 2;
  }

  return { ui, samples };
}
