// TRECHO 2D FINAL — "Como é que 400 ordens fraudulentas entram no sistema de
// pagamentos brasileiro e são aceitas como verdadeiras? A resposta não está no PIX."
// (54.58s – fim). Grade de 400 ordens que surge em cascata, fica vermelha,
// voa para dentro do SPB, é validada (vira "verdadeira") e, por fim, a frase
// de fechamento com as letras assentando uma a uma (efeito do "FOI CONTABILIDADE").
import { W, H, PAL, FONTS, WORDS as Wd, fq } from '../core/config.js';
import { E, tw, clamp, lerp, env } from '../core/ease.js';
import { hash, fbm1 } from '../core/rand.js';
import { transformBox, drawLine, node, labelBox, withAlpha, shadowOn, shadowOff, drawBottomBrackets, underline } from '../core/draw.js';
import { decode, setFont, drawSegs, measure } from '../core/text.js';
import { makeCanvas } from '../core/three-utils.js';

export const OR_T = {
  start: 54.58,
  grid: Wd.n400 - 0.02,          // 54.92
  red: Wd.fraudulentas - 0.04,   // 56.00
  box: Wd.entram - 0.12,         // 56.62
  fly: Wd.entram + 0.04,         // 56.78
  title: Wd.sistema - 0.04,
  scan: Wd.aceitas - 0.05,       // 58.95
  ok: Wd.verdadeiras - 0.1,
  outro: Wd.a_resposta - 0.08,   // 60.54
};

const N = 20;
// Mesma grade na origem e no destino: a transferência é uma translação
// horizontal pura. Cada coluna funciona como um layer/precomp do After Effects
// com o MESMO keyframe de posição (easy ease forte), defasado 2 quadros da
// vizinha — nada de trajetórias ou atrasos aleatórios.
const SRC = { x: 300, y: 548, pitch: 28, cell: 20 };
const BOX = { x: 1520, y: 380, w: 720, h: 760 };
const DST = { x: 1604, y: 548, pitch: 28, cell: 20 };
const COL_DELAY = 2 / 24;   // stagger de 2 quadros por coluna
const MOVE = 12 / 24;       // cada coluna leva 12 quadros

const cells = [];
for (let r = 0; r < N; r++) {
  for (let c = 0; c < N; c++) {
    const i = r * N + c;
    cells.push({
      r, c, i,
      // cascata diagonal e onda radial regulares (stagger por índice / distância)
      appear: OR_T.grid + (r + c) * 0.0125,
      redAt: OR_T.red + Math.hypot(r - 9.5, c - 9.5) * 0.034,
      // a coluna mais próxima do SPB sai primeiro
      launch: OR_T.fly + (N - 1 - c) * COL_DELAY,
      dur: MOVE,
      sx: SRC.x + c * SRC.pitch, sy: SRC.y + r * SRC.pitch,
      dx: DST.x + c * DST.pitch, dy: DST.y + r * DST.pitch,
    });
  }
}

export function createOrders() {
  const diag = makeCanvas(W, H);
  const dctx = diag.getContext('2d');

  function drawDiagram(ctx, t, fi) {
    // ------------------------------------------------ bloco esquerdo
    const lab = decode('ORDENS DE PAGAMENTO', t, OR_T.grid - 0.25, { cps: 30, seed: 501, fi });
    setFont(ctx, FONTS.mono, 20, 500);
    drawSegs(ctx, [{ text: lab.text, color: '#6F7275' }], SRC.x, SRC.y - 174, { ls: 6 });
    // contador 000 -> 400 (acompanha a cascata)
    const shown = cells.reduce((n, c) => n + (fq(t) >= c.appear ? 1 : 0), 0);
    if (t >= OR_T.grid - 0.2) {
      ctx.save();
      shadowOn(ctx, { color: 'rgba(0,0,0,0.75)', blur: 4, x: 5, y: 6 });
      setFont(ctx, FONTS.big, 150);
      ctx.letterSpacing = '2px';
      ctx.fillStyle = PAL.white;
      ctx.fillText(String(shown).padStart(3, '0'), SRC.x - 4, SRC.y - 36);
      ctx.restore();
    }
    // "FRAUDULENTAS"
    labelBox(ctx, t, fi, { x: SRC.x + 282, y: SRC.y - 138, w: 270, h: 74, text: 'FRAUDULENTAS', t0: OR_T.red + 0.06, size: 24, ls: 4, seed: 502 });

    // grade de origem
    for (const c of cells) {
      if (t < c.appear) continue;
      const a = tw(t, c.appear, c.appear + 0.14, E.outQuart);
      const red = tw(t, c.redAt, c.redAt + 0.1, E.linear);
      const flown = t >= c.launch;
      const s = SRC.cell * (0.5 + 0.5 * a);
      const x = c.sx + (SRC.cell - s) / 2, y = c.sy + (SRC.cell - s) / 2;
      ctx.save();
      if (flown) {
        // vaga vazia que fica para trás
        ctx.globalAlpha *= 0.55;
        ctx.strokeStyle = '#34373A'; ctx.lineWidth = 1.5;
        ctx.strokeRect(c.sx + 0.75, c.sy + 0.75, SRC.cell - 1.5, SRC.cell - 1.5);
      } else {
        ctx.globalAlpha *= a;
        ctx.fillStyle = red > 0 ? `rgba(175,58,58,${0.25 + 0.75 * red})` : 'rgba(110,114,118,0.18)';
        ctx.fillRect(x, y, s, s);
        ctx.strokeStyle = red > 0.5 ? '#D63E4B' : '#6A6E72'; ctx.lineWidth = 1.5;
        ctx.strokeRect(x + 0.75, y + 0.75, s - 1.5, s - 1.5);
      }
      ctx.restore();
    }

    // ------------------------------------------------ SPB
    const bp = tw(t, OR_T.box, OR_T.box + 0.55, E.outQuart);
    if (bp > 0) {
      const fx = BOX.x - 44, fy = BOX.y - 44, fw = BOX.w + 88, fh = BOX.h + 88;
      transformBox(ctx, fx, fy, fw, fh, bp, { color: PAL.frame, hs: 13 });
      // rótulo "SPB" com brilho (como o "COM RESERVA")
      const sd = decode('SPB', t, OR_T.box + 0.15, { cps: 20, seed: 510, fi });
      if (sd.visible) {
        setFont(ctx, '"FreeMonoBold"', 34);
        drawSegs(ctx, [{ text: sd.text, color: '#E9EBEB' }], BOX.x + BOX.w / 2, fy - 22, { ls: 6, align: 'center', glow: { color: '#FFFFFF', blur: 16, alpha: 0.55 } });
      }
      // título
      const ta = tw(t, OR_T.box + 0.2, OR_T.box + 0.45, E.linear);
      if (ta > 0) {
        withAlpha(ctx, ta, () => {
          shadowOn(ctx, { color: 'rgba(0,0,0,0.55)', blur: 10, x: 4, y: 6 });
          ctx.fillStyle = PAL.boxFill; ctx.fillRect(BOX.x, BOX.y, BOX.w, 100);
          ctx.fillRect(BOX.x, BOX.y + 128, BOX.w, BOX.h - 128);
          shadowOff(ctx);
          ctx.strokeStyle = '#6F7377'; ctx.lineWidth = 2;
          ctx.strokeRect(BOX.x + 1, BOX.y + 1, BOX.w - 2, 98);
          ctx.strokeRect(BOX.x + 1, BOX.y + 129, BOX.w - 2, BOX.h - 130);
          // conector entre título e painel (brilho teal, como na referência)
          const cg = ctx.createLinearGradient(BOX.x + BOX.w / 2 - 14, 0, BOX.x + BOX.w / 2 + 14, 0);
          cg.addColorStop(0, 'rgba(78,111,104,0)'); cg.addColorStop(0.5, 'rgba(143,201,186,0.85)'); cg.addColorStop(1, 'rgba(78,111,104,0)');
          ctx.fillStyle = cg; ctx.fillRect(BOX.x + BOX.w / 2 - 14, BOX.y + 100, 28, 28);
        });
        const t1 = decode('SISTEMA DE PAGAMENTOS', t, OR_T.title, { cps: 28, seed: 511, fi });
        const t2 = decode('BRASILEIRO', t, Wd.brasileiro - 0.05, { cps: 24, seed: 512, fi });
        setFont(ctx, FONTS.type, 37);
        drawSegs(ctx, [{ text: t1.text, color: '#E2E4E4' }], BOX.x + BOX.w / 2, BOX.y + 45, { ls: 3, align: 'center' });
        drawSegs(ctx, [{ text: t2.text, color: '#E2E4E4' }], BOX.x + BOX.w / 2, BOX.y + 86, { ls: 3, align: 'center' });
        // vagas do painel
        ctx.save(); ctx.globalAlpha *= ta * 0.6;
        ctx.strokeStyle = '#2C2F33'; ctx.lineWidth = 1.2;
        for (let r = 0; r < N; r++) for (let c = 0; c < N; c++) ctx.strokeRect(DST.x + c * DST.pitch + 0.6, DST.y + r * DST.pitch + 0.6, DST.cell - 1.2, DST.cell - 1.2);
        ctx.restore();
      }
    }

    // ------------------------------------------------ ordens voando + validação
    const scanY = lerp(DST.y - 16, DST.y + N * DST.pitch + 12, tw(t, OR_T.scan, OR_T.scan + 0.75, E.inOut));
    const scanning = t >= OR_T.scan;
    for (const c of cells) {
      if (t < c.launch) continue;
      const p = tw(t, c.launch, c.launch + c.dur, E.inOutStrong);
      const x = lerp(c.sx, c.dx, p), y = c.sy;
      const sc = SRC.cell;
      const ok = scanning && c.dy + DST.cell / 2 < scanY && p >= 1;
      ctx.save();
      if (ok) {
        const k = clamp((scanY - c.dy - DST.cell / 2) / 40);
        ctx.fillStyle = `rgb(${Math.round(lerp(175, 214, k))},${Math.round(lerp(58, 219, k))},${Math.round(lerp(58, 219, k))})`;
        ctx.fillRect(x, y, sc, sc);
        if (k > 0.6) {
          ctx.strokeStyle = '#1B1E21'; ctx.lineWidth = 2.2;
          ctx.beginPath(); ctx.moveTo(x + sc * 0.24, y + sc * 0.52); ctx.lineTo(x + sc * 0.43, y + sc * 0.7); ctx.lineTo(x + sc * 0.78, y + sc * 0.3); ctx.stroke();
        }
      } else {
        ctx.fillStyle = '#AF3A3A';
        ctx.fillRect(x, y, sc, sc);
        // contorno só quando parada (em voo vira rastro contínuo no motion blur)
        if (p >= 1 || p <= 0) { ctx.strokeStyle = '#D63E4B'; ctx.lineWidth = 1.5; ctx.strokeRect(x + 0.75, y + 0.75, sc - 1.5, sc - 1.5); }
      }
      ctx.restore();
    }
    if (scanning && t < OR_T.scan + 0.85) {
      const a = env(t, OR_T.scan, OR_T.scan + 0.05, OR_T.scan + 0.7, OR_T.scan + 0.85, E.linear, E.linear);
      ctx.save(); ctx.globalAlpha *= a;
      ctx.shadowColor = PAL.tealBright; ctx.shadowBlur = 18;
      ctx.fillStyle = PAL.tealBright;
      ctx.fillRect(BOX.x + 30, scanY, BOX.w - 60, 3);
      ctx.restore();
    }
    // status
    if (t >= OR_T.ok) {
      const pulse = env(t, OR_T.ok + 0.1, OR_T.ok + 0.16, OR_T.ok + 0.3, OR_T.ok + 0.7, E.linear, E.inOut);
      if (pulse > 0) {
        ctx.save(); ctx.globalAlpha *= pulse;
        ctx.strokeStyle = PAL.tealBright; ctx.lineWidth = 3; ctx.shadowColor = PAL.tealBright; ctx.shadowBlur = 20;
        ctx.strokeRect(BOX.x + 1, BOX.y + 129, BOX.w - 2, BOX.h - 130);
        ctx.restore();
      }
      const sd = decode('ACEITAS COMO VERDADEIRAS', t, OR_T.ok, { cps: 34, seed: 520, fi });
      setFont(ctx, FONTS.mono, 26, 700);
      const sx = BOX.x + BOX.w / 2;
      drawSegs(ctx, [{ text: '✓ ', color: PAL.tealBright }, { text: sd.text, color: PAL.tealBright }], sx, BOX.y + BOX.h + 100, { ls: 5, align: 'center', glow: { color: PAL.tealBright, blur: 14, alpha: 0.45 }, shadow: { color: 'rgba(0,0,0,0.6)', blur: 6, x: 2, y: 3 } });
      const cnt = decode('400 / 400', t, OR_T.ok + 0.2, { cps: 30, seed: 521, fi });
      setFont(ctx, FONTS.mono, 20, 500);
      drawSegs(ctx, [{ text: cnt.text, color: '#6F7275' }], BOX.x + BOX.w, BOX.y + BOX.h - 18, { ls: 5, align: 'right' });
    }
  }

  // Frase final com as letras "assentando" (como o "FOI CONTABILIDADE" da referência),
  // cada palavra no instante em que é falada.
  const PHRASE = [
    { w: 'A', t: Wd.a_resposta - 0.02, d: 0.06 },
    { w: 'RESPOSTA', t: Wd.a_resposta + 0.08, d: 0.34 },
    { w: 'NÃO', t: Wd.nao, d: 0.2, red: true },
    { w: 'ESTÁ', t: Wd.esta, d: 0.22 },
    { w: 'NO', t: Wd.no, d: 0.1 },
    { w: 'PIX.', t: Wd.pix, d: 0.26 },
  ];
  const FS = 84, LS = 16;
  function drawOutro(ctx, t, fi) {
    if (t < OR_T.outro) return;
    setFont(ctx, FONTS.type, FS);
    ctx.letterSpacing = `${LS}px`;
    const adv = ctx.measureText('M').width; // mono: avanço constante (inclui letter-spacing)
    const total = PHRASE.reduce((n, p) => n + p.w.length, 0) + PHRASE.length - 1;
    const push = 1 + 0.018 * tw(t, Wd.pix, 63.625, E.linear);
    const y0 = 760;
    ctx.save();
    ctx.translate(W / 2, y0); ctx.scale(push, push); ctx.translate(-W / 2, -y0);
    let k = 0;
    const glyphs = [];
    PHRASE.forEach((p, wi) => {
      for (let i = 0; i < p.w.length; i++) {
        glyphs.push({ ch: p.w[i], x: W / 2 - (total * adv - LS) / 2 + (k + i) * adv, t: p.t + (p.d * i) / Math.max(1, p.w.length - 1), red: p.red, seed: (wi + 1) * 31 + i });
      }
      k += p.w.length + 1;
    });
    let ulEnd = null;
    for (const g of glyphs) {
      if (t < g.t) continue;
      const a = tw(t, g.t, g.t + 0.2, E.outBack);
      const rot = (hash(g.seed, 1) - 0.5) * 0.9 * (1 - a);
      const s = lerp(0.42, 1, clamp(a));
      const dy = -18 * (1 - clamp(a)) + (hash(g.seed, 2) - 0.5) * 6 * (1 - clamp(a));
      ctx.save();
      ctx.globalAlpha *= clamp(tw(t, g.t, g.t + 0.06, E.linear));
      ctx.translate(g.x + adv / 2, y0 + dy - FS * 0.3);
      ctx.rotate(rot); ctx.scale(s, s);
      ctx.translate(-adv / 2, FS * 0.3);
      shadowOn(ctx, { color: 'rgba(0,0,0,0.6)', blur: 6, x: 3, y: 4 });
      ctx.letterSpacing = '0px';
      ctx.fillStyle = g.red ? PAL.red : PAL.white;
      ctx.fillText(g.ch, 0, 0);
      if (g.red) { ctx.shadowColor = PAL.red; ctx.shadowBlur = 14; ctx.shadowOffsetX = 0; ctx.shadowOffsetY = 0; ctx.globalAlpha *= 0.4; ctx.fillText(g.ch, 0, 0); }
      ctx.restore();
      ulEnd = g.x + adv - LS;
    }
    // sublinhado dourado acompanhando a digitação
    if (ulEnd !== null) {
      const ux0 = glyphs[0].x - 4;
      ctx.fillStyle = PAL.gold;
      ctx.fillRect(ux0, y0 + 26, ulEnd - ux0 + 6, 3);
    }
    ctx.restore();
  }

  function ui(ctx, t, fi) {
    if (t < OR_T.start) return;
    drawBottomBrackets(ctx, tw(t, OR_T.start + 0.1, OR_T.start + 0.4, E.linear));
    // o diagrama recua (perde foco e brilho) quando entra a frase final
    const back = tw(t, OR_T.outro - 0.02, OR_T.outro + 0.5, E.inOut);
    const drift = 1 + 0.02 * tw(t, OR_T.start, 63.6, E.linear);
    if (back <= 0.001) {
      ctx.save();
      ctx.translate(W / 2, H / 2); ctx.scale(drift, drift); ctx.translate(-W / 2, -H / 2);
      drawDiagram(ctx, t, fi);
      ctx.restore();
    } else {
      dctx.setTransform(1, 0, 0, 1, 0, 0);
      dctx.clearRect(0, 0, W, H);
      drawDiagram(dctx, t, fi);
      ctx.save();
      const sc = drift * (1 - 0.05 * back);
      ctx.translate(W / 2, H / 2); ctx.scale(sc, sc); ctx.translate(-W / 2, -H / 2);
      ctx.globalAlpha *= 1 - 0.8 * back;
      ctx.filter = `blur(${(7 * back).toFixed(2)}px)`;
      ctx.drawImage(diag, 0, 0);
      ctx.filter = 'none';
      ctx.restore();
    }
    drawOutro(ctx, t, fi);
  }

  return { ui };
}
