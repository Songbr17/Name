// 0 – 9,8 s: matérias reais reconstruídas em janelas estilo Windows (vidro
// cinza-azulado, como nas referências), com a marcação vermelha passando
// sobre as frases no tempo da narração.
//
// Movimento pensado como no After Effects: cada janela é um layer 2D que entra
// com um pop curto de escala (mola bem amortecida) + opacidade de 3 quadros;
// todas estão parentadas a um "null de câmera" com keyframes de posição/escala
// em easy ease. A marcação é um sólido vermelho com máscara crescendo da
// esquerda para a direita, linha por linha, em velocidade constante.
import { W, H } from '../../core/config.js';
import { E, tw, kf, clamp, lerp, spring } from '../../core/ease.js';
import { fbm1 } from '../../core/rand.js';
import { ARTICLES, F } from './articles.js';

export const WIN_T = { glitch: 9.60, end: 9.80 };

export const TB = 56;   // altura da barra de título
export const FR = 12;   // espessura da moldura
export const R = 11;    // raio dos cantos externos
const MARK = '#FF0100';
const MARK_TEXT = '#650000';

// null de câmera: [t, [cx, cy, zoom], ease]
const CAM = [
  [0.00, [1120, 560, 1.250]],
  [2.85, [1124, 566, 1.288], E.inOutSoft],
  [3.85, [1430, 640, 1.170], E.inOut],
  [5.62, [1440, 648, 1.185], E.inOutSoft],
  [6.55, [1250, 860, 1.170], E.inOut],
  [6.92, [1252, 862, 1.176], E.inOutSoft],
  [7.85, [1760, 900, 1.130], E.inOut],
  [9.80, [1764, 896, 1.200], E.inOutSoft],
];

function setFont(ctx, b) {
  ctx.font = `${b.weight || 400} ${b.size}px ${b.font}`;
  ctx.letterSpacing = `${b.ls || 0}px`;
}

// Quebra de linha + posições (calculado uma vez, depois das fontes carregarem).
function layout(ctx, art) {
  const innerW = art.w - FR * 2 - art.pad.l - art.pad.r;
  let y = TB + art.pad.t;
  const out = {};
  for (const b of art.blocks) {
    if (b.rule) {
      y += b.gapT || 0;
      out[b.id] = { rule: true, y, h: b.h, color: b.color };
      y += b.h + (b.gapB || 0);
      continue;
    }
    setFont(ctx, b);
    const words = b.text.split(' ');
    const lines = [];
    let cur = '', start = 0, idx = 0;
    for (const w of words) {
      const test = cur ? cur + ' ' + w : w;
      if (cur && ctx.measureText(test).width > innerW) {
        lines.push({ text: cur, start });
        start = idx;
        cur = w;
      } else cur = test;
      idx += w.length + 1;
    }
    if (cur) lines.push({ text: cur, start });
    lines.forEach((l, i) => { l.base = y + b.size * 0.92 + i * b.lh; });
    out[b.id] = { b, lines, x: FR + art.pad.l };
    y += (lines.length - 1) * b.lh + b.size * 1.18 + (b.gapB || 0);
  }
  art.h = Math.round(y + art.pad.b + FR);
  art.L = out;

  // barras da marcação (uma por linha atingida), com a largura acumulada para
  // a varredura andar em velocidade constante de uma linha para a outra
  for (const m of art.marks) {
    const L = out[m.block];
    const b = L.b;
    const a0 = b.text.indexOf(m.phrase);
    if (a0 < 0) throw new Error(`frase não encontrada: ${m.phrase}`);
    const a1 = a0 + m.phrase.length;
    setFont(ctx, b);
    m.bars = [];
    let acc = 0;
    for (const l of L.lines) {
      const s = Math.max(a0, l.start), e = Math.min(a1, l.start + l.text.length);
      if (e <= s) continue;
      const xs = L.x + ctx.measureText(l.text.slice(0, s - l.start)).width;
      const xe = L.x + ctx.measureText(l.text.slice(0, e - l.start).trimEnd()).width;
      const bar = {
        x0: xs - Math.round(b.size * 0.2), x1: xe + Math.round(b.size * 0.24),
        y0: l.base - b.size * 0.88 - 3, y1: l.base + b.size * 0.30 + 3,
        line: l,
      };
      bar.w = bar.x1 - bar.x0;
      bar.acc = acc; acc += bar.w;
      m.bars.push(bar);
    }
    m.total = acc;
  }
}

// ------------------------------------------------------------ moldura "Aero"
export function roundRectPath(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y); ctx.lineTo(x + w - r, y); ctx.quadraticCurveTo(x + w, y, x + w, y + r);
  ctx.lineTo(x + w, y + h - r); ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  ctx.lineTo(x + r, y + h); ctx.quadraticCurveTo(x, y + h, x, y + h - r);
  ctx.lineTo(x, y + r); ctx.quadraticCurveTo(x, y, x + r, y);
  ctx.closePath();
}

export function drawChrome(ctx, art, seed) {
  const w = art.w, h = art.h;
  // sombra projetada (separa as janelas empilhadas)
  ctx.save();
  ctx.shadowColor = 'rgba(0,0,0,0.72)'; ctx.shadowBlur = 54; ctx.shadowOffsetY = 22;
  roundRectPath(ctx, 0, 0, w, h, R);
  ctx.fillStyle = '#5F6B7C'; ctx.fill();
  ctx.restore();

  // vidro: gradiente base + faixas diagonais de reflexo
  ctx.save();
  roundRectPath(ctx, 0, 0, w, h, R);
  ctx.clip();
  const g = ctx.createLinearGradient(0, 0, 0, h);
  g.addColorStop(0, '#9AA4B3'); g.addColorStop(TB / h, '#8994A6'); g.addColorStop(Math.min(1, (TB + 40) / h), '#7C889B'); g.addColorStop(1, '#8A97AC');
  ctx.fillStyle = g; ctx.fillRect(0, 0, w, h);
  const streaks = [
    [0.07, 0.10, 'rgba(214,220,229,0.55)'], [0.20, 0.05, 'rgba(235,239,245,0.42)'], [0.30, 0.16, 'rgba(70,84,105,0.42)'],
    [0.47, 0.07, 'rgba(225,231,240,0.36)'], [0.58, 0.20, 'rgba(66,80,102,0.38)'], [0.79, 0.06, 'rgba(230,235,242,0.40)'],
    [0.90, 0.12, 'rgba(120,150,195,0.35)'],
  ];
  for (const [p, wd, col] of streaks) {
    const x = (p + (seed % 7) * 0.013) * w, ww = wd * Math.max(600, w * 0.6);
    const gg = ctx.createLinearGradient(x - ww / 2, 0, x + ww / 2, 0);
    gg.addColorStop(0, 'rgba(0,0,0,0)'); gg.addColorStop(0.5, col); gg.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.save();
    ctx.transform(1, 0, -0.32, 1, 0, 0);
    ctx.fillStyle = gg; ctx.fillRect(x - ww, 0, ww * 2 + h * 0.4, h);
    ctx.restore();
  }
  // brilho suave no alto da barra de título
  const gt = ctx.createLinearGradient(0, 0, 0, TB);
  gt.addColorStop(0, 'rgba(255,255,255,0.20)'); gt.addColorStop(0.5, 'rgba(255,255,255,0.04)'); gt.addColorStop(1, 'rgba(0,0,0,0.06)');
  ctx.fillStyle = gt; ctx.fillRect(0, 0, w, TB);
  ctx.restore();

  // contornos: escuro por fora, filete claro por dentro
  ctx.save();
  roundRectPath(ctx, 0.75, 0.75, w - 1.5, h - 1.5, R);
  ctx.strokeStyle = '#17191D'; ctx.lineWidth = 1.5; ctx.stroke();
  roundRectPath(ctx, 2.2, 2.2, w - 4.4, h - 4.4, R - 1.5);
  ctx.strokeStyle = 'rgba(225,230,238,0.55)'; ctx.lineWidth = 1.2; ctx.stroke();
  ctx.restore();

  // área do conteúdo (branca) com filete claro + linha escura interna
  const cx = FR, cy = TB, cw = w - FR * 2, ch = h - TB - FR;
  ctx.fillStyle = '#C9CED7'; ctx.fillRect(cx - 2, cy - 2, cw + 4, ch + 4);
  ctx.fillStyle = '#7E8696'; ctx.fillRect(cx - 1, cy - 1, cw + 2, ch + 2);
  ctx.fillStyle = '#FFFFFF'; ctx.fillRect(cx, cy, cw, ch);

  // legenda
  ctx.font = `400 30px ${F.ui}`; ctx.letterSpacing = '0px';
  ctx.fillStyle = '#0D0E11'; ctx.textBaseline = 'alphabetic';
  ctx.fillText(art.caption, 26, 39);

  // botões (min, max, fechar) presos na borda de cima
  const bw = [58, 54, 96], bh = 31, gap = 0;
  const total = bw[0] + bw[1] + bw[2] + gap * 2;
  let bx = w - 16 - total;
  const by = 1;
  ctx.save();
  roundRectPath(ctx, bx, by - 8, total, bh + 8, 6);
  ctx.clip();
  const gb = ctx.createLinearGradient(0, by, 0, by + bh);
  gb.addColorStop(0, '#A9B6CA'); gb.addColorStop(0.5, '#8C9BB3'); gb.addColorStop(1, '#8696AF');
  ctx.fillStyle = gb; ctx.fillRect(bx, by - 8, total, bh + 8);
  ctx.restore();
  ctx.save();
  roundRectPath(ctx, bx + 0.75, by - 8, total - 1.5, bh + 7.25, 6);
  ctx.strokeStyle = '#1C2029'; ctx.lineWidth = 1.5; ctx.stroke();
  ctx.restore();
  ctx.fillStyle = '#2A2F39';
  ctx.fillRect(bx + bw[0] - 0.75, by, 1.5, bh - 1);
  ctx.fillRect(bx + bw[0] + bw[1] - 0.75, by, 1.5, bh - 1);
  ctx.fillStyle = 'rgba(255,255,255,0.35)';
  ctx.fillRect(bx + bw[0] + 0.75, by + 2, 1, bh - 5);
  ctx.fillRect(bx + bw[0] + bw[1] + 0.75, by + 2, 1, bh - 5);
  const icon = (fn) => { ctx.save(); ctx.lineJoin = 'round'; ctx.strokeStyle = '#111317'; ctx.lineWidth = 3.2; ctx.fillStyle = '#FFFFFF'; fn(); ctx.restore(); };
  // minimizar
  let ix = bx + bw[0] / 2, iy = by + bh / 2 + 3;
  icon(() => { ctx.beginPath(); ctx.rect(ix - 11, iy - 3, 22, 7); ctx.stroke(); ctx.fill(); });
  // maximizar
  ix = bx + bw[0] + bw[1] / 2; iy = by + bh / 2;
  icon(() => {
    ctx.beginPath(); ctx.rect(ix - 10, iy - 8, 20, 16); ctx.stroke(); ctx.fill();
    ctx.fillStyle = '#8C9BB3'; ctx.fillRect(ix - 5, iy - 2.5, 10, 6);
    ctx.strokeStyle = '#111317'; ctx.lineWidth = 1.6; ctx.strokeRect(ix - 5, iy - 2.5, 10, 6);
  });
  // fechar (X grosso com contorno)
  ix = bx + bw[0] + bw[1] + bw[2] / 2; iy = by + bh / 2;
  icon(() => {
    ctx.beginPath();
    const s = 8.5;
    ctx.moveTo(ix - s, iy - s * 0.8); ctx.lineTo(ix + s, iy + s * 0.8);
    ctx.moveTo(ix + s, iy - s * 0.8); ctx.lineTo(ix - s, iy + s * 0.8);
    ctx.lineCap = 'round';
    ctx.strokeStyle = '#111317'; ctx.lineWidth = 9.5; ctx.stroke();
    ctx.strokeStyle = '#FFFFFF'; ctx.lineWidth = 5; ctx.stroke();
  });
}

function drawContent(ctx, art) {
  const L = art.L;
  ctx.textBaseline = 'alphabetic';
  for (const b of art.blocks) {
    const o = L[b.id];
    if (o.rule) { ctx.fillStyle = o.color; ctx.fillRect(FR + art.pad.l, o.y, art.w - FR * 2 - art.pad.l - art.pad.r, o.h); continue; }
    setFont(ctx, b);
    ctx.fillStyle = b.color;
    for (const l of o.lines) ctx.fillText(l.text, o.x, l.base);
  }
}

function drawMarks(ctx, art, t) {
  for (const m of art.marks) {
    const p = tw(t, m.t0, m.t1, E.inOutSoft);
    if (p <= 0) continue;
    const L = art.L[m.block];
    const b = L.b;
    const reach = m.total * p;
    for (const bar of m.bars) {
      const vis = clamp(reach - bar.acc, 0, bar.w);
      if (vis <= 0) continue;
      ctx.save();
      ctx.beginPath(); ctx.rect(bar.x0, bar.y0, vis, bar.y1 - bar.y0); ctx.clip();
      ctx.fillStyle = MARK; ctx.fillRect(bar.x0, bar.y0, bar.w, bar.y1 - bar.y0);
      setFont(ctx, b);
      ctx.fillStyle = MARK_TEXT;
      ctx.fillText(bar.line.text, L.x, bar.line.base);
      ctx.restore();
    }
  }
}

export function createWindows() {
  let ready = false;
  function prepare(ctx) {
    if (ready) return;
    ctx.save();
    for (const a of ARTICLES) layout(ctx, a);
    ctx.restore();
    if (window.DEBUG_LAYOUT) console.log('layout', JSON.stringify(ARTICLES.map((a) => [a.id, a.x, a.y, a.w, a.h])));
    ready = true;
  }

  function camera(t) {
    const [cx, cy, z] = kf(t, CAM);
    // deriva lenta de "câmera na mão" (alguns px)
    const dx = fbm1(t * 0.22, 41) * 7, dy = fbm1(t * 0.19, 43) * 5;
    return { cx: cx + dx, cy: cy + dy, z };
  }

  function ui(ctx, t) {
    if (t >= WIN_T.end) return;
    prepare(ctx);
    const cam = camera(t);
    ARTICLES.forEach((art, i) => {
      if (t < art.tIn) return;
      const a = t - art.tIn;
      const sp = spring(t, art.tIn, 2.9, 0.72);
      const s = lerp(0.915, 1, sp);
      const op = clamp(a / 0.11);
      const oy = (1 - sp) * 46;
      // janelas mais antigas escurecem quando chega uma nova
      let dim = 0;
      for (let k = i + 1; k < ARTICLES.length; k++) dim = Math.max(dim, (k === i + 1 ? 0.36 : 0.5) * tw(t, ARTICLES[k].tIn, ARTICLES[k].tIn + 0.28, E.inOut));
      const ox = art.x + art.w / 2, oyc = art.y + art.h / 2;
      ctx.save();
      ctx.globalAlpha = op;
      // tela = (desk - cam) * zoom + centro ; janela escala em torno do próprio centro
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.translate(W / 2, H / 2);
      ctx.scale(cam.z, cam.z);
      ctx.translate(-cam.cx, -cam.cy);
      ctx.translate(ox, oyc + oy);
      ctx.scale(s, s);
      ctx.translate(-art.w / 2, -art.h / 2);
      drawChrome(ctx, art, i * 3 + 1);
      ctx.save();
      ctx.beginPath(); ctx.rect(FR, TB, art.w - FR * 2, art.h - TB - FR); ctx.clip();
      drawContent(ctx, art);
      drawMarks(ctx, art, t);
      ctx.restore();
      if (dim > 0) {
        roundRectPath(ctx, 0, 0, art.w, art.h, R);
        ctx.fillStyle = `rgba(4,5,7,${dim})`; ctx.fill();
      }
      ctx.restore();
    });
    ctx.setTransform(1, 0, 0, 1, 0, 0);
  }

  // Amostras de motion blur proporcionais ao deslocamento real na tela durante
  // o obturador (como o "adaptive sample limit" do After Effects): o rastro fica
  // contínuo, sem "cópias" escalonadas do texto.
  function shutterDisp(t) {
    const h = 0.25 / 24;
    const a = camera(t - h), b = camera(t + h), c = camera(t);
    let m = 0;
    for (const [sx, sy] of [[0, 0], [W, 0], [0, H], [W, H], [W / 2, H / 2]]) {
      const px = (sx - W / 2) / c.z + c.cx, py = (sy - H / 2) / c.z + c.cy;
      const ax = (px - a.cx) * a.z, ay = (py - a.cy) * a.z;
      const bx = (px - b.cx) * b.z, by = (py - b.cy) * b.z;
      m = Math.max(m, Math.hypot(bx - ax, by - ay));
    }
    return m;
  }
  function samples(t) {
    let n = Math.ceil(shutterDisp(t) / 1.6);
    for (const art of ARTICLES) if (t >= art.tIn - 0.02 && t < art.tIn + 0.32) n = Math.max(n, 14);
    return clamp(n, 2, 24);
  }

  return { ui, samples };
}
