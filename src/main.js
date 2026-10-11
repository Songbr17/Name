// Ponto de entrada da página de render. Expõe window.renderFrame(n), chamado
// pelo scripts/render.mjs para cada quadro (n = índice do quadro no vídeo).
import * as THREE from 'three';
import { W, H, FPS } from './core/config.js';
import { Compositor } from './core/compositor.js';
import { createTimeline } from './timeline.js';

const SHUTTER = 0.5; // obturador de 180°

async function loadFonts() {
  const specs = [
    '400 30px "JBMono"', '500 30px "JBMono"', '700 30px "JBMono"', '800 30px "JBMono"',
    '30px "FreeMono"', '30px "FreeMonoOb"', '30px "FreeMonoBold"', '30px "Anton"',
  ];
  await Promise.all(specs.map((s) => document.fonts.load(s, 'AÃÇÕÉÍ0123456789R$')));
  await document.fonts.ready;
}

function loadImage(src) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error('falha ao carregar ' + src));
    img.src = src;
  });
}

async function boot() {
  await loadFonts();
  const renderer = new THREE.WebGLRenderer({ antialias: false, preserveDrawingBuffer: true, alpha: false, powerPreference: 'high-performance' });
  renderer.setPixelRatio(1);
  renderer.setSize(W, H);
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.VSMShadowMap;
  renderer.autoClear = false;
  document.body.appendChild(renderer.domElement);

  const comp = new Compositor(renderer, W, H);
  const tl = await createTimeline({ renderer });
  const ctx = comp.uiCanvas.getContext('2d');

  window.renderFrame = async (fi, opts = {}) => {
    const t = fi / FPS;
    const plateSrc = opts.plate || `/out/plate/${String(fi).padStart(4, '0')}.jpg`;
    comp.setPlate(await loadImage(plateSrc));
    const N = opts.samples || tl.samples(t);
    const gl = renderer.getContext();
    const prof = {};
    const mark = (k, t0) => { if (opts.profile) { gl.finish(); prof[k] = (prof[k] || 0) + (performance.now() - t0); } return performance.now(); };
    let tm = performance.now();
    comp.beginFrame();
    for (let s = 0; s < N; s++) {
      const ts = N === 1 ? t : t + ((s + 0.5) / N - 0.5) * SHUTTER / FPS;
      const st = tl.update(ts, fi);
      tm = mark('update', tm);
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.clearRect(0, 0, W, H);
      tl.drawUI(ctx, ts, fi, st);
      tm = mark('ui', tm);
      comp.render3D(st.scene, st.camera, st.extra);
      tm = mark('3d', tm);
      const blur = st.blur || 0;
      if (blur > 0.3) comp.blur3D(blur);
      comp.composite({ ...st.comp, blurMix: blur > 0.3 ? Math.min(1, blur / 3) : 0 }, 1 / N);
      tm = mark('comp', tm);
    }
    comp.finish(tl.frameParams(t, fi));
    mark('final', tm);
    if (opts.profile) return JSON.stringify(prof);
    return N;
  };
  window.ready = true;
}

boot().catch((e) => { console.error(e); window.bootError = String(e && e.stack || e); });
