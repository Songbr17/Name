// Linha do tempo da "Comp - Camada Invisível" (0 – 41,856 s).
//   0,0 –  9,8  janelas com matérias reais (2D)
//   9,8 – 20,4  trecho 2D: assinar em nome das instituições, certificados e chaves
//  20,4 – fim   3D: a sala dos carimbos e a BMP (Banking as a Service)
import { drawHud } from '../../core/draw.js';
import { plateFor } from './plate.js';
import { createWindows, WIN_T } from './windows.js';
import { createDigital, DIG_T } from './digital.js';
import { createWorld, WT } from './world.js';

const HUD1 = { t0: DIG_T.start, title: 'A CAMADA INVISÍVEL', subtitle: 'C&M SOFTWARE', active: 0, out: WT.crane - 0.06, outDur: 0.06 };
const HUD2 = { t0: WT.crane, title: 'O MAIOR CLIENTE', subtitle: 'BMP MONEY PLUS', active: 1 };

// rajada de glitch (fatias deslocadas + RGB + blocos escuros), como nas
// transições da referência
function burst(fp, t, t0, t1) {
  const g = t - t0;
  if (g < 0 || t >= t1 + 0.05) return;
  const f = Math.floor(g * 24);
  const b = [0.5, 0.65, 0, 0.85, 0.95][f] ?? 0.9;
  fp.glitch = b; fp.rgb = b * 0.006; fp.ca = b * 0.004;
  fp.dark = f >= 3 ? Math.min(1, 0.35 + (f - 3) * 0.3) : 0;
  fp.rows = 14 + (f % 3) * 5;
}

export async function createTimeline({ renderer }) {
  const win = createWindows();
  const dig = createDigital();
  const world = createWorld(renderer);

  function samples(t) {
    if (t < WIN_T.end) return win.samples(t);
    if (t < DIG_T.end) return dig.samples(t);
    return world.samples(t);
  }

  function update(t, fi) {
    if (t < WIN_T.end) return { scene: null, camera: null, set: 'win', comp: {} };
    if (t < DIG_T.end) return { scene: null, camera: null, set: 'dig', comp: {} };
    const st = world.update(t, fi);
    return { scene: world.scene, camera: world.camera, set: 'world', ...st };
  }

  function drawUI(ctx, t, fi, st) {
    if (st.set === 'win') win.ui(ctx, t, fi);
    if (st.set === 'dig') dig.ui(ctx, t, fi);
    if (st.set === 'world') world.ui(ctx, t, fi);
    if (t >= HUD1.t0) drawHud(ctx, t, fi, HUD1);
    if (t >= HUD2.t0) drawHud(ctx, t, fi, HUD2);
  }

  function frameParams(t, fi) {
    const fp = { seed: (fi * 7.13) % 97, bloom: 0.32, grain: 0.011 };
    if (t < WIN_T.end) fp.bloom = 0.1;
    burst(fp, t, WIN_T.glitch, WIN_T.end);
    burst(fp, t, DIG_T.glitch, DIG_T.end);
    return fp;
  }

  return { samples, update, drawUI, frameParams, plateFor, jitterAA: true };
}
