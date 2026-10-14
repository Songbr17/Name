// Linha do tempo do CTA (0 – 33,57 s), tudo em 2D sobre o mesmo fundo.
import { plateFor } from '../camada/plate.js';
import { createBoard } from './board.js';

const OUT = { glitch: 33.40, end: 33.60 };

export async function createTimeline() {
  const board = createBoard();

  function update() {
    return { scene: null, camera: null, comp: {} };
  }

  function drawUI(ctx, t, fi) {
    board.ui(ctx, t, fi);
  }

  function frameParams(t, fi) {
    const fp = { seed: (fi * 7.13) % 97, bloom: 0.26, grain: 0.011 };
    // a página branca do navegador não pode "estourar" de brilho
    if (t > 19.9 && t < 30.3) fp.bloom = 0.12;
    // saída em glitch (volta para a história)
    const g = t - OUT.glitch;
    if (g >= 0) {
      const f = Math.floor(g * 24);
      const b = [0.45, 0.7, 0.9, 0.95, 1][f] ?? 1;
      fp.glitch = b; fp.rgb = b * 0.006; fp.ca = b * 0.004;
      fp.dark = f >= 2 ? Math.min(1, 0.4 + (f - 2) * 0.3) : 0;
      fp.rows = 14 + (f % 3) * 5;
    }
    return fp;
  }

  return { samples: board.samples, update, drawUI, frameParams, plateFor, camAt: board.camAt };
}
