// Ponto de entrada da página de render. Expõe window.renderFrame(n), chamado
// pelo scripts/render.mjs para cada quadro (n = índice do quadro no vídeo).
import * as THREE from 'three';
import { W, H, FPS } from './core/config.js';
import { Compositor } from './core/compositor.js';

// Qual composição renderizar: ?comp=principal (0:39 -> fim), ?comp=camada ou ?comp=cta
const COMP = new URLSearchParams(location.search).get('comp') || 'principal';

const SHUTTER = 0.5; // obturador de 180°

function halton(i, b) {
  let f = 1, r = 0;
  while (i > 0) { f /= b; r += f * (i % b); i = Math.floor(i / b); }
  return r;
}

async function loadFonts() {
  const specs = [
    '400 30px "JBMono"', '500 30px "JBMono"', '700 30px "JBMono"', '800 30px "JBMono"',
    '30px "FreeMono"', '30px "FreeMonoOb"', '30px "FreeMonoBold"', '30px "Anton"',
  ];
  if (COMP === 'camada' || COMP === 'cta') {
    specs.push(
      '400 30px "Inter"', '700 30px "Inter"', '800 30px "Inter"', '900 30px "Inter"',
      '400 30px "Roboto"', '500 30px "Roboto"', '700 30px "Roboto"',
      '700 30px "Merriweather"', '900 30px "Merriweather"',
      '700 30px "Montserrat"', '800 30px "Montserrat"',
      '400 30px "Open Sans"', '600 30px "Open Sans"',
    );
  }
  if (COMP === 'cta') {
    specs.push('400 30px "PT Sans"', '700 30px "PT Sans"', '900 30px "Nunito"', '700 30px "Kalam"');
  }
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
  const MODS = { camada: './comps/camada/timeline.js', cta: './comps/cta/timeline.js', cena3d: './comps/cena3d/timeline.js' };
  const mod = await import(MODS[COMP] || './timeline.js');
  const tl = await mod.createTimeline({ renderer });
  const ctx = comp.uiCanvas.getContext('2d');
  // diagnóstico: quantos sub-quadros de motion blur cada quadro usa
  window.samplesFor = (fi) => tl.samples(fi / FPS);
  window.timeline = tl;

  window.renderFrame = async (fi, opts = {}) => {
    const t = fi / FPS;
    const plateIdx = tl.plateFor ? tl.plateFor(fi) : fi;
    const plateSrc = opts.plate || `/out/plate/${String(plateIdx).padStart(4, '0')}.jpg`;
    comp.setPlate(await loadImage(plateSrc));
    const N = opts.samples || tl.samples(t);
    const gl = renderer.getContext();
    const prof = {};
    const mark = (k, t0) => { if (opts.profile) { gl.finish(); prof[k] = (prof[k] || 0) + (performance.now() - t0); } return performance.now(); };
    let tm = performance.now();
    // antisserrilhado por acumulação: com muitos sub-quadros, cada um desloca a
    // câmera por uma fração de pixel (Halton 2,3) e o MSAA é desligado
    const jitterAA = tl.jitterAA && N >= 6;
    // composições só 2D: a camada 3D fica vazia (sem MSAA e limpa uma vez só)
    comp.setMSAA(jitterAA || tl.only2D ? 0 : 4);
    comp.beginFrame();
    for (let s = 0; s < N; s++) {
      const ts = N === 1 ? t : t + ((s + 0.5) / N - 0.5) * SHUTTER / FPS;
      const st = tl.update(ts, fi);
      tm = mark('update', tm);
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.clearRect(0, 0, W, H);
      tl.drawUI(ctx, ts, fi, st);
      tm = mark('ui', tm);
      if (jitterAA && st.camera) st.camera.setViewOffset(W, H, halton(s + 1, 2) - 0.5, halton(s + 1, 3) - 0.5, W, H);
      if (st.scene || !tl.only2D || s === 0) comp.render3D(st.scene, st.camera, st.extra);
      if (jitterAA && st.camera) st.camera.clearViewOffset();
      tm = mark('3d', tm);
      const blur = st.blur || 0;
      if (blur > 0.3) comp.blur3D(blur);
      comp.composite({ ...st.comp, blurMix: blur > 0.3 ? Math.min(1, blur / 3) : 0 }, 1 / N);
      tm = mark('comp', tm);
    }
    comp.finish(tl.frameParams(t, fi));
    // força a GPU (SwiftShader) a terminar aqui, e não durante o screenshot
    const px = new Uint8Array(4);
    gl.readPixels(0, 0, 1, 1, gl.RGBA, gl.UNSIGNED_BYTE, px);
    mark('final', tm);
    if (opts.profile) return JSON.stringify(prof);
    return N;
  };
  window.ready = true;
}

boot().catch((e) => { console.error(e); window.bootError = String(e && e.stack || e); });
