// Linha do tempo do "Epílogo — O nome voltou" (0 – 36,6 s), toda em 2D sobre o mesmo fundo.
import { plateFor } from '../camada/plate.js';
import { createBoard } from './board.js';

const load = (src) => new Promise((resolve, reject) => {
  const img = new Image();
  img.onload = () => resolve(img);
  img.onerror = () => reject(new Error('falha ao carregar ' + src));
  img.src = src;
});

export async function createTimeline() {
  const [print, logo] = await Promise.all([
    load('/assets/epilogo/print_scattered_lapsus_hunters.png'),
    load('/assets/marca/FLUX_logo.png'),
  ]);
  const board = createBoard({ print, logo });

  function update() {
    return { scene: null, camera: null, comp: {} };
  }

  function drawUI(ctx, t, fi) {
    board.ui(ctx, t, fi);
  }

  function frameParams(t, fi) {
    const fp = { seed: (fi * 7.13) % 97, bloom: 0.18, grain: 0.011 };
    // entrada em glitch (3 quadros), como nas transições da referência
    if (fi < 3) {
      const b = [0.9, 0.55, 0.25][fi];
      fp.glitch = b; fp.rgb = b * 0.006; fp.ca = b * 0.004;
      fp.dark = [0.55, 0.15, 0][fi]; fp.rows = 14 + fi * 5;
    }
    return fp;
  }

  return { samples: board.samples, update, drawUI, frameParams, plateFor, camAt: board.camAt, only2D: true };
}
