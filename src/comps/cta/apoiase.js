// Página da campanha "Flux — Crimes Digitais do Brasil" no Apoia.se,
// reconstruída a partir das capturas de tela (coordenadas da captura 1908 px),
// dentro de uma janela de navegador no mesmo estilo das matérias.
import { PAL, FONTS } from '../../core/config.js';
import { E, tw, clamp, lerp } from '../../core/ease.js';
import { drawChrome, roundRectPath, TB, FR } from '../camada/windows.js';

export const PT = '"PT Sans"';
export const PAGE_W = 1908;
export const C = {
  header: '#FBF6F3', apoia: '#EB4A3B', banner: '#090A0B', text: '#4A4A4A', textDim: '#8A8A8A',
  green: '#4EB19A', greenHover: '#5CC3AB', fluxRed: '#A50D26', border: '#E6E6E6', tab: '#E8513F',
};
export const ADDR_H = 74;   // faixa da barra de endereço (px do navegador)

// ------------------------------------------------------------ marca FLUX_
// "FLUX" cinza-prata em degradê + traço vermelho, dentro da caixa de seleção
// tracejada com alças vermelhas (como no banner da campanha).
export function fluxLogo(ctx, x, base, size, { underscore = 1, box = 1, letters = 4, letterP = null, handleColor = C.fluxRed, boxColor = 'rgba(200,202,205,0.55)' } = {}) {
  ctx.save();
  ctx.font = `900 ${size}px "Inter"`;
  ctx.letterSpacing = `${-size * 0.02}px`;
  const word = 'FLUX';
  let cx = x;
  const g = ctx.createLinearGradient(0, base - size * 0.74, 0, base);
  g.addColorStop(0, '#EDEEF0'); g.addColorStop(1, '#BDBEC1');
  for (let i = 0; i < word.length; i++) {
    const w = ctx.measureText(word[i]).width - size * 0.02;
    const p = letterP ? letterP[i] : (i < letters ? 1 : 0);
    if (p > 0) {
      ctx.save();
      ctx.globalAlpha *= clamp(p * 3);
      const dy = (1 - E.outQuart(clamp(p))) * -size * 0.22;
      const sc = lerp(1.18, 1, E.outQuart(clamp(p)));
      ctx.translate(cx + w / 2, base - size * 0.36 + dy);
      ctx.scale(sc, sc);
      ctx.translate(-(cx + w / 2), -(base - size * 0.36));
      ctx.fillStyle = g;
      ctx.fillText(word[i], cx, base);
      ctx.restore();
    }
    cx += w;
  }
  const uw = size * 0.55, uh = size * 0.13, ux = cx + size * 0.1, uy = base - uh;
  if (underscore > 0) { ctx.fillStyle = C.fluxRed; ctx.fillRect(ux, uy, uw * E.outQuart(clamp(underscore)), uh); }
  const bx0 = x - size * 0.42, bx1 = ux + uw + size * 0.28, by0 = base - size * 0.98, by1 = base + size * 0.33;
  if (box > 0) {
    const p = E.outQuart(clamp(box));
    ctx.strokeStyle = boxColor; ctx.lineWidth = Math.max(1.5, size * 0.012);
    ctx.setLineDash([size * 0.035, size * 0.03]);
    ctx.beginPath();
    const mx = (bx0 + bx1) / 2, my = (by0 + by1) / 2;
    ctx.moveTo(lerp(mx, bx0, p), by0); ctx.lineTo(lerp(mx, bx1, p), by0);
    ctx.moveTo(lerp(mx, bx0, p), by1); ctx.lineTo(lerp(mx, bx1, p), by1);
    ctx.moveTo(bx0, lerp(my, by0, p)); ctx.lineTo(bx0, lerp(my, by1, p));
    ctx.moveTo(bx1, lerp(my, by0, p)); ctx.lineTo(bx1, lerp(my, by1, p));
    ctx.stroke(); ctx.setLineDash([]);
    const hs = size * 0.075 * clamp((box - 0.3) / 0.4);
    if (hs > 0) {
      ctx.fillStyle = handleColor;
      for (const [hx, hy] of [[bx0, by0], [bx1, by0], [bx0, by1], [bx1, by1], [bx0, my], [bx1, my], [mx, by1]]) ctx.fillRect(hx - hs / 2, hy - hs / 2, hs, hs);
    }
  }
  ctx.restore();
  return { x0: bx0, x1: bx1, y0: by0, y1: by1, end: ux + uw };
}

// avatar "F_" (círculo preto com borda branca)
export function fluxAvatar(ctx, cx, cy, r, { border = true } = {}) {
  ctx.save();
  if (border) { ctx.fillStyle = '#FFFFFF'; ctx.beginPath(); ctx.arc(cx, cy, r + r * 0.07, 0, Math.PI * 2); ctx.fill(); }
  ctx.fillStyle = '#0E0F11'; ctx.beginPath(); ctx.arc(cx, cy, r, 0, Math.PI * 2); ctx.fill();
  ctx.font = `900 ${r * 1.08}px "Inter"`;
  ctx.fillStyle = '#EEEFF1';
  ctx.fillText('F', cx - r * 0.5, cy + r * 0.38);
  ctx.fillStyle = C.fluxRed;
  ctx.fillRect(cx + r * 0.06, cy + r * 0.27, r * 0.5, r * 0.12);
  ctx.restore();
}

function ptFont(ctx, size, weight = 400) { ctx.font = `${weight} ${size}px ${PT}`; ctx.letterSpacing = '0px'; }

function wrap(ctx, text, maxW) {
  const words = text.split(' '); const lines = []; let cur = '';
  for (const w of words) { const tst = cur ? cur + ' ' + w : w; if (cur && ctx.measureText(tst).width > maxW) { lines.push(cur); cur = w; } else cur = tst; }
  if (cur) lines.push(cur);
  return lines;
}

// ------------------------------------------------------------ página
// reveal: 0..1 (a página "carrega" de cima para baixo); hover: botão verde
export function drawApoiaPage(ctx, { reveal = 1, hover = 0, press = 0 } = {}) {
  const rv = (a, b) => clamp((reveal - a) / (b - a));
  // fundo
  ctx.fillStyle = '#FFFFFF'; ctx.fillRect(0, 0, PAGE_W, 1300);
  // cabeçalho
  let a = rv(0, 0.15);
  if (a > 0) {
    ctx.save(); ctx.globalAlpha *= a;
    ctx.fillStyle = C.header; ctx.fillRect(0, 0, PAGE_W, 51);
    ctx.font = '900 33px "Nunito"'; ctx.letterSpacing = '0.5px'; ctx.fillStyle = C.apoia;
    ctx.fillText('APOIA.', 470, 37);
    const wA = ctx.measureText('APOIA.').width;
    ctx.font = '700 36px "Kalam"'; ctx.letterSpacing = '0px';
    ctx.fillText('se', 470 + wA - 2, 37);
    ptFont(ctx, 15);
    ctx.fillStyle = '#4A4A4A';
    ctx.fillText('Modalidades ▾', 883, 29); ctx.fillText('Recursos ▾', 991, 29);
    ctx.strokeStyle = '#4A4A4A'; ctx.lineWidth = 1.6;
    ctx.beginPath(); ctx.arc(1082, 23, 5, 0, Math.PI * 2); ctx.moveTo(1086, 27); ctx.lineTo(1090, 31); ctx.stroke();
    ctx.fillText('Buscar campanhas', 1093, 29);
    ctx.restore();
  }
  // banner
  a = rv(0.08, 0.35);
  if (a > 0) {
    ctx.save(); ctx.globalAlpha *= a;
    ctx.fillStyle = C.banner; ctx.fillRect(0, 51, PAGE_W, 207);
    ctx.font = '700 22px "JBMono"'; ctx.letterSpacing = '11px'; ctx.fillStyle = 'rgba(150,152,155,0.75)';
    ctx.fillText('TRUE CRIME DIGITAL — OS MAIORES CRIMES DIGITAIS DO BRASIL', 404, 221);
    fluxLogo(ctx, 793, 140, 112, { boxColor: 'rgba(180,182,185,0.5)' });
    // título e subtítulo (por cima do banner, como na página)
    ptFont(ctx, 44); ctx.fillStyle = '#FFFFFF';
    ctx.shadowColor = 'rgba(0,0,0,0.6)'; ctx.shadowBlur = 6; ctx.shadowOffsetY = 2;
    ctx.fillText('Flux — Crimes Digitais', 636, 176);
    ctx.fillText('do Brasil', 636, 220);
    ptFont(ctx, 15);
    ctx.fillText('True crime digital para quem quer entender o golpe, não só a manchete.', 638, 244);
    ctx.restore();
  }
  // abas
  a = rv(0.25, 0.45);
  if (a > 0) {
    ctx.save(); ctx.globalAlpha *= a;
    ptFont(ctx, 15);
    ctx.fillStyle = C.tab; ctx.fillText('Sobre', 637, 291);
    ctx.fillRect(637, 310, 36, 2);
    ctx.fillStyle = '#4A4A4A';
    ctx.fillText('Posts no Mural', 727, 291); ctx.fillText('Apoiadores(as)', 875, 291);
    ctx.fillStyle = C.border; ctx.fillRect(0, 312, PAGE_W, 1);
    ctx.restore();
  }
  // avatar
  a = rv(0.2, 0.42);
  if (a > 0) { ctx.save(); ctx.globalAlpha *= a; fluxAvatar(ctx, 532, 238, 58); ctx.restore(); }
  // vídeo
  a = rv(0.35, 0.6);
  if (a > 0) {
    ctx.save(); ctx.globalAlpha *= a;
    ctx.fillStyle = '#000000'; ctx.fillRect(471, 353, 567, 319);
    ctx.fillStyle = '#FF0000'; roundRectPath(ctx, 724, 491, 60, 42, 11); ctx.fill();
    ctx.fillStyle = '#FFFFFF'; ctx.beginPath(); ctx.moveTo(748, 502); ctx.lineTo(764, 512); ctx.lineTo(748, 522); ctx.closePath(); ctx.fill();
    ctx.restore();
  }
  // descrição
  a = rv(0.5, 0.8);
  if (a > 0) {
    ctx.save(); ctx.globalAlpha *= a;
    ptFont(ctx, 14.5); ctx.fillStyle = '#555555';
    const p1 = 'O Flux conta os maiores crimes digitais do mundo: invasões, fraudes bancárias, golpes com Pix e cripto, vazamentos. Cada vídeo reconstrói um caso real do começo ao fim, com linha do tempo, documentos oficiais e decisões judiciais, explicado de um jeito que qualquer pessoa entende, mesmo sem saber nada de tecnologia.';
    const p2 = 'Não é notícia. É investigação: entender como aconteceu, quem falhou e o que isso diz sobre o dinheiro que está na sua conta.';
    let y = 706;
    for (const l of wrap(ctx, p1, 566)) { ctx.fillText(l, 471, y); y += 23; }
    y += 24;
    for (const l of wrap(ctx, p2, 566)) { ctx.fillText(l, 471, y); y += 23; }
    y += 24;
    ptFont(ctx, 15, 700); ctx.fillStyle = '#333333'; ctx.fillText('Quem faz', 471, y);
    ptFont(ctx, 14.5); ctx.fillStyle = '#555555'; y += 23;
    for (const l of wrap(ctx, 'Uma pessoa só. Sem equipe, sem estúdio, sem produtora. Cada caso que chega ao canal foi escolhido, investigado e montado por mim.', 566)) { ctx.fillText(l, 471, y); y += 23; }
    ctx.restore();
  }
  // card lateral com o botão (os contadores da captura ficam de fora)
  a = rv(0.3, 0.55);
  if (a > 0) {
    ctx.save(); ctx.globalAlpha *= a;
    ctx.shadowColor = 'rgba(0,0,0,0.06)'; ctx.shadowBlur = 8; ctx.shadowOffsetY = 2;
    ctx.fillStyle = '#FFFFFF'; roundRectPath(ctx, 1101, 353, 333, 168, 9); ctx.fill();
    ctx.shadowColor = 'transparent';
    ctx.strokeStyle = C.border; ctx.lineWidth = 1.2; roundRectPath(ctx, 1101.5, 353.5, 332, 167, 9); ctx.stroke();
    // botão (hover clareia, clique afunda)
    const by = 377 + press * 2;
    ctx.fillStyle = hover > 0 ? lerpColor(C.green, C.greenHover, hover) : C.green;
    roundRectPath(ctx, 1125, by, 286, 38, 3); ctx.fill();
    ptFont(ctx, 15); ctx.fillStyle = '#FFFFFF'; ctx.textAlign = 'center';
    ctx.fillText('Apoiar com R$ 5 ou +', 1268, by + 24);
    ctx.textAlign = 'left';
    ptFont(ctx, 15, 700); ctx.fillStyle = '#777777'; ctx.fillText('Tipo de campanha:', 1125, 457);
    ctx.strokeStyle = C.tab; ctx.lineWidth = 1.8;
    heart(ctx, 1266, 453, 11);
    ptFont(ctx, 13); ctx.fillStyle = '#999999'; ctx.fillText('contínua', 1283, 451); ptFont(ctx, 13, 700); ctx.fillText('por mês', 1283, 465);
    ctx.fillStyle = C.border; ctx.fillRect(1125, 492, 286, 1);
    ctx.restore();
  }
}

function heart(ctx, x, y, s) {
  ctx.beginPath();
  ctx.moveTo(x, y + s * 0.55);
  ctx.bezierCurveTo(x - s * 1.1, y - s * 0.1, x - s * 0.55, y - s * 0.95, x, y - s * 0.35);
  ctx.bezierCurveTo(x + s * 0.55, y - s * 0.95, x + s * 1.1, y - s * 0.1, x, y + s * 0.55);
  ctx.stroke();
}

function lerpColor(a, b, k) {
  const pa = [1, 3, 5].map((i) => parseInt(a.slice(i, i + 2), 16)), pb = [1, 3, 5].map((i) => parseInt(b.slice(i, i + 2), 16));
  return `rgb(${pa.map((v, i) => Math.round(lerp(v, pb[i], k))).join(',')})`;
}

// ------------------------------------------------------------ recompensas
export const REWARDS = [
  { price: 'R$ 5 ou mais', title: 'Apoiador', text: 'Você ajuda o Flux a existir. Acesso ao mural da campanha, onde aviso em primeira mão sobre os próximos vídeos, e meu agradecimento de verdade.' },
  { price: 'R$ 15 ou mais', title: 'Nos créditos', text: 'Seu nome nos créditos finais de todos os vídeos enquanto você apoiar. Inclui tudo da recompensa anterior.' },
  { price: 'R$ 30 ou mais', title: 'Bastidores', text: 'Acesso antecipado a cada vídeo, pelo menos 24 horas antes da estreia pública, e o roteiro completo de cada episódio em PDF. Você também vota no próximo caso entre as opções que eu selecionar. Inclui tudo das recompensas anteriores.' },
];
export const CARD = { w: 333, h: 330 };

// card de recompensa em coordenadas próprias (0,0 = canto superior esquerdo)
export function drawRewardCard(ctx, i, { glow = 0 } = {}) {
  const r = REWARDS[i];
  ctx.save();
  ctx.shadowColor = 'rgba(0,0,0,0.55)'; ctx.shadowBlur = 30; ctx.shadowOffsetY = 12;
  ctx.fillStyle = '#FFFFFF'; roundRectPath(ctx, 0, 0, CARD.w, CARD.h, 9); ctx.fill();
  ctx.shadowColor = 'transparent';
  ctx.strokeStyle = glow > 0 ? `rgba(178,145,101,${glow})` : C.border; ctx.lineWidth = glow > 0 ? 4 : 1.2;
  roundRectPath(ctx, 0.5, 0.5, CARD.w - 1, CARD.h - 1, 9); ctx.stroke();
  ptFont(ctx, 23); ctx.fillStyle = '#8F8F8F'; ctx.fillText(r.price, 24, 44);
  ptFont(ctx, 21, 700); ctx.fillStyle = '#333333'; ctx.fillText(r.title, 24, 84);
  ptFont(ctx, 13.5); ctx.fillStyle = '#8A8A8A';
  let y = 106;
  for (const l of wrap(ctx, r.text, CARD.w - 48)) { ctx.fillText(l, 24, y); y += 17.5; }
  ctx.strokeStyle = C.green; ctx.lineWidth = 1.3;
  roundRectPath(ctx, 24, CARD.h - 68, CARD.w - 48, 45, 3); ctx.stroke();
  ptFont(ctx, 15.5); ctx.fillStyle = '#333333'; ctx.textAlign = 'center';
  ctx.fillText('Apoiar com esta recompensa', CARD.w / 2, CARD.h - 40);
  ctx.textAlign = 'left';
  ctx.restore();
}

// ------------------------------------------------------------ navegador
// B = { w, h, caption, url (texto digitado), caret (bool), focus (0..1), load (0..1),
//       reveal (0..1), hover, press }
export function drawBrowser(ctx, B) {
  const art = { w: B.w, h: B.h, caption: B.caption };
  drawChrome(ctx, art, 5);
  const cx = FR, cy = TB, cw = B.w - FR * 2, ch = B.h - TB - FR;
  ctx.save();
  ctx.beginPath(); ctx.rect(cx, cy, cw, ch); ctx.clip();
  // barra de endereço
  ctx.fillStyle = '#EEF0F3'; ctx.fillRect(cx, cy, cw, ADDR_H);
  ctx.fillStyle = '#D5D9DF'; ctx.fillRect(cx, cy + ADDR_H - 1, cw, 1);
  ctx.strokeStyle = '#6B717A'; ctx.lineWidth = 3; ctx.lineCap = 'round';
  const ay = cy + ADDR_H / 2;
  ctx.beginPath(); ctx.moveTo(cx + 44, ay); ctx.lineTo(cx + 30, ay); ctx.moveTo(cx + 37, ay - 7); ctx.lineTo(cx + 30, ay); ctx.lineTo(cx + 37, ay + 7); ctx.stroke();
  ctx.strokeStyle = '#A4AAB2';
  ctx.beginPath(); ctx.moveTo(cx + 68, ay); ctx.lineTo(cx + 82, ay); ctx.moveTo(cx + 75, ay - 7); ctx.lineTo(cx + 82, ay); ctx.lineTo(cx + 75, ay + 7); ctx.stroke();
  ctx.strokeStyle = '#6B717A';
  ctx.beginPath(); ctx.arc(cx + 116, ay, 8, -Math.PI * 0.2, Math.PI * 1.45); ctx.stroke();
  const fx = cx + 150, fw = cw - 190, fy = cy + 13, fh = ADDR_H - 26;
  ctx.fillStyle = '#FFFFFF'; roundRectPath(ctx, fx, fy, fw, fh, fh / 2); ctx.fill();
  if (B.focus > 0) { ctx.strokeStyle = `rgba(66,133,244,${B.focus})`; ctx.lineWidth = 2.5; roundRectPath(ctx, fx, fy, fw, fh, fh / 2); ctx.stroke(); }
  // cadeado + url
  ctx.strokeStyle = '#5F6670'; ctx.fillStyle = '#5F6670'; ctx.lineWidth = 2;
  ctx.beginPath(); ctx.arc(fx + 30, fy + fh / 2 - 3, 5, Math.PI, 0); ctx.stroke();
  ctx.fillRect(fx + 23, fy + fh / 2 - 2, 14, 11);
  ctx.font = '400 24px "Open Sans"'; ctx.letterSpacing = '0px';
  ctx.fillStyle = '#202124';
  const tx = fx + 52, tyb = fy + fh / 2 + 8;
  ctx.fillText(B.url, tx, tyb);
  if (B.caret) { const w = ctx.measureText(B.url).width; ctx.fillRect(tx + w + 2, fy + 10, 2, fh - 20); }
  if (!B.url && !B.caret && B.load <= 0) { ctx.fillStyle = '#9AA0A6'; ctx.fillText('Pesquisar ou digitar endereço', tx, tyb); }
  // página
  const py = cy + ADDR_H;
  ctx.save();
  ctx.translate(cx, py);
  const s = cw / PAGE_W;
  ctx.scale(s, s);
  if (B.reveal > 0) drawApoiaPage(ctx, { reveal: B.reveal, hover: B.hover, press: B.press });
  else { ctx.fillStyle = '#FFFFFF'; ctx.fillRect(0, 0, PAGE_W, 1400); }
  ctx.restore();
  // barra de carregamento
  if (B.load > 0 && B.load < 1.2) {
    ctx.fillStyle = C.apoia;
    ctx.globalAlpha = clamp((1.2 - B.load) / 0.2);
    ctx.fillRect(cx, py, cw * E.outQuart(clamp(B.load)), 4);
    ctx.globalAlpha = 1;
  }
  ctx.restore();
  return { addr: { x: fx, y: fy, w: fw, h: fh, tx }, pageY: py, s, cx };
}

// cursor (seta) com clique: anel que expande
export function drawCursor(ctx, x, y, size, click = -1) {
  ctx.save();
  if (click >= 0 && click < 1) {
    ctx.strokeStyle = `rgba(255,255,255,${0.85 * (1 - click)})`; ctx.lineWidth = 3 * (1 - click) + 1;
    ctx.beginPath(); ctx.arc(x, y, size * (0.25 + 0.9 * E.outQuart(click)), 0, Math.PI * 2); ctx.stroke();
  }
  const s = size / 24 * (click >= 0 && click < 0.3 ? lerp(0.86, 1, click / 0.3) : 1);
  ctx.translate(x, y); ctx.scale(s, s);
  ctx.shadowColor = 'rgba(0,0,0,0.45)'; ctx.shadowBlur = 6; ctx.shadowOffsetX = 2; ctx.shadowOffsetY = 3;
  ctx.beginPath();
  ctx.moveTo(0, 0); ctx.lineTo(0, 22); ctx.lineTo(5.2, 17); ctx.lineTo(8.6, 25); ctx.lineTo(12, 23.6); ctx.lineTo(8.6, 15.8); ctx.lineTo(15.6, 15.8); ctx.closePath();
  ctx.fillStyle = '#FFFFFF'; ctx.fill();
  ctx.shadowColor = 'transparent';
  ctx.strokeStyle = '#000000'; ctx.lineWidth = 1.4; ctx.lineJoin = 'round'; ctx.stroke();
  ctx.restore();
}
