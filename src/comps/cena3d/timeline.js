// Linha do tempo da "Cena 3D — a assinatura" (0 – 11,6 s), sobre o mesmo fundo.
import { plateFor } from '../camada/plate.js';
import { drawHud } from '../../core/draw.js';
import { createScene } from './world.js';

export async function createTimeline({ renderer }) {
  const world = createScene(renderer);

  function update(t, fi) {
    const st = world.update(t, fi);
    return { scene: world.scene, camera: world.camera, ...st };
  }

  function drawUI(ctx, t, fi) {
    world.ui(ctx, t, fi);
    // HUD do episódio já montado desde o 1º quadro (a emenda com a comp anterior fica idêntica)
    drawHud(ctx, t, fi, { t0: -5, title: 'A CAMADA INVISÍVEL', subtitle: 'O ROUBO', active: 1 });
  }

  function frameParams(t, fi) {
    const fp = { seed: (fi * 7.13) % 97, bloom: 0.32, grain: 0.011 };
    // entrada em glitch (3 quadros), como nas transições da referência
    if (fi < 3) {
      const b = [0.9, 0.55, 0.25][fi];
      fp.glitch = b; fp.rgb = b * 0.006; fp.ca = b * 0.004;
      fp.dark = [0.55, 0.15, 0][fi]; fp.rows = 14 + fi * 5;
    }
    return fp;
  }

  return { samples: world.samples, update, drawUI, frameParams, plateFor, jitterAA: true };
}
