// CENA 3D 2 — "foi um desenvolvedor back-end de 48 anos ... 5 mil reais por 813 milhões"
// (42.125s – 54.3s)
// Crachá pendurado no cordão (balanço e torção amortecidos), ficha que se
// preenche junto com a narração, nome revelado sob a tarja, maço de R$ 5 mil
// caindo com gravidade real e a pilha gigante de R$ 813 milhões revelada
// quando a câmera recua e as luzes acendem.
import * as THREE from 'three';
import { W, H, PAL, FONTS, WORDS as Wd, fq } from '../core/config.js';
import { E, tw, kf, spring, clamp, lerp, env, dampedSine } from '../core/ease.js';
import { hash, fbm1, noise1 } from '../core/rand.js';
import { studioEnv, project, aimCamera, canvasTexture, makeCanvas, additive, contactShadow } from '../core/three-utils.js';
import { drawLine, node, transformBox, withAlpha, underline, shadowOn, shadowOff } from '../core/draw.js';
import { decode, undecode, setFont, drawSegs, measure } from '../core/text.js';
import {
  BADGE_PX, drawBadgeFront, drawBadgeBack, drawNoteTop, drawPaperEdges, drawBandTop, drawBandSide, drawBlockFace,
} from './evidence-textures.js';

export const EV_T = {
  start: 42.125,
  arrive: 42.95,
  nameHint: Wd.o_nome,          // 46.86
  nameReveal: Wd.joao - 0.06,   // 47.56
  uiOut: 48.90,
  tilt: 49.00,
  drop: 48.86,
  cashUI: 49.60,
  cashCount: Wd.cinco - 0.02,
  pull: Wd.por - 0.04,          // 52.06
  lights: Wd.n813,              // 52.38
  bigCount: Wd.n813 + 0.02,
  end: 54.30,
  uiEnd: 54.56,                 // os rótulos vivem até o fim do glitch de saída
};

const CARD_W = 0.054, CARD_H = 0.0856, CARD_T = 0.00076;
const PIVOT_Y = 2.30, STRAP_L = 1.64;
const CARD_CY = PIVOT_Y - STRAP_L - 0.0405; // ~0.6195
const BUNDLE = { w: 0.156, h: 0.0055, d: 0.070 };
const LAND = new THREE.Vector3(0.052, 0, 0.088);
const BLOCK = { s: 2.14, x: 1.62, z: -1.95 };

function roundedRect(w, h, r) {
  const s = new THREE.Shape();
  const x = -w / 2, y = -h / 2;
  s.moveTo(x + r, y); s.lineTo(x + w - r, y); s.quadraticCurveTo(x + w, y, x + w, y + r);
  s.lineTo(x + w, y + h - r); s.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  s.lineTo(x + r, y + h); s.quadraticCurveTo(x, y + h, x, y + h - r);
  s.lineTo(x, y + r); s.quadraticCurveTo(x, y, x + r, y);
  return s;
}

function slotPath() {
  const p = new THREE.Path();
  const w = 0.0135, h = 0.0032, cy = CARD_H / 2 - 0.0062, r = h / 2;
  p.moveTo(-w / 2 + r, cy - h / 2); p.lineTo(w / 2 - r, cy - h / 2);
  p.absarc(w / 2 - r, cy, r, -Math.PI / 2, Math.PI / 2, false);
  p.lineTo(-w / 2 + r, cy + h / 2);
  p.absarc(-w / 2 + r, cy, r, Math.PI / 2, Math.PI * 1.5, false);
  return p;
}

function normalizeUV(geo, w, h) {
  const pos = geo.attributes.position, uv = geo.attributes.uv;
  for (let i = 0; i < pos.count; i++) uv.setXY(i, (pos.getX(i) + w / 2) / w, (pos.getY(i) + h / 2) / h);
  uv.needsUpdate = true;
}

function strapTexture() {
  const c = makeCanvas(64, 2048);
  const g = c.getContext('2d');
  g.fillStyle = '#1A1B1D'; g.fillRect(0, 0, 64, 2048);
  for (let y = 0; y < 2048; y += 3) { g.fillStyle = `rgba(255,255,255,${0.02 + (y % 9 === 0 ? 0.025 : 0)})`; g.fillRect(0, y, 64, 1); }
  g.fillStyle = '#6A1520'; g.fillRect(6, 0, 4, 2048); g.fillRect(54, 0, 4, 2048);
  return canvasTexture(c);
}

function floorPoolMaterial() {
  return additive(new THREE.ShaderMaterial({
    uniforms: { uPos: { value: new THREE.Vector3() }, uDir: { value: new THREE.Vector3(0, -1, 0) }, uCos: { value: new THREE.Vector2(0.80, 0.93) }, uColor: { value: new THREE.Color(0.9, 0.95, 1.0) }, uPower: { value: 0 } },
    vertexShader: `varying vec3 vW; void main(){ vec4 w = modelMatrix * vec4(position,1.0); vW = w.xyz; gl_Position = projectionMatrix * viewMatrix * w; }`,
    fragmentShader: /* glsl */`
      uniform vec3 uPos, uDir, uColor; uniform vec2 uCos; uniform float uPower; varying vec3 vW;
      void main(){
        vec3 d = vW - uPos; float r2 = dot(d, d); vec3 n = d / sqrt(r2);
        float c = dot(n, normalize(uDir));
        float cone = smoothstep(uCos.x, uCos.y, c);
        float cosF = max(0.0, -n.y);
        gl_FragColor = vec4(uColor * uPower * cone * cosF / r2, 0.0);
      }`,
  }));
}

export function createEvidenceSet(renderer) {
  const scene = new THREE.Scene();
  scene.environment = studioEnv(renderer);
  scene.environmentIntensity = 0.28;
  const camera = new THREE.PerspectiveCamera(30, W / H, 0.01, 60);

  // ------------------------------------------------------------ crachá
  const frontCanvas = makeCanvas(BADGE_PX.w, BADGE_PX.h);
  drawBadgeFront(frontCanvas, { reveal: 0 });
  const frontTex = canvasTexture(frontCanvas);
  const backCanvas = makeCanvas(BADGE_PX.w, BADGE_PX.h);
  drawBadgeBack(backCanvas);
  const backTex = canvasTexture(backCanvas);

  const shape = roundedRect(CARD_W, CARD_H, 0.0031);
  shape.holes.push(slotPath());
  const cardGeo = new THREE.ExtrudeGeometry(shape, { depth: CARD_T, bevelEnabled: false, curveSegments: 10 });
  cardGeo.translate(0, 0, -CARD_T / 2);
  const edgeMat = new THREE.MeshPhysicalMaterial({ color: 0xdedcd6, roughness: 0.5, clearcoat: 0.4 });
  const card = new THREE.Mesh(cardGeo, edgeMat);
  const decalGeo = new THREE.ShapeGeometry(shape, 10);
  normalizeUV(decalGeo, CARD_W, CARD_H);
  const frontMat = new THREE.MeshPhysicalMaterial({ map: frontTex, roughness: 0.42, clearcoat: 0.75, clearcoatRoughness: 0.16 });
  const front = new THREE.Mesh(decalGeo, frontMat); front.position.z = CARD_T / 2 + 0.00002;
  const back = new THREE.Mesh(decalGeo, new THREE.MeshPhysicalMaterial({ map: backTex, roughness: 0.45, clearcoat: 0.6, clearcoatRoughness: 0.2 }));
  back.rotation.y = Math.PI; back.position.z = -CARD_T / 2 - 0.00002;
  const cardGroup = new THREE.Group();
  cardGroup.add(card, front, back);
  cardGroup.position.y = -0.0042 - (CARD_H / 2 - 0.0062);

  const steel = new THREE.MeshStandardMaterial({ color: 0xb8bcc1, metalness: 1, roughness: 0.25 });
  const ring = new THREE.Mesh(new THREE.TorusGeometry(0.0042, 0.00065, 10, 28), steel);
  ring.rotation.y = Math.PI / 2;
  const hook = new THREE.Mesh(new THREE.CapsuleGeometry(0.0016, 0.007, 4, 10), steel);
  hook.position.y = 0.0085;
  const crimp = new THREE.Mesh(new THREE.BoxGeometry(0.0125, 0.008, 0.0028), new THREE.MeshStandardMaterial({ color: 0x1d1f22, metalness: 0.7, roughness: 0.4 }));
  crimp.position.y = 0.0158;
  const twist = new THREE.Group();
  twist.position.y = -STRAP_L;
  twist.add(cardGroup, ring, hook, crimp);

  const strapMat = new THREE.MeshStandardMaterial({ map: strapTexture(), roughness: 0.85, side: THREE.DoubleSide });
  const strapGeo = new THREE.PlaneGeometry(0.015, STRAP_L - 0.02);
  const s1 = new THREE.Mesh(strapGeo, strapMat); s1.position.set(-0.004, -STRAP_L / 2 + 0.01, 0.0012); s1.rotation.z = -0.006;
  const s2 = new THREE.Mesh(strapGeo, strapMat); s2.position.set(0.004, -STRAP_L / 2 + 0.01, -0.0012); s2.rotation.z = 0.006;
  const pivot = new THREE.Group();
  pivot.position.set(0, PIVOT_Y, 0);
  pivot.add(s1, s2, twist);
  scene.add(pivot);

  // ------------------------------------------------------------ maço de R$ 5 mil
  const noteTex = canvasTexture(drawNoteTop());
  const edgeLong = canvasTexture(drawPaperEdges(1560, 110, 50, 3));
  const edgeShort = canvasTexture(drawPaperEdges(700, 110, 50, 4));
  const noteMat = new THREE.MeshStandardMaterial({ map: noteTex, roughness: 0.78 });
  const longMat = new THREE.MeshStandardMaterial({ map: edgeLong, roughness: 0.9 });
  const shortMat = new THREE.MeshStandardMaterial({ map: edgeShort, roughness: 0.9 });
  const bundleBox = new THREE.Mesh(new THREE.BoxGeometry(BUNDLE.w, BUNDLE.h, BUNDLE.d), [shortMat, shortMat, noteMat, noteMat, longMat, longMat]);
  const bandTopMat = new THREE.MeshStandardMaterial({ map: canvasTexture(drawBandTop()), roughness: 0.7 });
  const bandSideMat = new THREE.MeshStandardMaterial({ map: canvasTexture(drawBandSide()), roughness: 0.7 });
  const band = new THREE.Mesh(new THREE.BoxGeometry(0.034, BUNDLE.h + 0.0007, BUNDLE.d + 0.0007), [bandSideMat, bandSideMat, bandTopMat, bandTopMat, bandSideMat, bandSideMat]);
  const loose1 = new THREE.Mesh(new THREE.BoxGeometry(BUNDLE.w, 0.00022, BUNDLE.d), [shortMat, shortMat, noteMat, noteMat, longMat, longMat]);
  loose1.position.set(0.0022, BUNDLE.h / 2 + 0.0002, -0.0012); loose1.rotation.y = 0.018;
  const bundle = new THREE.Group();
  const bundleInner = new THREE.Group();
  bundleInner.add(bundleBox, band, loose1);
  bundle.add(bundleInner);
  scene.add(bundle);
  const bundleShadow = contactShadow(0.22, 0.12, 0.7, 0.75);
  scene.add(bundleShadow);

  // ------------------------------------------------------------ pilha gigante
  const S = BLOCK.s;
  const faceBands = canvasTexture(drawBlockFace(11, { showBands: true, cols: 14, rows: 390 }));
  const faceEnds = canvasTexture(drawBlockFace(12, { showBands: false, cols: 31, rows: 390 }));
  const topTex = canvasTexture(drawNoteTop());
  topTex.wrapS = topTex.wrapT = THREE.RepeatWrapping; topTex.repeat.set(13.7, 30.5);
  const bm = (map) => new THREE.MeshStandardMaterial({ map, roughness: 0.88 });
  const block = new THREE.Mesh(new THREE.BoxGeometry(S, S, S), [bm(faceEnds), bm(faceEnds), bm(topTex), new THREE.MeshStandardMaterial({ color: 0x111111 }), bm(faceBands), bm(faceBands)]);
  block.position.set(BLOCK.x, S / 2, BLOCK.z);
  const blockGroup = new THREE.Group();
  blockGroup.add(block);
  scene.add(blockGroup);
  // maços soltos na base (quebra a forma perfeita do cubo)
  const looseGeo = new THREE.BoxGeometry(BUNDLE.w, BUNDLE.h, BUNDLE.d);
  const looseMats = [shortMat, shortMat, noteMat, noteMat, longMat, longMat];
  const looseSpots = [[-0.18, 0.3, 0.2], [0.35, 0.0, 0.32], [-0.05, 0.9, 0.12], [0.6, -0.6, 0.18], [-0.32, -0.3, 0.26]];
  looseSpots.forEach(([dx, rot, dz], i) => {
    for (let k = 0; k < 2 + (i % 3); k++) {
      const m = new THREE.Mesh(looseGeo, looseMats);
      m.position.set(BLOCK.x - S / 2 + 0.25 + dx + k * 0.004, BUNDLE.h / 2 + k * BUNDLE.h, BLOCK.z + S / 2 + dz + k * 0.003);
      m.rotation.y = rot + k * 0.05;
      blockGroup.add(m);
    }
    const b2 = new THREE.Mesh(new THREE.BoxGeometry(0.034, BUNDLE.h * (2 + (i % 3)) + 0.0006, BUNDLE.d + 0.0007), [bandSideMat, bandSideMat, bandTopMat, bandTopMat, bandSideMat, bandSideMat]);
    b2.position.set(BLOCK.x - S / 2 + 0.25 + dx, (BUNDLE.h * (2 + (i % 3))) / 2, BLOCK.z + S / 2 + dz);
    b2.rotation.y = rot;
    blockGroup.add(b2);
  });
  const blockShadow = contactShadow(S + 0.7, S + 0.7, 0.75, 0.32);
  blockShadow.position.set(BLOCK.x, 0.001, BLOCK.z);
  blockGroup.add(blockShadow);

  // ------------------------------------------------------------ luzes
  const key = new THREE.SpotLight(0xf1efe9, 4.2, 2.2, 0.42, 1.0, 2);
  key.position.set(-0.55, 1.28, 0.95); key.target.position.set(0, CARD_CY, 0);
  scene.add(key, key.target);
  const rim = new THREE.SpotLight(0xff2a3a, 3.2, 0, 0.5, 1.0, 2);
  rim.position.set(0.55, 0.92, -0.55); rim.target.position.set(0, CARD_CY, 0);
  scene.add(rim, rim.target);
  const fill = new THREE.HemisphereLight(0x9aa4ad, 0x0d0d0f, 0.05);
  scene.add(fill);
  // luz do maço no chão (de cima, suave)
  const cashKey = new THREE.SpotLight(0xf3f0ea, 0, 0, 0.5, 1.0, 2);
  cashKey.position.set(-0.25, 0.95, 0.55); cashKey.target.position.copy(LAND);
  scene.add(cashKey, cashKey.target);
  // luz da pilha (acende piscando)
  const blockLight = new THREE.SpotLight(0xe8eef5, 0, 0, 0.62, 0.65, 2);
  blockLight.position.set(BLOCK.x - 0.5, 5.6, BLOCK.z + 1.7); blockLight.target.position.set(BLOCK.x - 0.2, 0.6, BLOCK.z + 0.6);
  scene.add(blockLight, blockLight.target);
  const blockFill = new THREE.SpotLight(0xb8c4d0, 0, 0, 0.8, 1.0, 2);
  blockFill.position.set(BLOCK.x - 3.2, 1.6, BLOCK.z + 2.4); blockFill.target.position.set(BLOCK.x, 1.0, BLOCK.z);
  scene.add(blockFill, blockFill.target);
  const blockRim = new THREE.SpotLight(0x8fa0b0, 1.2, 0, 0.6, 1.0, 2);
  blockRim.position.set(BLOCK.x - 2.0, 2.9, BLOCK.z - 2.6); blockRim.target.position.set(BLOCK.x, 1.2, BLOCK.z);
  scene.add(blockRim, blockRim.target);
  const poolMat = floorPoolMaterial();
  const pool = new THREE.Mesh(new THREE.PlaneGeometry(12, 12), poolMat);
  pool.rotation.x = -Math.PI / 2; pool.position.set(0.5, 0.001, 0);
  scene.add(pool);
  const cashPoolMat = floorPoolMaterial();
  const cashPool = new THREE.Mesh(new THREE.PlaneGeometry(3, 3), cashPoolMat);
  cashPool.rotation.x = -Math.PI / 2; cashPool.position.set(0, 0.0009, 0);
  scene.add(cashPool);

  // ------------------------------------------------------------ animação
  function swing(t) {
    const x = t - EV_T.start;
    // torção (yaw) amortecida: o crachá "se vira" para a câmera
    const yaw = -0.66 * Math.exp(-0.9 * Math.max(0, x)) * Math.cos(2 * Math.PI * 0.38 * Math.max(0, x)) + fbm1(t * 0.25, 3) * 0.035;
    // pêndulo (cordão de ~1,7 m: período ~2,6 s)
    const sx = 0.010 * Math.exp(-0.25 * Math.max(0, x)) * Math.sin(2 * Math.PI * 0.385 * x + 0.6) + fbm1(t * 0.18, 9) * 0.0025;
    const sz = 0.007 * Math.exp(-0.2 * Math.max(0, x)) * Math.sin(2 * Math.PI * 0.385 * x + 2.1) + fbm1(t * 0.2, 4) * 0.002;
    return { yaw, sx, sz };
  }

  // queda do maço: gravidade real, impacto em quina, assenta com micro-quique
  const g = 9.81, H0 = 0.95;
  const tHit = EV_T.drop + Math.sqrt((2 * (H0 - BUNDLE.h / 2)) / g);
  function bundleState(t) {
    if (t < EV_T.drop) return { y: 5, rx: 0, rz: 0, ry: 0, x: LAND.x, z: LAND.z, vis: false };
    const x = t - EV_T.drop;
    if (t < tHit) {
      const y = H0 - 0.5 * g * x * x;
      const k = x / (tHit - EV_T.drop);
      return { y, rx: 0.20 * (1 - k * 0.3), rz: -0.13 * (1 - k * 0.2), ry: 0.32 + 0.12 * k, x: LAND.x - 0.012 * (1 - k), z: LAND.z - 0.01 * (1 - k), vis: true };
    }
    const a = t - tHit;
    // assentar: rotação vai a zero com mola rápida; pequeno quique e deslize
    const settle = spring(t, tHit, 7.5, 0.42);
    const bounce = Math.max(0, Math.sin(Math.min(Math.PI, a * Math.PI / 0.075))) * 0.0032 * Math.exp(-a * 8);
    const slide = 0.016 * (1 - Math.exp(-a * 9));
    return {
      y: BUNDLE.h / 2 + bounce, rx: 0.14 * (1 - settle), rz: -0.10 * (1 - settle), ry: 0.44 - 0.02 * settle,
      x: LAND.x + slide * 0.8, z: LAND.z + slide * 0.35, vis: true,
    };
  }

  function cameraAt(t) {
    // chegada (continua o movimento da porta), deriva lenta, tilt até o chão,
    // recuo + subida para revelar a pilha
    const a = tw(t, EV_T.start, EV_T.arrive, E.outExpo);
    let pos = [lerp(0.04, 0.022, a), lerp(0.672, 0.640, a), lerp(1.15, 0.40, a)];
    let tgt = [lerp(0.06, 0.067, a), lerp(0.632, 0.622, a), 0];
    const b = tw(t, EV_T.arrive, EV_T.tilt, E.inOutSoft);
    pos = [lerp(pos[0], 0.016, b), lerp(pos[1], 0.636, b), lerp(pos[2], 0.352, b)];
    tgt = [lerp(tgt[0], 0.062, b), tgt[1], 0];
    const c = tw(t, EV_T.tilt, EV_T.tilt + 0.34, E.inOut);
    pos = [lerp(pos[0], 0.085, c), lerp(pos[1], 0.24, c), lerp(pos[2], 0.56, c)];
    tgt = [lerp(tgt[0], 0.10, c), lerp(tgt[1], 0.05, c), lerp(tgt[2], 0.07, c)];
    const d = tw(t, EV_T.tilt + 0.34, EV_T.pull, E.inOutSoft);
    pos = [lerp(pos[0], 0.083, d), lerp(pos[1], 0.275, d), lerp(pos[2], 0.48, d)];
    tgt = [tgt[0], lerp(tgt[1], 0.018, d), tgt[2]];
    const e = tw(t, EV_T.pull, EV_T.pull + 1.7, E.inOutStrong);
    pos = [lerp(pos[0], -1.02, e), lerp(pos[1], 0.36, e), lerp(pos[2], 3.0, e)];
    tgt = [lerp(tgt[0], 0.60, e), lerp(tgt[1], 1.07, e), lerp(tgt[2], -1.1, e)];
    const f = tw(t, EV_T.pull + 1.7, EV_T.end + 0.3, E.linear);
    pos = [pos[0] - 0.04 * f, pos[1] - 0.01 * f, pos[2] + 0.10 * f];
    const fov = 30 + 4 * e;
    return { pos, tgt, fov };
  }

  // impacto do maço: micro tremida de câmera (decai em ~0,25 s)
  function impactShake(t) {
    if (t < tHit) return 0;
    const a = t - tHit;
    return Math.exp(-a * 16) * Math.sin(a * 2 * Math.PI * 11) * 0.0012;
  }

  let lastReveal = -1, lastFi = -1;
  const state = { tHit };

  function update(t, fi) {
    const sw = swing(t);
    pivot.rotation.set(sw.sx, 0, sw.sz);
    twist.rotation.y = sw.yaw;

    // nome revelado no crachá (textura redesenhada só quando muda)
    const reveal = tw(t, EV_T.nameReveal, EV_T.nameReveal + 0.42, E.inOut);
    if (reveal !== lastReveal || (reveal > 0 && reveal < 1.2 && fi !== lastFi && t < EV_T.nameReveal + 1.4)) {
      drawBadgeFront(frontCanvas, { reveal, t, t0: EV_T.nameReveal + 0.04, fi });
      frontTex.needsUpdate = true;
      lastReveal = reveal; lastFi = fi;
    }

    blockGroup.visible = t >= EV_T.pull - 0.05;
    pool.visible = blockGroup.visible;

    const bs = bundleState(t);
    bundle.visible = bs.vis;
    bundle.position.set(bs.x, bs.y, bs.z);
    bundleInner.rotation.set(bs.rx, bs.ry, bs.rz);
    const hgt = Math.max(0, bs.y - BUNDLE.h / 2);
    bundleShadow.visible = bs.vis && hgt < 0.5;
    bundleShadow.position.set(bs.x, 0.0008, bs.z);
    bundleShadow.rotation.z = -bs.ry;
    const sc = 1 + hgt * 2.2;
    bundleShadow.scale.set(sc, sc, 1);
    bundleShadow.material.uniforms.uOpacity.value = 0.72 * clamp(1 - hgt * 2.2);

    // luzes
    const cashOn = tw(t, EV_T.tilt + 0.2, EV_T.tilt + 0.8, E.inOut);
    cashKey.intensity = 2.4 * cashOn;
    cashPoolMat.uniforms.uPos.value.copy(cashKey.position);
    cashPoolMat.uniforms.uDir.value.copy(LAND).sub(cashKey.position);
    cashPoolMat.uniforms.uCos.value.set(Math.cos(0.5), Math.cos(0.18));
    cashPoolMat.uniforms.uPower.value = 0.018 * cashOn;
    // pilha: liga com cintilação (lâmpada fluorescente)
    const L0 = EV_T.lights;
    const flick = t < L0 ? 0 : t < L0 + 0.05 ? 0.55 : t < L0 + 0.09 ? 0.08 : t < L0 + 0.13 ? 0.85 : t < L0 + 0.17 ? 0.3 : t < L0 + 0.24 ? 0.95 : 1;
    blockLight.intensity = 120 * flick;
    blockFill.intensity = 9 * flick;
    poolMat.uniforms.uPos.value.copy(blockLight.position);
    poolMat.uniforms.uDir.value.copy(blockLight.target.position).sub(blockLight.position);
    poolMat.uniforms.uCos.value.set(Math.cos(0.62), Math.cos(0.30));
    poolMat.uniforms.uPower.value = 0.55 * flick;
    // a luz do crachá diminui quando a câmera recua
    const pullE = tw(t, EV_T.pull, EV_T.pull + 1.2, E.inOut);
    key.intensity = 4.2 * (1 - 0.55 * pullE);
    rim.intensity = 3.2 * (1 - 0.4 * pullE);

    const cam = cameraAt(t);
    camera.fov = cam.fov; camera.updateProjectionMatrix();
    const sh = impactShake(t);
    aimCamera(camera, [cam.pos[0], cam.pos[1] + sh, cam.pos[2]], cam.tgt, t, 1.0);

    const flash = 0.22 * (1 - tw(t, EV_T.start, EV_T.start + 0.16, E.out));
    return {
      // chega desfocado e "puxa o foco" no crachá (como as entradas da referência)
      blur: 20 * (1 - tw(t, EV_T.start, EV_T.start + 0.42, E.outQuart)),
      comp: { alpha3d: 1, exposure: 1 + 0.6 * (1 - tw(t, EV_T.start, EV_T.start + 0.3, E.out)), flash, flashColor: 0xff2030 },
    };
  }

  // ------------------------------------------------------------ UI
  const cardCorners = [[-1, -1], [1, -1], [1, 1], [-1, 1]].map(([sx, sy]) => new THREE.Vector3(sx * CARD_W / 2, sy * CARD_H / 2, 0));
  const tmp = new THREE.Vector3();

  function badgeRect() {
    cardGroup.updateMatrixWorld(true);
    let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
    for (const c of cardCorners) {
      tmp.copy(c).applyMatrix4(cardGroup.matrixWorld);
      const s = project(tmp, camera);
      x0 = Math.min(x0, s.x); x1 = Math.max(x1, s.x); y0 = Math.min(y0, s.y); y1 = Math.max(y1, s.y);
    }
    return { x: x0, y: y0, w: x1 - x0, h: y1 - y0 };
  }

  const FX = 1380, VX = 1622;
  const ROWS = [
    { key: 'NOME', y: 520, value: 'JOÃO NAZARENO ROQUE', t0: null },
    { key: 'CARGO', y: 628, value: 'DESENVOLVEDOR BACK-END', t0: Wd.desenvolvedor + 0.04 },
    { key: 'IDADE', y: 736, value: '48 ANOS', t0: Wd.n48 },
    { key: 'VÍNCULO', y: 844, value: 'TERCEIRIZADO', t0: Wd.terceirizado },
    { key: 'SALÁRIO', y: 952, value: 'MÉDIO', t0: Wd.salario + 0.1 },
  ];

  function drawFicha(ctx, t, fi) {
    const out = EV_T.uiOut;
    const A = env(t, EV_T.start + 0.05, EV_T.start + 0.12, out, out + 0.22, E.linear, E.linear);
    if (A <= 0) return;
    ctx.save();
    ctx.globalAlpha *= A;
    const T0 = EV_T.start + 0.22;
    // cabeçalho da ficha
    const hd = decode('IDENTIFICAÇÃO', t, T0, { cps: 26, seed: 201, fi });
    if (hd.visible) {
      ctx.fillStyle = PAL.hudRed; ctx.fillRect(FX, 372, 16, 16);
      setFont(ctx, FONTS.mono, 26, 700);
      drawSegs(ctx, [{ text: hd.text, color: PAL.title }], FX + 32, 389, { ls: 4, shadow: { color: 'rgba(0,0,0,0.5)', blur: 6, x: 2, y: 3 } });
      const idd = decode('ID 0417', t, T0 + 0.25, { cps: 26, seed: 202, fi });
      setFont(ctx, FONTS.mono, 20, 500);
      drawSegs(ctx, [{ text: idd.text, color: PAL.subtitle }], 2330, 388, { ls: 5, align: 'right' });
    }
    const lp = tw(t, T0 + 0.05, T0 + 0.75, E.outQuart);
    ctx.fillStyle = PAL.hudLine;
    ctx.fillRect(FX, 414, (2330 - FX) * lp, 2);

    ROWS.forEach((r, i) => {
      const rowT = r.key === 'NOME' ? T0 + 0.18 : r.t0 - 0.06;
      const la = tw(t, rowT, rowT + 0.12, E.linear);
      if (la <= 0) return;
      // linha separadora
      ctx.save(); ctx.globalAlpha *= la;
      ctx.fillStyle = '#2B2D2E';
      ctx.fillRect(FX, r.y + 34, (2330 - FX) * tw(t, rowT, rowT + 0.5, E.outQuart), 1.5);
      // rótulo (NOME fica vermelho quando o narrador diz "o nome dele é")
      const isNameHint = r.key === 'NOME' && t > EV_T.nameHint;
      const kd = decode(r.key, t, rowT, { cps: 30, seed: 210 + i, fi });
      setFont(ctx, FONTS.mono, 20, 500);
      drawSegs(ctx, [{ text: kd.text, color: isNameHint ? PAL.red : '#6F7275' }], FX, r.y - 6, { ls: 6 });
      ctx.restore();

      if (r.key === 'NOME') {
        // tarja preta até a revelação do nome
        const rv = tw(t, EV_T.nameReveal, EV_T.nameReveal + 0.36, E.inOut);
        const nd = decode(r.value, t, EV_T.nameReveal + 0.04, { cps: 22, tail: 5, seed: 220, fi });
        setFont(ctx, FONTS.typeIt, 56);
        if (nd.visible) drawSegs(ctx, [{ text: nd.text, color: PAL.white }], VX, r.y, { ls: 1, shadow: { color: 'rgba(0,0,0,0.6)', blur: 6, x: 3, y: 4 } });
        const barW = 660, bx0 = VX - 6;
        const barIn = tw(t, rowT + 0.05, rowT + 0.35, E.outQuart);
        const cut = barW * rv;
        if (barW - cut > 0 && barIn > 0) {
          ctx.save();
          ctx.fillStyle = '#0A0B0C';
          shadowOn(ctx, { color: 'rgba(0,0,0,0.5)', blur: 6, x: 2, y: 3 });
          ctx.fillRect(bx0 + cut, r.y - 46, (barW - cut) * barIn, 56);
          shadowOff(ctx);
          // textura "riscada" da tarja
          ctx.fillStyle = 'rgba(255,255,255,0.035)';
          for (let k = 0; k < 9; k++) ctx.fillRect(bx0 + cut, r.y - 42 + k * 6, (barW - cut) * barIn, 1);
          ctx.restore();
        }
        // sublinhado dourado sob o nome
        const ul = tw(t, Wd.joao + 0.3, Wd.roque + 0.1, E.inOut);
        underline(ctx, VX, VX + 650, r.y + 16, ul);
        return;
      }
      const vd = decode(r.value, t, r.t0, { cps: 26, tail: 5, seed: 230 + i, fi });
      if (vd.visible) {
        setFont(ctx, FONTS.typeIt, 56);
        drawSegs(ctx, [{ text: vd.text, color: PAL.white }], VX, r.y, { ls: 1, shadow: { color: 'rgba(0,0,0,0.6)', blur: 6, x: 3, y: 4 } });
      }
      if (r.key === 'SALÁRIO') {
        // medidor discreto: 5 de 10 segmentos
        const mx = VX + 220, my = r.y - 32;
        for (let k = 0; k < 10; k++) {
          const on = tw(t, r.t0 + 0.25 + k * 0.035, r.t0 + 0.3 + k * 0.035, E.linear);
          if (on <= 0) continue;
          ctx.save(); ctx.globalAlpha *= on;
          if (k < 5) { ctx.fillStyle = '#C9CBCB'; ctx.fillRect(mx + k * 30, my, 20, 30); }
          else { ctx.strokeStyle = '#4A4D50'; ctx.lineWidth = 2; ctx.strokeRect(mx + k * 30 + 1, my + 1, 18, 28); }
          ctx.restore();
        }
      }
    });
    ctx.restore();
  }

  function drawBadgeUI(ctx, t, fi) {
    const A = env(t, EV_T.start + 0.2, EV_T.start + 0.25, EV_T.uiOut, EV_T.uiOut + 0.2, E.linear, E.linear);
    if (A <= 0) return;
    const r = badgeRect();
    const pad = 34;
    const bx = r.x - pad, by = r.y - pad, bw = r.w + pad * 2, bh = r.h + pad * 2;
    const p = tw(t, EV_T.start + 0.25, EV_T.start + 0.75, E.outQuart);
    withAlpha(ctx, A, () => {
      transformBox(ctx, bx, by, bw, bh, p, { color: PAL.frame, hs: 13 });
      // linha guia até a ficha
      const lp = tw(t, EV_T.start + 0.55, EV_T.start + 0.95, E.outQuart);
      const y = by + bh / 2;
      const x0 = bx + bw + 7, x1 = FX - 40;
      if (lp > 0) {
        drawLine(ctx, x0, y, lerp(x0, x1, lp), y, 1, { color: '#5A5D61', width: 2 });
        node(ctx, lerp(x0, x1, 0.5), y, 9, PAL.redBox, lp > 0.5 ? 1 : 0);
        if (lp >= 1) drawLine(ctx, x1, y, x1, 390, tw(t, EV_T.start + 0.95, EV_T.start + 1.2, E.outQuart), { color: '#5A5D61', width: 2 });
      }
    });
  }

  function money(n) { return Math.round(n).toString().replace(/\B(?=(\d{3})+(?!\d))/g, '.'); }

  function bigValue(ctx, label, value, x, y, size, t, t0, fi, { alpha = 1, color = PAL.white, labelColor = '#B9BBBC', ulColor = null } = {}) {
    // estilo do "VALOR CONFIRMADO / R$ 813,000,000" da abertura
    ctx.save(); ctx.globalAlpha *= alpha;
    const ld = decode(label, t, t0, { cps: 30, seed: 400 + size, fi });
    setFont(ctx, FONTS.type, Math.round(size * 0.27));
    const lw = measure(ctx, ld.text, 3);
    drawSegs(ctx, [{ text: ld.text, color: labelColor }], x, y - size * 1.0, { ls: 3, shadow: { color: 'rgba(0,0,0,0.5)', blur: 5, x: 2, y: 3 } });
    if (ld.visible) {
      ctx.fillStyle = ulColor || labelColor;
      ctx.fillRect(x - 2, y - size * 1.0 + 12, Math.max(0, lw + 4) * tw(t, t0 + 0.1, t0 + 0.5, E.outQuart), 2);
    }
    ctx.restore();
    if (!value) return;
    ctx.save(); ctx.globalAlpha *= alpha;
    shadowOn(ctx, { color: 'rgba(0,0,0,0.75)', blur: 4, x: 5, y: 6 });
    setFont(ctx, FONTS.big, Math.round(size * 0.55));
    ctx.letterSpacing = '0px';
    ctx.fillStyle = '#CFCFCF';
    ctx.fillText('R$', x, y);
    const rw = ctx.measureText('R$').width;
    setFont(ctx, FONTS.big, size);
    ctx.fillStyle = color;
    ctx.fillText(value, x + rw + size * 0.16, y);
    ctx.restore();
  }

  function drawCashUI(ctx, t, fi) {
    const t0 = EV_T.cashUI;
    if (t < t0) return;
    const anchorW = new THREE.Vector3(LAND.x + 0.016, BUNDLE.h + 0.001, LAND.z + 0.006);
    const a = project(anchorW, camera);
    // a etiqueta acompanha o maço quando a câmera recua (e encolhe um pouco)
    const pullE = tw(t, EV_T.pull, EV_T.pull + 1.7, E.inOutStrong);
    const k = 1 - 0.5 * pullE;
    const lx = a.x - lerp(600, 560, pullE), ly = a.y - lerp(250, 215, pullE);
    const A = env(t, t0, t0 + 0.06, EV_T.uiEnd, EV_T.uiEnd + 0.01, E.linear, E.linear);
    withAlpha(ctx, A, () => {
      const lp = tw(t, t0, t0 + 0.22, E.outQuart);
      ctx.save();
      // a linha guia chega pelo lado direito do valor
      const ex = lx + 440 * k, ey = ly + 26 * k;
      drawLine(ctx, a.x, a.y, lerp(a.x, ex, lp), lerp(a.y, ey, lp), 1, { color: PAL.redBox, width: 2 });
      node(ctx, a.x, a.y, 9, PAL.redBox, 1);
      ctx.restore();
      if (lp >= 1) {
        const cnt = tw(fq(t), EV_T.cashCount, EV_T.cashCount + 0.7, E.outQuart);
        const val = cnt > 0 ? money(5000 * cnt) : '0';
        bigValue(ctx, 'OFERECIDOS', val, lx, ly, Math.round(150 * k), t, t0 + 0.1, fi);
      }
    });
  }

  function drawBlockUI(ctx, t, fi) {
    const t0 = EV_T.lights + 0.02;
    if (t < t0) return;
    const A = env(t, t0, t0 + 0.05, EV_T.uiEnd, EV_T.uiEnd + 0.01, E.linear, E.linear);
    const lx = 200, ly = 700, size = 168;
    // geometria do rótulo (igual à de bigValue): o sublinhado do "DESVIADOS"
    const ulY = ly + 150 - size + 12;
    setFont(ctx, FONTS.type, Math.round(size * 0.27));
    const ulEnd = lx + measure(ctx, 'DESVIADOS', 3) + 2;
    // ponto de ancoragem na aresta vertical frontal-esquerda da pilha, na mesma
    // altura de tela do sublinhado (rastreado no 3D, como um track point do AE):
    // a linha guia sai da pilha e encontra o sublinhado — nunca fica solta
    const top = project(new THREE.Vector3(BLOCK.x - BLOCK.s / 2, BLOCK.s, BLOCK.z + BLOCK.s / 2), camera);
    const bot = project(new THREE.Vector3(BLOCK.x - BLOCK.s / 2, 0, BLOCK.z + BLOCK.s / 2), camera);
    const k = clamp((ulY - top.y) / Math.max(1, bot.y - top.y), 0.08, 0.92);
    const ax = lerp(top.x, bot.x, k), ay = lerp(top.y, bot.y, k);
    withAlpha(ctx, A, () => {
      // a linha se desenha da pilha em direção ao rótulo
      const lp = tw(t, t0, t0 + 0.32, E.outQuart);
      ctx.save();
      drawLine(ctx, ax, ay, lerp(ax, ulEnd, lp), lerp(ay, ulY + 1, lp), 1, { color: PAL.redBox, width: 2 });
      node(ctx, ax, ay, 10, PAL.redBox, 1);
      node(ctx, lerp(ax, ulEnd, 0.5), lerp(ay, ulY + 1, 0.5), 8, PAL.redBox, lp > 0.5 ? 1 : 0);
      ctx.restore();
      // contagem 5.000 -> 813.000.000 em escala logarítmica (os dígitos "rolam")
      const c = tw(fq(t), EV_T.bigCount, Wd.milhoes + 0.1, E.inOut);
      const v = Math.exp(lerp(Math.log(5000), Math.log(813000000), c));
      const val = c >= 1 ? '813.000.000' : money(Math.round(v / (c > 0.85 ? 1000 : 1)) * (c > 0.85 ? 1000 : 1));
      bigValue(ctx, 'DESVIADOS', val, lx, ly + 150, size, t, t0 + 0.05, fi, { ulColor: PAL.redBox });
    });
  }

  function ui(ctx, t, fi) {
    drawBadgeUI(ctx, t, fi);
    drawFicha(ctx, t, fi);
    drawCashUI(ctx, t, fi);
    drawBlockUI(ctx, t, fi);
  }

  return { scene, camera, update, ui, state };
}
