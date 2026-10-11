// Linha do tempo principal (tempos absolutos do vídeo).
import { drawHud } from './core/draw.js';
import { createDoorSet, DOOR_T } from './scenes/door.js';
import { createEvidenceSet, EV_T } from './scenes/evidence.js';
import { createOrders, OR_T } from './scenes/orders.js';

// Saída em glitch da cena 3D (mesma "assinatura" das transições da referência:
// rajadas de fatias deslocadas + separação RGB, quadros limpos no meio,
// blocos escuros e o fundo vazio no fim).
const GL = { a: EV_T.end, cut: OR_T.start - 0.04 };

export async function createTimeline({ renderer }) {
  const door = createDoorSet(renderer);
  const ev = createEvidenceSet(renderer);
  const orders = createOrders();

  const HUD_OPTS = { t0: 39.94, title: 'QUEM ABRIU A PORTA?', subtitle: 'DO LADO DE DENTRO', active: 2, out: GL.cut, outDur: 0.01 };

  function samples(t) {
    if (t < 40.3) return 2;
    if (t < 41.35) return 5;
    if (t < DOOR_T.push0) return 3;
    if (t < DOOR_T.cut - 0.17) return 10;
    if (t < DOOR_T.cut) return 20; // final da travessia: câmera muito rápida
    if (t < EV_T.arrive) return 6;
    if (t < EV_T.tilt) return 2;
    if (t >= EV_T.drop + 0.12 && t < EV_T.drop + 0.5) return 24; // queda rápida do maço: rastro suave
    if (t < EV_T.tilt + 1.0) return 8;
    if (t < EV_T.pull) return 2;
    if (t < EV_T.pull + 1.75) return 7;
    if (t < GL.a) return 2;
    if (t < OR_T.start) return 1;
    if (t < OR_T.grid + 0.7) return 3;
    if (t < OR_T.fly) return 2;
    if (t < OR_T.fly + 2.1) return 24; // 400 ordens em alta velocidade: rastro contínuo
    if (t < OR_T.outro) return 3;
    if (t < 62.6) return 3;
    return 2;
  }

  function update(t, fi) {
    if (t < DOOR_T.cut) {
      const st = door.update(t);
      return { scene: door.scene, camera: door.camera, set: 'door', ...st };
    }
    if (t < GL.cut) {
      const st = ev.update(Math.min(t, EV_T.end + 0.3), fi);
      return { scene: ev.scene, camera: ev.camera, set: 'ev', ...st };
    }
    return { scene: null, camera: null, set: 'orders', comp: {} };
  }

  function drawUI(ctx, t, fi, st) {
    if (st.set === 'door') door.ui(ctx, t, fi);
    if (st.set === 'ev') ev.ui(ctx, t, fi);
    if (st.set === 'orders') orders.ui(ctx, t, fi);
    drawHud(ctx, t, fi, HUD_OPTS);
  }

  function frameParams(t, fi) {
    const fp = { seed: (fi * 7.13) % 97, bloom: 0.32, grain: 0.011 };
    // pequeno glitch no corte da porta
    if (t > DOOR_T.cut - 0.09 && t < DOOR_T.cut + 0.05) { fp.glitch = 0.3; fp.rgb = 0.003; fp.ca = 0.006; }
    // saída em glitch da cena 3D
    const g = t - GL.a;
    if (g >= 0 && t < GL.cut) {
      const f = Math.floor(g * 24);
      const burst = [0.45, 0.6, 0, 0, 0.8, 0.95, 0.9][f] ?? 0.9;
      fp.glitch = burst; fp.rgb = burst * 0.006; fp.ca = burst * 0.004;
      fp.dark = f >= 4 ? Math.min(1, 0.35 + (f - 4) * 0.3) : 0;
      fp.rows = 14 + (f % 3) * 5;
    }
    if (t >= GL.cut && t < GL.cut + 0.05) { fp.dark = 0.6; fp.rows = 16; }
    return fp;
  }

  return { samples, update, drawUI, frameParams };
}
