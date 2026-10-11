// Texturas procedurais da cena do crachá e do dinheiro (desenhadas em canvas).
// As cédulas são ESTILIZADAS (não reproduzem o desenho real do Real).
import { FONTS } from '../core/config.js';
import { mulberry32 } from '../core/rand.js';
import { makeCanvas } from '../core/three-utils.js';
import { personIcon } from '../core/draw.js';
import { decode } from '../core/text.js';

function noiseCanvas(w, h, seed, alpha = 0.06) {
  const c = makeCanvas(w, h);
  const g = c.getContext('2d');
  const img = g.createImageData(w, h);
  const rnd = mulberry32(seed);
  for (let i = 0; i < w * h; i++) {
    const v = Math.floor(rnd() * 255);
    img.data[i * 4] = v; img.data[i * 4 + 1] = v; img.data[i * 4 + 2] = v; img.data[i * 4 + 3] = Math.floor(alpha * 255);
  }
  g.putImageData(img, 0, 0);
  return c;
}

const txt = (g, s, x, y, font, color, ls = 0, align = 'left') => {
  g.font = font; g.letterSpacing = `${ls}px`; g.fillStyle = color; g.textAlign = align; g.fillText(s, x, y); g.textAlign = 'left';
};

// ------------------------------------------------------------------ crachá
export const BADGE_PX = { w: 1080, h: 1712 }; // 20 px/mm (54 x 85,6 mm)
const badgeNoise = () => noiseCanvas(540, 856, 17, 0.05);
let _bn = null;

export function drawBadgeFront(c, { reveal = 0, t = 0, t0 = 0, fi = 0 } = {}) {
  const g = c.getContext('2d');
  const { w, h } = BADGE_PX;
  g.clearRect(0, 0, w, h);
  g.fillStyle = '#E6E5E0'; g.fillRect(0, 0, w, h);
  _bn = _bn || badgeNoise();
  g.globalAlpha = 1; g.drawImage(_bn, 0, 0, w, h);
  // faixa vermelha
  g.fillStyle = '#8E1D29'; g.fillRect(0, 176, w, 250);
  g.fillStyle = 'rgba(0,0,0,0.12)'; g.fillRect(0, 418, w, 8);
  txt(g, 'ACESSO', 92, 330, `700 112px ${FONTS.mono}`, '#F2F0EB', 22);
  txt(g, 'PRESTADOR DE SERVIÇO', 96, 392, `500 33px ${FONTS.mono}`, 'rgba(242,240,235,0.72)', 7);
  g.strokeStyle = 'rgba(242,240,235,0.85)'; g.lineWidth = 6; g.strokeRect(906, 232, 82, 82);
  g.fillStyle = 'rgba(242,240,235,0.85)'; g.fillRect(928, 254, 38, 38);
  // foto (silhueta — sem rosto real)
  g.fillStyle = '#A4A7A9'; g.fillRect(92, 500, 390, 500);
  const grd = g.createLinearGradient(92, 500, 92, 1000);
  grd.addColorStop(0, 'rgba(255,255,255,0.10)'); grd.addColorStop(1, 'rgba(0,0,0,0.10)');
  g.fillStyle = grd; g.fillRect(92, 500, 390, 500);
  personIcon(g, 287, 812, 360, '#777A7D');
  g.strokeStyle = '#85888B'; g.lineWidth = 4; g.strokeRect(92, 500, 390, 500);
  // campos
  const lab = (s, x, y) => txt(g, s, x, y, `500 30px ${FONTS.mono}`, '#7B7E81', 6);
  lab('NOME', 532, 548);
  const nameFont = `700 47px ${FONTS.mono}`;
  const l1 = 'JOÃO NAZARENO', l2 = 'ROQUE';
  if (reveal > 0) {
    const d1 = decode(l1, t, t0, { cps: 26, seed: 301, fi });
    const d2 = decode(l2, t, t0 + 0.5, { cps: 26, seed: 302, fi });
    txt(g, d1.text, 532, 616, nameFont, '#1C1E21', 2);
    txt(g, d2.text, 532, 680, nameFont, '#1C1E21', 2);
  }
  // tarja de censura (sai da esquerda para a direita)
  const bars = [[526, 570, 420, 60], [526, 634, 180, 60]];
  for (const [x, y, bw, bh] of bars) {
    const cut = Math.min(bw, bw * reveal * 1.15);
    if (bw - cut > 0) { g.fillStyle = '#111214'; g.fillRect(x + cut, y, bw - cut, bh); }
  }
  lab('CARGO', 532, 770);
  txt(g, 'DESENVOLVEDOR', 532, 836, `700 44px ${FONTS.mono}`, '#1C1E21', 2);
  txt(g, 'BACK-END', 532, 896, `700 44px ${FONTS.mono}`, '#1C1E21', 2);
  // rodapé
  g.fillStyle = '#C9C8C3'; g.fillRect(92, 1070, w - 184, 3);
  lab('MATRÍCULA', 92, 1146); txt(g, '048-17', 92, 1206, `700 44px ${FONTS.mono}`, '#2A2C2F', 3);
  lab('NÍVEL', 600, 1146); txt(g, '03', 600, 1206, `700 44px ${FONTS.mono}`, '#2A2C2F', 3);
  // código de barras
  const rnd = mulberry32(99);
  let x = 92;
  g.fillStyle = '#1E2023';
  while (x < w - 100) {
    const bw = 4 + Math.floor(rnd() * 4) * 4;
    if (rnd() > 0.42) g.fillRect(x, 1290, bw, 190);
    x += bw + 4 + Math.floor(rnd() * 3) * 3;
  }
  txt(g, '0 4 1 7 2 9 3 0 4 8 1 7', 92, 1540, `500 30px ${FONTS.mono}`, '#6E7174', 4);
  g.fillStyle = '#8E1D29'; g.fillRect(0, h - 64, w, 22);
}

export function drawBadgeBack(c) {
  const g = c.getContext('2d');
  const { w, h } = BADGE_PX;
  g.fillStyle = '#E3E2DD'; g.fillRect(0, 0, w, h);
  _bn = _bn || badgeNoise();
  g.drawImage(_bn, 0, 0, w, h);
  g.fillStyle = '#26282B'; g.fillRect(0, 300, w, 170);
  const lines = ['ESTE CRACHÁ É PESSOAL E', 'INTRANSFERÍVEL. O USO É', 'OBRIGATÓRIO NAS ÁREAS', 'DE ACESSO RESTRITO.'];
  lines.forEach((s, i) => txt(g, s, 92, 620 + i * 58, `500 34px ${FONTS.mono}`, '#8B8E91', 3));
  g.fillStyle = '#B9B8B3'; g.fillRect(92, 1300, 600, 3);
  txt(g, 'ASSINATURA', 92, 1350, `500 28px ${FONTS.mono}`, '#9A9DA0', 6);
}

// ------------------------------------------------------------------ cédulas
// Topo de uma cédula de R$ 100 estilizada (156 x 70 mm, 10 px/mm).
export function drawNoteTop() {
  const c = makeCanvas(1560, 700);
  const g = c.getContext('2d');
  const grd = g.createLinearGradient(0, 0, 1560, 700);
  grd.addColorStop(0, '#B7C8CD'); grd.addColorStop(0.5, '#AFC1C7'); grd.addColorStop(1, '#A6B9BF');
  g.fillStyle = grd; g.fillRect(0, 0, 1560, 700);
  // linhas de guilhoché
  g.lineWidth = 1.4;
  for (let k = 0; k < 46; k++) {
    g.strokeStyle = `rgba(38,70,86,${0.10 + (k % 5) * 0.025})`;
    g.beginPath();
    for (let x = 0; x <= 1560; x += 12) {
      const y = 40 + k * 14 + Math.sin(x * 0.012 + k * 0.4) * 18 + Math.sin(x * 0.031 + k) * 6;
      if (x === 0) g.moveTo(x, y); else g.lineTo(x, y);
    }
    g.stroke();
  }
  // medalhão
  for (let r = 40; r < 240; r += 9) {
    g.strokeStyle = `rgba(40,72,90,${0.16 + (r % 27 === 0 ? 0.1 : 0)})`;
    g.beginPath(); g.arc(1180, 350, r, 0, Math.PI * 2); g.stroke();
  }
  g.fillStyle = 'rgba(232,240,242,0.45)'; g.beginPath(); g.arc(1180, 350, 120, 0, Math.PI * 2); g.fill();
  // faixa de segurança
  g.fillStyle = 'rgba(205,214,218,0.85)'; g.fillRect(860, 0, 34, 700);
  g.fillStyle = 'rgba(120,140,150,0.35)';
  for (let y = 0; y < 700; y += 22) g.fillRect(860, y, 34, 8);
  // numerais
  txt(g, '100', 120, 300, `400 230px ${FONTS.big}`, '#4E6A76', 6);
  txt(g, 'REAIS', 126, 380, `700 54px ${FONTS.mono}`, '#58737E', 16);
  txt(g, '100', 1330, 640, `400 120px ${FONTS.big}`, '#4E6A76', 4);
  txt(g, 'R$', 120, 620, `700 64px ${FONTS.mono}`, '#58737E', 4);
  g.strokeStyle = 'rgba(40,70,86,0.5)'; g.lineWidth = 3; g.strokeRect(18, 18, 1524, 664);
  return c;
}

// Borda de um maço visto de lado: N folhas empilhadas.
export function drawPaperEdges(wPx, hPx, sheets, seed, { base = [214, 222, 224], tint = 0 } = {}) {
  const c = makeCanvas(wPx, hPx);
  const g = c.getContext('2d');
  const rnd = mulberry32(seed);
  const sh = hPx / sheets;
  for (let i = 0; i < sheets; i++) {
    const v = 0.9 + rnd() * 0.16;
    const [r, gg, b] = base.map((k) => Math.min(255, Math.round(k * v)));
    g.fillStyle = `rgb(${r},${gg},${b})`;
    g.fillRect(0, i * sh, wPx, sh + 0.5);
    g.fillStyle = 'rgba(40,55,62,0.35)';
    g.fillRect(0, i * sh + sh * 0.82, wPx, Math.max(0.6, sh * 0.18));
  }
  return c;
}

// Cinta de papel vermelha (topo): 34 x 71 mm a 10 px/mm.
export function drawBandTop() {
  const c = makeCanvas(340, 712);
  const g = c.getContext('2d');
  g.fillStyle = '#8E1D29'; g.fillRect(0, 0, 340, 712);
  g.drawImage(noiseCanvas(170, 356, 5, 0.08), 0, 0, 340, 712);
  g.save();
  g.translate(170, 356);
  txt(g, 'R$ 5.000', 0, -6, `400 74px ${FONTS.big}`, '#F1E9E4', 2, 'center');
  txt(g, '50 × 100', 0, 52, `700 30px ${FONTS.mono}`, 'rgba(241,233,228,0.8)', 3, 'center');
  g.restore();
  g.fillStyle = 'rgba(0,0,0,0.25)'; g.fillRect(0, 0, 6, 712); g.fillRect(334, 0, 6, 712);
  return c;
}

export function drawBandSide() {
  const c = makeCanvas(340, 64);
  const g = c.getContext('2d');
  g.fillStyle = '#7F1823'; g.fillRect(0, 0, 340, 64);
  g.drawImage(noiseCanvas(170, 32, 6, 0.1), 0, 0, 340, 64);
  return c;
}

// Face da pilha gigante: maços vistos de lado (com as cintas formando faixas).
// showBands=true -> lado comprido (cinta visível); false -> pontas dos maços.
export function drawBlockFace(seed, { showBands = true, cols = 14, rows = 390, size = 2048 } = {}) {
  const c = makeCanvas(size, size);
  const g = c.getContext('2d');
  const rnd = mulberry32(seed);
  const rh = size / rows;
  const cw = size / cols;
  g.fillStyle = '#C3CCCF'; g.fillRect(0, 0, size, size);
  // "tijolos" de 10 maços (R$ 50 mil) empilhados, levemente desalinhados
  const brick = 10;
  for (let r0 = 0; r0 < rows; r0 += brick) {
    const bj = (rnd() - 0.5) * cw * 0.06;
    for (let k = -1; k <= cols; k++) {
      const bx = k * cw + bj + (rnd() - 0.5) * cw * 0.05;
      for (let r = r0; r < Math.min(rows, r0 + brick); r++) {
        const y = r * rh;
        const x = bx + (rnd() - 0.5) * cw * 0.012;
        const v = 0.84 + rnd() * 0.14;
        g.fillStyle = `rgb(${Math.round(201 * v)},${Math.round(212 * v)},${Math.round(216 * v)})`;
        g.fillRect(x, y, cw - 2, rh);
        if (showBands) {
          const bw = cw * 0.2;
          const sh = 0.78 + rnd() * 0.22;
          g.fillStyle = `rgb(${Math.round(118 * sh)},${Math.round(30 * sh)},${Math.round(38 * sh)})`;
          g.fillRect(x + cw / 2 - bw / 2 + (rnd() - 0.5) * 1.5, y, bw, rh);
        }
        g.fillStyle = 'rgba(25,35,40,0.22)';
        g.fillRect(x, y + rh - Math.max(0.6, rh * 0.18), cw - 2, Math.max(0.6, rh * 0.18));
      }
      // vão escuro entre colunas de tijolos
      g.fillStyle = 'rgba(10,14,16,0.55)';
      g.fillRect(bx + cw - 2, r0 * rh, 2, brick * rh);
    }
    // filme/sombra entre camadas de tijolos
    g.fillStyle = 'rgba(12,16,18,0.45)';
    g.fillRect(0, Math.min(rows, r0 + brick) * rh - 1.5, size, 1.5);
  }
  for (let k = 0; k < 30; k++) {
    g.fillStyle = `rgba(0,0,0,${rnd() * 0.06})`;
    g.fillRect(0, rnd() * size, size, rh * (3 + rnd() * 14));
  }
  return c;
}
