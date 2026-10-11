// Texturas procedurais da sala dos carimbos (canvas -> textura).
import { makeCanvas } from '../../core/three-utils.js';
import { mulberry32 } from '../../core/rand.js';

// Veios de madeira (base clara dos carimbos / tampo escuro da mesa)
export function woodCanvas(seed, { w = 512, h = 256, base = '#B88B5A', dark = 'rgba(70,40,18,0.30)', light = 'rgba(255,225,180,0.10)', rings = 26 } = {}) {
  const c = makeCanvas(w, h);
  const g = c.getContext('2d');
  const r = mulberry32(seed);
  g.fillStyle = base; g.fillRect(0, 0, w, h);
  for (let i = 0; i < rings; i++) {
    const y0 = r() * h, amp = 4 + r() * 10, f = 0.004 + r() * 0.01, ph = r() * 6.28;
    g.strokeStyle = r() < 0.6 ? dark : light;
    g.lineWidth = 0.6 + r() * 2.2;
    g.beginPath();
    for (let x = 0; x <= w; x += 8) {
      const y = y0 + Math.sin(x * f + ph) * amp + Math.sin(x * f * 3.1 + ph * 2) * amp * 0.25;
      if (x === 0) g.moveTo(x, y); else g.lineTo(x, y);
    }
    g.stroke();
  }
  // poros finos
  for (let i = 0; i < w * h * 0.004; i++) {
    g.fillStyle = `rgba(40,20,8,${0.05 + r() * 0.12})`;
    g.fillRect(r() * w, r() * h, 1 + r() * 5, 1);
  }
  return c;
}

// Etiqueta redonda impressa no topo da base do carimbo (prévia do selo + banco)
export function stampLabelCanvas(i) {
  const S = 256;
  const c = makeCanvas(S, S);
  const g = c.getContext('2d');
  g.fillStyle = '#5A4632'; g.fillRect(0, 0, S, S);
  g.fillStyle = '#ECE8DD'; g.beginPath(); g.arc(S / 2, S / 2, S * 0.47, 0, Math.PI * 2); g.fill();
  g.strokeStyle = '#A1222E'; g.lineWidth = 9;
  g.beginPath(); g.arc(S / 2, S / 2, S * 0.38, 0, Math.PI * 2); g.stroke();
  g.lineWidth = 3; g.beginPath(); g.arc(S / 2, S / 2, S * 0.30, 0, Math.PI * 2); g.stroke();
  g.fillStyle = '#2A2826'; g.textAlign = 'center';
  g.font = '700 30px "FreeMonoBold"';
  g.fillText('BANCO', S / 2, S / 2 - 14);
  g.font = '400 64px "Anton"';
  g.fillText(String(i + 1).padStart(2, '0'), S / 2, S / 2 + 50);
  return c;
}

// Ordem de pagamento em papel (a mesma do trecho 2D, agora física)
export function paperCanvas() {
  const W = 740, H = 1050;
  const c = makeCanvas(W, H);
  const g = c.getContext('2d');
  const r = mulberry32(77);
  g.fillStyle = '#EAE7DF'; g.fillRect(0, 0, W, H);
  for (let i = 0; i < 2600; i++) { g.fillStyle = `rgba(120,110,95,${r() * 0.05})`; g.fillRect(r() * W, r() * H, 1 + r() * 3, 1); }
  g.fillStyle = '#7E1C26'; g.fillRect(48, 52, W - 96, 64);
  g.fillStyle = '#EAE7DF'; g.font = '700 38px "FreeMonoBold"';
  g.fillText('ORDEM DE PAGAMENTO', 70, 98);
  g.fillStyle = '#55524C'; g.font = '30px "FreeMono"';
  const rows = ['EM NOME DE', 'INSTITUIÇÃO', 'DESTINO', 'SPB'];
  g.fillText(rows[0], 60, 190); g.fillStyle = '#23211E'; g.fillText('BANCO 14', 60, 230);
  g.fillStyle = '#55524C'; g.fillText(rows[2], 60, 300); g.fillStyle = '#23211E'; g.fillText(rows[3], 60, 340);
  g.fillStyle = '#C9C5BB';
  for (let k = 0; k < 7; k++) g.fillRect(60, 410 + k * 48, (k % 3 === 2 ? 380 : 600) - 60, 10);
  g.fillStyle = '#6D6A63'; g.fillRect(60, 900, W - 120, 3);
  g.fillStyle = '#55524C'; g.font = '26px "FreeMono"';
  g.fillText('ASSINATURA / CARIMBO', 60, 940);
  return c;
}

// Impressão do carimbo (tinta vermelha com falhas) — fundo transparente
export function sealCanvas() {
  const S = 1024;
  const c = makeCanvas(S, S);
  const g = c.getContext('2d');
  const cx = S / 2, cy = S / 2;
  g.strokeStyle = '#B21E2C'; g.fillStyle = '#B21E2C';
  g.lineWidth = 34; g.beginPath(); g.arc(cx, cy, 440, 0, Math.PI * 2); g.stroke();
  g.lineWidth = 12; g.beginPath(); g.arc(cx, cy, 352, 0, Math.PI * 2); g.stroke();
  // texto em volta
  const txt = 'ASSINATURA DIGITAL • INSTITUIÇÃO FINANCEIRA • ';
  g.font = '700 56px "FreeMonoBold"';
  const step = (Math.PI * 2) / txt.length;
  for (let i = 0; i < txt.length; i++) {
    const a = -Math.PI / 2 + i * step;
    g.save(); g.translate(cx + Math.cos(a) * 396, cy + Math.sin(a) * 396); g.rotate(a + Math.PI / 2);
    g.textAlign = 'center'; g.fillText(txt[i], 0, 18); g.restore();
  }
  // centro
  g.fillRect(cx - 250, cy - 120, 500, 12); g.fillRect(cx - 250, cy + 110, 500, 12);
  g.font = '400 200px "Anton"'; g.textAlign = 'center';
  g.fillText('VÁLIDO', cx, cy + 74);
  // falhas de tinta (borracha gasta)
  const r = mulberry32(5);
  g.globalCompositeOperation = 'destination-out';
  for (let i = 0; i < 2200; i++) {
    const x = r() * S, y = r() * S, rr = 1 + r() * r() * 9;
    g.globalAlpha = 0.25 + r() * 0.75;
    g.beginPath(); g.arc(x, y, rr, 0, Math.PI * 2); g.fill();
  }
  // borda levemente mais fraca de um lado (pressão desigual)
  const grad = g.createLinearGradient(0, 0, S, S * 0.4);
  grad.addColorStop(0, 'rgba(0,0,0,0.45)'); grad.addColorStop(0.45, 'rgba(0,0,0,0)');
  g.globalAlpha = 1; g.fillStyle = grad; g.fillRect(0, 0, S, S);
  g.globalCompositeOperation = 'source-over';
  return c;
}

// Grade do topo da plataforma (linhas finas) — usada como máscara de emissão
export function gridCanvas(n = 25) {
  const S = 1024;
  const c = makeCanvas(S, S);
  const g = c.getContext('2d');
  g.fillStyle = '#000'; g.fillRect(0, 0, S, S);
  g.strokeStyle = '#FFF'; g.lineWidth = 2;
  const m = S * 0.043, step = (S - 2 * m) / n;
  for (let i = 0; i <= n; i++) {
    g.beginPath(); g.moveTo(m + i * step, m); g.lineTo(m + i * step, S - m); g.stroke();
    g.beginPath(); g.moveTo(m, m + i * step); g.lineTo(S - m, m + i * step); g.stroke();
  }
  g.lineWidth = 5; g.strokeRect(m * 0.5, m * 0.5, S - m, S - m);
  return c;
}
