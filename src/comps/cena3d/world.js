// Cena 3D — "Os sistemas de detecção olhavam pra aquilo e não viam invasão.
// E o roubo não precisava mais de ninguém digitando nada, podia ser
// automático. Mas nada disso bastaria sem a última peça, a assinatura."
//
// Um único mundo 3D sobre o mesmo fundo, com uma câmera contínua:
//  • a esteira: as ordens saem do emissor e atravessam o portal do sistema de
//    detecção, que olha cada uma e aprova todas ("nenhuma invasão");
//  • o teclado ao lado do emissor está parado ("ninguém digitando") e, em
//    "automático", as teclas descem sozinhas, a luz de fundo acende e o
//    fluxo acelera;
//  • em "Mas", sobe a trava no fim da esteira e tudo para. No topo da
//    fechadura falta uma peça: ela desce com a assinatura gravada e fica
//    parada logo acima do encaixe.
import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { W, H, PAL, FONTS } from '../../core/config.js';
import { E, tw, spring, clamp, lerp, env } from '../../core/ease.js';
import { hash } from '../../core/rand.js';
import { studioEnv, project, aimCamera, canvasTexture, makeCanvas, additive, contactShadow } from '../../core/three-utils.js';
import { labelBox } from '../../core/draw.js';
import { setFont, measure } from '../../core/text.js';
import { SW } from './words.js';

export const T = {
  auto: SW.podia,               // 6.66 as teclas descem sozinhas e o fluxo acelera
  typeEnd: 8.30,
  close: SW.mas,                // 8.04 a trava sobe
  stop1: 8.95,                  // a esteira termina de parar
  slot: SW.ultima,              // 9.72 o encaixe vazio pisca
  piece: 10.66,                 // a peça começa a descer
  sign: SW.assinatura,          // 10.92 a assinatura acende
};

const PL = { x0: -3.6, x1: 3.3, z0: -1.05, z1: 1.35, h: 0.10 };   // plataforma
const TY = PL.h;
const BELT = { w: 0.56, h: 0.07 };
const BY = TY + BELT.h;                                            // superfície da esteira
const EMIT = { x: -3.05, l: 0.62, w: 0.84, h: 0.44 };
const EX = EMIT.x + EMIT.l / 2;                                    // boca do emissor
const SEG = [[EX, 2.47], [2.57, 2.92]];                            // a trava sobe no vão entre os trechos
const ORD = { l: 0.26, h: 0.05, w: 0.18 };
const SCAN_X = -0.55;
const BAR = { x: 2.52, z: -0.04, t: 0.06, h: 0.46, w: 0.80 };
const SHUT_X = BAR.x - BAR.t / 2;
const LOCK = { x: 2.52, z: -0.66, s: 0.44, h: 0.46 };
const PIECE_S = 0.22;
const HOVER_Y = TY + LOCK.h + 0.06;
const KB = { x: -2.42, z: 0.80, ry: 0.10 };
const V0 = 0.40, V1 = 1.05;
const RIB = 0.32;                                                  // metros de esteira por repetição da textura

// ------------------------------------------------------------ esteira (tempo -> distância)
function speed(t) {
  return lerp(V0, V1, tw(t, T.auto, T.auto + 0.55, E.inOut)) * (1 - tw(t, T.close, T.stop1, E.inOut));
}
const T_PRE = -16, T_END = 11.8, DT = 1 / 600;
const NT = Math.ceil((T_END - T_PRE) / DT) + 2;
const DTAB = new Float64Array(NT);
for (let i = 1; i < NT; i++) DTAB[i] = DTAB[i - 1] + speed(T_PRE + (i - 0.5) * DT) * DT;
function belt(t) {
  const u = (clamp(t, T_PRE, T_END) - T_PRE) / DT;
  const i = Math.min(NT - 2, Math.floor(u));
  return DTAB[i] + (DTAB[i + 1] - DTAB[i]) * (u - i);
}
function timeAt(d) {
  if (d > DTAB[NT - 1]) return Infinity;
  let lo = 0, hi = NT - 1;
  while (hi - lo > 1) { const m = (lo + hi) >> 1; if (DTAB[m] <= d) lo = m; else hi = m; }
  const span = DTAB[hi] - DTAB[lo];
  return T_PRE + (lo + (span > 0 ? (d - DTAB[lo]) / span : 0)) * DT;
}

// Ordens: posições na esteira (em distância de esteira). Antes do modo
// automático saem a cada 40 cm; depois, a cada 31 cm, com a esteira mais rápida.
const ORDERS = [];
{
  const dAuto = belt(T.auto), dEnd = belt(T_END), dClose = belt(T.close);
  let d = 0.05, i = 0;
  while (d < dEnd) {
    const xc = EMIT.x + dClose - d;
    // nenhuma ordem pode estar atravessando a linha da trava quando ela sobe
    if (!(xc > SHUT_X - ORD.l / 2 - 0.06 && xc < BAR.x + BAR.t / 2 + ORD.l / 2 + 0.03)) {
      ORDERS.push({ d, i, ry: (hash(i, 3) - 0.5) * 0.08, z: (hash(i, 4) - 0.5) * 0.05 });
    }
    d += d < dAuto ? 0.40 : 0.31; i++;
  }
  for (const o of ORDERS) { o.tSpawn = timeAt(o.d); o.tPass = timeAt(o.d + SCAN_X - EMIT.x); }
}

// x de cada ordem; depois que a trava fecha, elas encostam e fazem fila.
function orderX(t) {
  const db = belt(t);
  const xs = ORDERS.map((o) => EMIT.x + db - o.d);
  if (t >= T.close) {
    let lim = SHUT_X - ORD.l / 2 - 0.008;
    for (let k = 0; k < xs.length; k++) {
      if (xs[k] > SHUT_X) continue;              // já tinha passado da trava
      xs[k] = Math.min(xs[k], lim);
      lim = xs[k] - ORD.l - 0.035;
    }
  }
  return xs;
}
const shown = (x) => x > EMIT.x && x < SEG[1][1] + 0.03;

// ------------------------------------------------------------ peça
function pieceShape() {
  const R = 0.184, s = new THREE.Shape();
  s.moveTo(-0.5, -0.5);
  s.lineTo(-0.14, -0.5); s.absarc(0, -0.38, R, -2.433, -0.709, true);
  s.lineTo(0.5, -0.5);
  s.lineTo(0.5, -0.14); s.absarc(0.62, 0, R, -2.279, 2.279, false);
  s.lineTo(0.5, 0.5);
  s.lineTo(0.14, 0.5); s.absarc(0, 0.62, R, -0.709, -2.433, false);
  s.lineTo(-0.5, 0.5);
  s.lineTo(-0.5, 0.14); s.absarc(-0.38, 0, R, 2.279, -2.279, true);
  s.lineTo(-0.5, -0.5);
  return s;
}
function pieceY(t) {
  const p = tw(t, T.piece, T.piece + 0.68, E.outQuart);
  const a = t - (T.piece + 0.55);
  const settle = a > 0 ? Math.exp(-a * 6) * Math.sin(a * 2 * Math.PI * 1.6) * 0.006 : 0;
  const bob = 0.003 * Math.sin((t - T.piece) * 2.2) * tw(t, T.piece + 0.6, T.piece + 1.0);
  return lerp(1.85, HOVER_Y, p) - settle + bob;
}

// ------------------------------------------------------------ texturas
const NPX = 1024;
const toPx = (p) => [((p.x + 0.85) / 1.7) * NPX, ((0.85 - p.y) / 1.7) * NPX];
const CEN = toPx({ x: 0.152, y: 0.152 });
function shapePath(shape) {
  const path = new Path2D();
  shape.getPoints(40).forEach((p, i) => { const [x, y] = toPx(p); if (i) path.lineTo(x, y); else path.moveTo(x, y); });
  path.closePath();
  return path;
}
function scaled(g, k, fn) {
  g.save(); g.translate(CEN[0], CEN[1]); g.scale(k, k); g.translate(-CEN[0], -CEN[1]); fn(); g.restore();
}
function signature(g) {
  g.beginPath();
  for (let i = 0; i <= 420; i++) {
    const s = i / 420;
    const x = -0.20 + 0.70 * s + 0.032 * Math.cos(2 * Math.PI * 6.5 * s);
    const y = 0.20 + 0.07 * Math.sin(2 * Math.PI * 6.5 * s + 0.4) * (0.65 + 0.35 * Math.sin(2 * Math.PI * 1.3 * s + 1)) + 0.035 * Math.sin(2 * Math.PI * 0.8 * s);
    const [cx, cy] = toPx({ x, y });
    if (i) g.lineTo(cx, cy); else g.moveTo(cx, cy);
  }
  const a = toPx({ x: -0.24, y: 0.04 }), b = toPx({ x: 0.16, y: -0.08 }), c = toPx({ x: 0.56, y: 0.06 });
  g.moveTo(a[0], a[1]); g.quadraticCurveTo(b[0], b[1], c[0], c[1]);
  g.lineCap = 'round'; g.lineJoin = 'round';
  g.stroke();
}
function pieceCanvases(shape) {
  const path = shapePath(shape);
  const base = makeCanvas(NPX, NPX), gb = base.getContext('2d');
  const grd = gb.createRadialGradient(CEN[0], CEN[1], 40, CEN[0], CEN[1], 720);
  grd.addColorStop(0, '#7E1B26'); grd.addColorStop(1, '#3A0A11');
  gb.fillStyle = grd; gb.fillRect(0, 0, NPX, NPX);
  for (let i = 0; i < 2600; i++) {
    gb.fillStyle = `rgba(255,255,255,${0.012 + 0.02 * hash(i, 9)})`;
    gb.fillRect(hash(i, 1) * NPX, hash(i, 2) * NPX, 1 + 40 * hash(i, 3), 1);
  }
  scaled(gb, 0.84, () => { gb.strokeStyle = 'rgba(201,164,106,0.85)'; gb.lineWidth = 5; gb.stroke(path); });
  gb.strokeStyle = '#D9B77E'; gb.lineWidth = 8; gb.shadowColor = 'rgba(0,0,0,0.5)'; gb.shadowBlur = 4;
  signature(gb);
  const glowC = makeCanvas(NPX, NPX), gg = glowC.getContext('2d');
  gg.fillStyle = '#000'; gg.fillRect(0, 0, NPX, NPX);
  scaled(gg, 0.84, () => { gg.strokeStyle = 'rgba(120,90,50,1)'; gg.lineWidth = 5; gg.stroke(path); });
  gg.strokeStyle = '#FFE3B4'; gg.lineWidth = 9; gg.shadowColor = '#FFC878'; gg.shadowBlur = 16;
  signature(gg);
  return { base, glow: glowC };
}
function slotCanvas(shape) {
  const path = shapePath(shape);
  const c = makeCanvas(NPX, NPX), g = c.getContext('2d');
  scaled(g, 1.07, () => {
    g.fillStyle = 'rgba(4,4,5,0.92)'; g.fill(path);
    g.strokeStyle = '#FF4E5B'; g.lineWidth = 9; g.shadowColor = '#FF2A3A'; g.shadowBlur = 18; g.stroke(path);
  });
  return c;
}
function orderCanvas() {
  const c = makeCanvas(512, 356), g = c.getContext('2d');
  g.fillStyle = '#E3E1D9'; g.fillRect(0, 0, 512, 356);
  g.fillStyle = PAL.redDeep; g.fillRect(0, 0, 30, 356);
  g.fillStyle = '#26292C'; g.font = `700 50px ${FONTS.mono}`; g.fillText('ORDEM', 62, 86);
  g.fillStyle = '#A7A9AB';
  for (const [y, w] of [[128, 360], [170, 300], [212, 330]]) g.fillRect(62, y, w, 16);
  g.fillStyle = '#2A2C2F';
  let x = 300;
  for (let i = 0; x < 470; i++) { const w = 2 + Math.floor(hash(i, 5) * 6); if (hash(i, 6) > 0.35) g.fillRect(x, 262, w, 56); x += w + 2; }
  return c;
}
function beltCanvas() {
  const c = makeCanvas(256, 64), g = c.getContext('2d');
  g.fillStyle = '#16181b'; g.fillRect(0, 0, 256, 64);
  for (let x = 0; x < 256; x += 16) { g.fillStyle = '#23272c'; g.fillRect(x, 0, 4, 64); g.fillStyle = '#0c0d0f'; g.fillRect(x + 4, 0, 2, 64); }
  for (let i = 0; i < 400; i++) { g.fillStyle = `rgba(255,255,255,${0.02 + 0.03 * hash(i, 3)})`; g.fillRect(hash(i, 1) * 256, hash(i, 2) * 64, 2, 1); }
  return c;
}

// ------------------------------------------------------------ câmera
// Spline de Hermite com holds (velocidade zero = easy ease do AE).
const KEYS = [
  { t: 0.00, p: [0.85, 0.88, 2.15], q: [-0.62, 0.47, 0.00], f: 34, hold: true },
  { t: 3.55, p: [0.50, 0.80, 1.85], q: [-0.63, 0.52, -0.02], f: 33, hold: true },
  { t: 4.75, p: [-1.80, 0.62, 1.55], q: [-2.50, 0.17, 0.60], f: 34, hold: true },
  { t: 6.55, p: [-2.02, 0.50, 1.28], q: [-2.50, 0.16, 0.66], f: 33, hold: true },
  { t: 7.95, p: [-1.35, 0.98, 2.15], q: [-1.75, 0.22, 0.10], f: 35 },
  { t: 9.60, p: [1.30, 1.08, 1.45], q: [2.38, 0.42, -0.22], f: 34, hold: true },
  { t: 11.70, p: [2.10, 1.30, 0.20], q: [2.50, 0.56, -0.58], f: 32, hold: true },
];
function hermite(keys, t, get) {
  if (t <= keys[0].t) return get(keys[0]).slice();
  const n = keys.length;
  if (t >= keys[n - 1].t) return get(keys[n - 1]).slice();
  let i = 0;
  while (t > keys[i + 1].t) i++;
  const k0 = keys[i], k1 = keys[i + 1];
  const vel = (j) => {
    const k = keys[j];
    if (k.hold || j === 0 || j === n - 1) return get(k).map(() => 0);
    const a = keys[j - 1], b = keys[j + 1];
    return get(b).map((v, c) => (v - get(a)[c]) / (b.t - a.t));
  };
  const dt = k1.t - k0.t, u = (t - k0.t) / dt;
  const h00 = 2 * u ** 3 - 3 * u ** 2 + 1, h10 = u ** 3 - 2 * u ** 2 + u, h01 = -2 * u ** 3 + 3 * u ** 2, h11 = u ** 3 - u ** 2;
  const v0 = vel(i), v1 = vel(i + 1), p0 = get(k0), p1 = get(k1);
  return p0.map((_, c) => h00 * p0[c] + h10 * dt * v0[c] + h01 * p1[c] + h11 * dt * v1[c]);
}
function cameraAt(t) {
  const p = hermite(KEYS, t, (k) => k.p);
  const q = hermite(KEYS, t, (k) => k.q);
  const f = hermite(KEYS, t, (k) => [k.f])[0];
  // o operador acompanha a peça enquanto ela desce
  const w = tw(t, 10.55, 10.95, E.inOut);
  if (w > 0) q[1] += 0.22 * (pieceY(t) - HOVER_Y) * w;
  return { p, q, f };
}

// ------------------------------------------------------------ cena
export function createScene(renderer) {
  const scene = new THREE.Scene();
  scene.environment = studioEnv(renderer);
  scene.environmentIntensity = 0.18;
  const camera = new THREE.PerspectiveCamera(34, W / H, 0.02, 60);

  const metal = (color, roughness = 0.45, metalness = 0.55) => new THREE.MeshStandardMaterial({ color, roughness, metalness });
  const glow = (color, k = 1) => new THREE.MeshBasicMaterial({ color: new THREE.Color(color).multiplyScalar(k) });
  const setGlow = (mat, color, k) => mat.color.set(color).multiplyScalar(k);
  function add(mesh, x, y, z, { cast = true, receive = true, parent = scene } = {}) {
    mesh.position.set(x, y, z); mesh.castShadow = cast; mesh.receiveShadow = receive;
    parent.add(mesh);
    return mesh;
  }

  // ---------------- plataforma
  const pcx = (PL.x0 + PL.x1) / 2, pcz = (PL.z0 + PL.z1) / 2, plw = PL.x1 - PL.x0, pld = PL.z1 - PL.z0;
  add(new THREE.Mesh(new RoundedBoxGeometry(plw, PL.h, pld, 3, 0.02), metal(0x1a1d21, 0.74, 0.18)), pcx, PL.h / 2, pcz, { cast: false });
  const edgeMat = glow(PAL.tealBright, 0.9);
  for (const [x, z, w, d] of [[pcx, PL.z0 + 0.03, plw - 0.06, 0.008], [pcx, PL.z1 - 0.03, plw - 0.06, 0.008], [PL.x0 + 0.03, pcz, 0.008, pld - 0.06], [PL.x1 - 0.03, pcz, 0.008, pld - 0.06]]) {
    add(new THREE.Mesh(new THREE.BoxGeometry(w, 0.004, d), edgeMat), x, TY + 0.002, z, { cast: false, receive: false });
  }
  const plShadow = contactShadow(plw + 1.4, pld + 1.2, 0.85, 0.2);
  plShadow.position.set(pcx, 0.001, pcz);
  scene.add(plShadow);

  // ---------------- esteira
  const beltTex = canvasTexture(beltCanvas());
  beltTex.wrapS = THREE.RepeatWrapping;
  const beltTop = new THREE.MeshStandardMaterial({ map: beltTex, roughness: 0.85, metalness: 0.05 });
  const beltBody = metal(0x121417, 0.8, 0.2);
  const railMat = metal(0x2c3036, 0.38, 0.7);
  for (const [a, b] of SEG) {
    const len = b - a, cx = (a + b) / 2;
    add(new THREE.Mesh(new THREE.BoxGeometry(len, BELT.h, BELT.w), beltBody), cx, TY + BELT.h / 2, 0);
    const top = new THREE.PlaneGeometry(len, BELT.w - 0.01);
    top.rotateX(-Math.PI / 2);
    const uv = top.attributes.uv;
    for (let i = 0; i < uv.count; i++) uv.setX(i, (uv.getX(i) * len + a) / RIB);
    add(new THREE.Mesh(top, beltTop), cx, BY + 0.0006, 0, { cast: false });
    for (const s of [-1, 1]) add(new THREE.Mesh(new THREE.BoxGeometry(len, 0.03, 0.022), railMat), cx, BY + 0.004, s * (BELT.w / 2 + 0.011));
  }

  // ---------------- emissor
  add(new THREE.Mesh(new RoundedBoxGeometry(EMIT.l, EMIT.h, EMIT.w, 3, 0.02), metal(0x1b1e22, 0.5, 0.5)), EMIT.x, TY + EMIT.h / 2, 0);
  const mouth = new THREE.Mesh(new THREE.PlaneGeometry(ORD.w + 0.08, ORD.h + 0.045), new THREE.MeshBasicMaterial({ color: 0x050506 }));
  mouth.rotation.y = Math.PI / 2;
  add(mouth, EX + 0.0015, BY + (ORD.h + 0.045) / 2, 0, { cast: false, receive: false });
  const ledMat = glow(PAL.red, 0.25);
  add(new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.01, 0.014), ledMat), EX - 0.07, TY + EMIT.h + 0.004, 0.30, { cast: false });

  // ---------------- ordens (instâncias: corpo + etiqueta no topo)
  const ordInst = new THREE.InstancedMesh(new RoundedBoxGeometry(ORD.l, ORD.h, ORD.w, 2, 0.006), new THREE.MeshStandardMaterial({ color: 0xcfcdc6, roughness: 0.7 }), ORDERS.length);
  const topGeo = new THREE.PlaneGeometry(ORD.l - 0.014, ORD.w - 0.014);
  topGeo.rotateX(-Math.PI / 2);
  const topInst = new THREE.InstancedMesh(topGeo, new THREE.MeshStandardMaterial({ map: canvasTexture(orderCanvas()), roughness: 0.75 }), ORDERS.length);
  ordInst.castShadow = true; ordInst.receiveShadow = true; topInst.receiveShadow = true;
  scene.add(ordInst, topInst);

  // ---------------- portal do sistema de detecção
  const archMat = metal(0x202328, 0.42, 0.55);
  for (const s of [-1, 1]) add(new THREE.Mesh(new THREE.BoxGeometry(0.07, 0.70, 0.07), archMat), SCAN_X, TY + 0.35, s * 0.40);
  add(new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.07, 0.88), archMat), SCAN_X, TY + 0.735, 0);
  const stripMat = glow(PAL.tealBright, 2.0);
  for (const s of [-1, 1]) add(new THREE.Mesh(new THREE.BoxGeometry(0.016, 0.56, 0.008), stripMat), SCAN_X, TY + 0.37, s * 0.361, { cast: false });
  add(new THREE.Mesh(new THREE.BoxGeometry(0.016, 0.008, 0.70), stripMat), SCAN_X, TY + 0.697, 0, { cast: false });
  const sheetMat = additive(new THREE.ShaderMaterial({
    uniforms: { uI: { value: 0 }, uT: { value: 0 }, uColor: { value: new THREE.Color(PAL.tealBright) } },
    vertexShader: `varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`,
    fragmentShader: /* glsl */`
      uniform float uI, uT; uniform vec3 uColor; varying vec2 vUv;
      void main(){
        float edge = smoothstep(0.08, 0.0, vUv.x) + smoothstep(0.92, 1.0, vUv.x);
        float line = exp(-pow((vUv.y - fract(uT * 0.8)) * 26.0, 2.0));
        float rows = 0.6 + 0.4 * step(0.5, fract(vUv.y * 90.0));
        gl_FragColor = vec4(uColor * (0.10 + 0.55 * line + 0.25 * edge) * rows * uI, 0.0);
      }`,
    side: THREE.DoubleSide,
  }));
  const sheet = new THREE.Mesh(new THREE.PlaneGeometry(0.72, 0.62), sheetMat);
  sheet.rotation.y = Math.PI / 2; sheet.position.set(SCAN_X, TY + 0.38, 0);
  scene.add(sheet);
  const scanLight = new THREE.PointLight(0x8fc9ba, 0, 1.6, 2);
  scanLight.position.set(SCAN_X, TY + 0.42, 0);
  scene.add(scanLight);
  // câmera de vigilância sobre o portal (olha as ordens que chegam)
  const eye = new THREE.Group();
  eye.position.set(SCAN_X, TY + 0.77, 0);
  scene.add(eye);
  add(new THREE.Mesh(new THREE.CylinderGeometry(0.012, 0.016, 0.05, 16), archMat), 0, 0.025, 0, { parent: eye });
  const head = new THREE.Group();
  head.position.y = 0.062;
  eye.add(head);
  add(new THREE.Mesh(new RoundedBoxGeometry(0.12, 0.05, 0.055, 2, 0.008), metal(0xd4d6d7, 0.35, 0.2)), -0.03, 0, 0, { parent: head });
  const lens = add(new THREE.Mesh(new THREE.CylinderGeometry(0.018, 0.018, 0.02, 24), new THREE.MeshPhysicalMaterial({ color: 0x050607, roughness: 0.08, clearcoat: 1 })), -0.095, 0, 0, { parent: head });
  lens.rotation.z = Math.PI / 2;
  const ring = add(new THREE.Mesh(new THREE.TorusGeometry(0.019, 0.0025, 8, 32), glow(PAL.red, 2.2)), -0.106, 0, 0, { parent: head, cast: false });
  ring.rotation.y = Math.PI / 2;

  // ---------------- teclado
  const kb = new THREE.Group();
  kb.position.set(KB.x, TY, KB.z); kb.rotation.y = KB.ry;
  scene.add(kb);
  const kbT = new THREE.Group();
  kbT.rotation.x = 0.06;
  kb.add(kbT);
  add(new THREE.Mesh(new RoundedBoxGeometry(0.445, 0.02, 0.152, 2, 0.006), metal(0x17191c, 0.5, 0.6)), 0, 0.012, 0, { parent: kbT });
  const backMat = new THREE.MeshBasicMaterial({ color: 0x000000 });
  const back = add(new THREE.Mesh(new THREE.PlaneGeometry(0.43, 0.142), backMat), 0, 0.0225, 0, { parent: kbT, cast: false, receive: false });
  back.rotation.x = -Math.PI / 2;
  const U = 0.0285;
  const ROWS = [
    [1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 2],
    [1.5, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1.5],
    [1.75, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 2.25],
    [2.25, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 2.75],
    [1.25, 1.25, 1.25, 6.25, 1.25, 1.25, 1.25, 1.25],
  ];
  const keys = [];
  ROWS.forEach((row, r) => {
    let acc = 0;
    for (const kw of row) {
      const space = r === 4 && kw > 6;
      keys.push({ x: -7.5 * U + (acc + kw / 2) * U, z: (r - 2) * U, w: kw * U - 0.0042, typing: (kw === 1 && r < 4) || space, space });
      acc += kw;
    }
  });
  const keyInst = new THREE.InstancedMesh(new RoundedBoxGeometry(1, 1, 1, 2, 0.16), new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.55, metalness: 0.15 }), keys.length);
  keyInst.castShadow = true; keyInst.receiveShadow = true;
  kbT.add(keyInst);
  const TYPE = keys.map((k, i) => (k.typing && !k.space ? i : -1)).filter((i) => i >= 0);
  const SPACE = keys.findIndex((k) => k.space);
  const keyOf = (n) => (hash(n, 41) < 0.16 ? SPACE : TYPE[Math.floor(hash(n, 42) * TYPE.length)]);
  const RATE = 17;
  const keyCol = keys.map((k) => new THREE.Color(k.typing ? '#26292d' : '#1a1c1f'));
  const RED = new THREE.Color(0.78, 0.2, 0.24);
  // cabo do teclado até o emissor
  const cable = new THREE.CatmullRomCurve3([
    new THREE.Vector3(KB.x - 0.05, TY + 0.012, KB.z - 0.085),
    new THREE.Vector3(KB.x - 0.12, TY + 0.006, KB.z - 0.24),
    new THREE.Vector3(EMIT.x + 0.08, TY + 0.006, EMIT.w / 2 + 0.16),
    new THREE.Vector3(EMIT.x + 0.12, TY + 0.06, EMIT.w / 2 + 0.004),
  ]);
  add(new THREE.Mesh(new THREE.TubeGeometry(cable, 48, 0.0055, 8), metal(0x0d0e10, 0.6, 0.1)), 0, 0, 0);

  // ---------------- trava + fechadura com o encaixe
  const bar = add(new THREE.Mesh(new THREE.BoxGeometry(BAR.t, BAR.h, BAR.w), metal(0x25282d, 0.4, 0.6)), BAR.x, 0, BAR.z);
  const barStripMat = glow(PAL.red, 0);
  add(new THREE.Mesh(new THREE.BoxGeometry(BAR.t + 0.004, 0.012, BAR.w - 0.05), barStripMat), 0, BAR.h / 2 - 0.03, 0, { parent: bar, cast: false });
  const BAR_UP = TY - 0.02 + BAR.h / 2, BAR_DOWN = TY - 0.006 - BAR.h / 2;
  add(new THREE.Mesh(new RoundedBoxGeometry(LOCK.s, LOCK.h, LOCK.s, 3, 0.014), metal(0x1d2024, 0.45, 0.55)), LOCK.x, TY + LOCK.h / 2, LOCK.z);
  const lockLedMat = glow(PAL.red, 0);
  add(new THREE.Mesh(new THREE.BoxGeometry(0.30, 0.012, 0.004), lockLedMat), LOCK.x, TY + LOCK.h - 0.07, LOCK.z + LOCK.s / 2 + 0.002, { cast: false });
  const shape = pieceShape();
  const slotMat = new THREE.MeshBasicMaterial({ map: canvasTexture(slotCanvas(shape)), transparent: true, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2 });
  const slotPl = add(new THREE.Mesh(new THREE.PlaneGeometry(1.7 * PIECE_S, 1.7 * PIECE_S), slotMat), LOCK.x, TY + LOCK.h + 0.0008, LOCK.z, { cast: false });
  slotPl.rotation.x = -Math.PI / 2;

  // ---------------- a peça (assinatura gravada)
  const pg = new THREE.ExtrudeGeometry(shape, { depth: 0.14, bevelEnabled: true, bevelThickness: 0.03, bevelSize: 0.03, bevelSegments: 3, curveSegments: 20 });
  {
    const pos = pg.attributes.position, uv = pg.attributes.uv;
    for (let i = 0; i < pos.count; i++) uv.setXY(i, (pos.getX(i) + 0.85) / 1.7, (pos.getY(i) + 0.85) / 1.7);
  }
  pg.rotateX(-Math.PI / 2);
  pg.translate(0, -0.07, 0);
  const pc = pieceCanvases(shape);
  const capMat = new THREE.MeshPhysicalMaterial({ map: canvasTexture(pc.base), emissiveMap: canvasTexture(pc.glow), emissive: new THREE.Color(1, 0.8, 0.5), emissiveIntensity: 0, roughness: 0.32, metalness: 0.15, clearcoat: 0.8, clearcoatRoughness: 0.2 });
  const sideMat = new THREE.MeshPhysicalMaterial({ color: 0x4c0f17, roughness: 0.38, metalness: 0.2, clearcoat: 0.6 });
  const piece = new THREE.Mesh(pg, [capMat, sideMat]);
  piece.scale.setScalar(PIECE_S);
  piece.castShadow = true; piece.receiveShadow = true;
  scene.add(piece);

  // ---------------- luzes
  scene.add(new THREE.HemisphereLight(0x8a95a0, 0x0c0a09, 0.06));
  function spot(color, intensity, p, q, angle, penumbra, shadow) {
    const l = new THREE.SpotLight(color, intensity, 0, angle, penumbra, 2);
    l.position.set(...p); l.target.position.set(...q);
    if (shadow) {
      l.shadow.mapSize.set(1024, 1024);
      l.shadow.camera.near = 0.5; l.shadow.camera.far = 4.5;
      l.shadow.bias = -0.0004; l.shadow.radius = 3; l.shadow.blurSamples = 12;
    }
    scene.add(l, l.target);
    return l;
  }
  const keyA = spot(0xffe0bd, 60, [SCAN_X + 0.5, 2.25, 1.1], [SCAN_X, TY, 0], 0.55, 0.7, true);
  const keyB = spot(0xffd6a4, 50, [-2.35, 2.05, 1.45], [-2.6, TY, 0.35], 0.55, 0.7, true);
  const keyC = spot(0xffd9b0, 52, [2.15, 2.25, 0.85], [2.45, TY + 0.3, -0.35], 0.55, 0.7, true);
  spot(0xff2a3a, 22, [0.2, 1.6, -2.6], [0, TY, 0], 0.9, 0.9, false);
  spot(0x9fb0c4, 6, [1.5, 1.3, 3.2], [0, TY, 0], 0.9, 1.0, false);

  const pos = new THREE.Vector3(), quat = new THREE.Quaternion(), scl = new THREE.Vector3(), mtx = new THREE.Matrix4(), UP = new THREE.Vector3(0, 1, 0), col = new THREE.Color();

  function keyDepth(k, t) {
    if (t < T.auto || t > T.typeEnd + 0.2) return 0;
    let d = 0;
    const n1 = Math.floor((Math.min(t, T.typeEnd) - T.auto) * RATE);
    for (let n = Math.max(0, n1 - 2); n <= n1; n++) {
      if (keyOf(n) !== k) continue;
      const a = t - (T.auto + n / RATE);
      if (a < 0) continue;
      d = Math.max(d, a < 0.018 ? a / 0.018 : Math.max(0, 1 - (a - 0.018) / 0.07));
    }
    return d;
  }

  function update(t) {
    beltTex.offset.x = -belt(t) / RIB;

    // ordens
    const xs = orderX(t);
    let inside = 0, blink = 0;
    ORDERS.forEach((o, k) => {
      const x = xs[k];
      if (shown(x)) {
        pos.set(x, BY + ORD.h / 2, o.z); quat.setFromAxisAngle(UP, o.ry); scl.set(1, 1, 1);
        inside = Math.max(inside, clamp(1 - Math.abs(x - SCAN_X) / 0.2));
      } else { pos.set(0, -5, 0); scl.set(0, 0, 0); }
      mtx.compose(pos, quat, scl); ordInst.setMatrixAt(k, mtx);
      pos.y += ORD.h / 2 + 0.0008;
      mtx.compose(pos, quat, scl); topInst.setMatrixAt(k, mtx);
      blink = Math.max(blink, env(t, o.tSpawn, o.tSpawn + 0.01, o.tSpawn + 0.06, o.tSpawn + 0.12, E.linear, E.linear));
    });
    ordInst.instanceMatrix.needsUpdate = true; topInst.instanceMatrix.needsUpdate = true;
    setGlow(ledMat, PAL.red, 0.25 + 2.4 * blink);

    // portal: a luz acende quando uma ordem está dentro dele
    scanLight.intensity = 0.5 + 2.6 * E.inOut(inside);
    sheetMat.uniforms.uI.value = 0.55 + 0.8 * inside;
    sheetMat.uniforms.uT.value = t;
    head.rotation.set(0, 0.30 * Math.sin(t * 1.85 + 0.6), 0.62 + 0.05 * Math.sin(t * 1.3));

    // teclado: parado, depois as teclas descem sozinhas
    keys.forEach((k, i) => {
      const d = keyDepth(i, t);
      pos.set(k.x, 0.0295 - 0.0055 * d, k.z); quat.identity(); scl.set(k.w, 0.012, U - 0.0042);
      mtx.compose(pos, quat, scl); keyInst.setMatrixAt(i, mtx);
      col.copy(keyCol[i]).lerp(RED, d); keyInst.setColorAt(i, col);
    });
    keyInst.instanceMatrix.needsUpdate = true; keyInst.instanceColor.needsUpdate = true;
    const kbOn = tw(t, T.auto - 0.04, T.auto + 0.08, E.linear) * (1 - 0.6 * tw(t, T.typeEnd, T.typeEnd + 0.6));
    setGlow(backMat, PAL.red, 1.3 * kbOn * (0.88 + 0.12 * Math.sin(t * 31)));
    back.visible = kbOn > 0;

    // trava sobe (fora de quadro) e acende; o encaixe vazio pisca em "última peça"
    bar.visible = t >= T.close;
    bar.position.y = lerp(BAR_DOWN, BAR_UP, spring(t, T.close, 3.2, 0.62));
    const fl = (t0) => (t < t0 ? 0 : t < t0 + 0.05 ? 0.6 : t < t0 + 0.09 ? 0.1 : 1);
    setGlow(barStripMat, PAL.red, 2.2 * fl(T.close + 0.18));
    const pulse = (t >= T.slot && t < T.slot + 0.12) || (t >= T.slot + 0.24 && t < T.slot + 0.36) ? 1 : 0;
    setGlow(lockLedMat, PAL.red, 2.0 * fl(T.close + 0.25) * (1 + 0.8 * pulse));
    slotMat.color.setScalar(1 + 0.6 * tw(t, T.close, T.close + 0.3) + 1.6 * pulse);

    // a peça desce, gira até alinhar e para logo acima do encaixe
    piece.visible = t > T.piece - 0.02;
    piece.position.set(LOCK.x, pieceY(t), LOCK.z);
    piece.rotation.set(0.5 * (1 - tw(t, T.piece, T.piece + 0.7, E.out)), 1.1 * (1 - tw(t, T.piece, T.piece + 0.85, E.out)), 0);
    capMat.emissiveIntensity = 1.6 * tw(t, T.sign + 0.12, T.sign + 0.42, E.out) * (t < T.sign + 0.2 ? 0.4 : 1);

    // sombras só das luzes que aparecem no quadro
    keyA.castShadow = t < 9.4;
    keyB.castShadow = t > 3.3 && t < 8.6;
    keyC.castShadow = t > 7.8;

    const cam = cameraAt(t);
    camera.fov = cam.f; camera.updateProjectionMatrix();
    aimCamera(camera, cam.p, cam.q, t, 0.8);

    const inB = tw(t, 0, 0.45, E.outQuart);
    return { blur: 16 * (1 - inB), comp: { alpha3d: 1, exposure: 1 + 0.4 * (1 - inB) } };
  }

  // ---------------- UI 2D (presa aos objetos)
  const scr = (x, y, z) => project({ x, y, z }, camera);
  const STY = {
    teal: { color: PAL.tealBright, border: '#6FA597', fill: 'rgba(40,72,66,0.24)' },
    gray: { color: PAL.offWhite, border: PAL.boxStroke, fill: 'rgba(24,27,30,0.55)' },
    red: {},
    gold: { color: '#E2C493', border: PAL.gold, fill: 'rgba(120,92,52,0.22)' },
  };
  function tag(ctx, t, fi, { a, dx, dy, text, t0, out = Infinity, sty, seed, below = null }) {
    if (t < t0 || t > out + 0.2 || a.behind) return null;
    setFont(ctx, FONTS.mono, 26, 700);
    const w = Math.round(measure(ctx, text, 5.5) + 64), h = 58;
    let x = clamp(a.x + dx, 150, W - 150 - w), y = clamp(a.y + dy, 250, H - 230 - h);
    if (below) { x = below.x; y = below.y + below.h + 16; }   // empilhada embaixo de outra etiqueta
    const alpha = 1 - tw(t, out, out + 0.16, E.inOut);
    labelBox(ctx, t, fi, { x, y, w, h, text, t0, seed, alpha, ...STY[sty] });
    return { x, y, w, h, alpha };
  }
  function checkMark(ctx, x, y, s, color, lw) {
    ctx.strokeStyle = color; ctx.lineWidth = lw; ctx.lineCap = 'round'; ctx.lineJoin = 'round';
    ctx.beginPath(); ctx.moveTo(x - s * 0.26, y); ctx.lineTo(x - s * 0.06, y + s * 0.2); ctx.lineTo(x + s * 0.28, y - s * 0.22); ctx.stroke();
  }
  function badge(ctx, x, y, s, a, pop) {
    if (a <= 0 || pop <= 0) return;
    ctx.save(); ctx.globalAlpha *= a; ctx.translate(x, y); ctx.scale(pop, pop);
    ctx.shadowColor = 'rgba(0,0,0,0.5)'; ctx.shadowBlur = 8; ctx.shadowOffsetY = 3;
    ctx.fillStyle = 'rgba(28,52,47,0.82)'; ctx.beginPath(); ctx.roundRect(-s / 2, -s / 2, s, s, 6); ctx.fill();
    ctx.shadowColor = 'transparent';
    ctx.strokeStyle = '#8FC9BA'; ctx.lineWidth = 2.5; ctx.stroke();
    checkMark(ctx, 0, 0, s, '#CFF5EA', 4);
    ctx.restore();
  }
  function loopIcon(ctx, x, y, r, t, a) {
    if (a <= 0) return;
    ctx.save(); ctx.globalAlpha *= a; ctx.translate(x, y); ctx.rotate(t * 2 * Math.PI * 0.9);
    ctx.strokeStyle = PAL.red; ctx.fillStyle = PAL.red; ctx.lineWidth = 4.5; ctx.lineCap = 'round';
    ctx.beginPath(); ctx.arc(0, 0, r, 0, Math.PI * 1.6); ctx.stroke();
    const ex = r * Math.cos(Math.PI * 1.6), ey = r * Math.sin(Math.PI * 1.6);
    ctx.translate(ex, ey); ctx.rotate(Math.PI * 1.6 + Math.PI / 2);
    ctx.beginPath(); ctx.moveTo(9, 0); ctx.lineTo(-6, -8); ctx.lineTo(-6, 8); ctx.closePath(); ctx.fill();
    ctx.restore();
  }

  function ui(ctx, t, fi) {
    // ✓ sobre cada ordem que acabou de atravessar o portal
    const xs = orderX(t);
    ORDERS.forEach((o, k) => {
      const x = xs[k];
      if (t < o.tPass || t > o.tPass + 1.45 || !shown(x)) return;
      const s = scr(x, BY + ORD.h + 0.012, o.z);
      if (s.behind) return;
      const a = env(t, o.tPass, o.tPass + 0.06, o.tPass + 1.0, o.tPass + 1.45, E.linear, E.inOut);
      badge(ctx, s.x, s.y - 36, 40, a, E.outBack(tw(t, o.tPass, o.tPass + 0.24, E.linear)));
    });

    const aS = scr(SCAN_X, TY + 0.74, -0.40);
    const L1 = tag(ctx, t, fi, { a: aS, dx: 60, dy: -20, text: 'SISTEMAS DE DETECÇÃO', t0: SW.sistema, out: 3.62, sty: 'teal', seed: 21 });
    const L2 = L1 && tag(ctx, t, fi, { a: aS, below: L1, text: 'NENHUMA INVASÃO', t0: SW.via, out: 3.62, sty: 'teal', seed: 22 });
    if (L2) {
      ctx.save(); ctx.globalAlpha *= L2.alpha * tw(t, SW.via + 0.1, SW.via + 0.3, E.out);
      checkMark(ctx, L2.x - 34, L2.y + L2.h / 2, 40, PAL.tealBright, 5);
      ctx.restore();
    }

    const aK = scr(KB.x + 0.20, TY + 0.03, KB.z - 0.07);
    tag(ctx, t, fi, { a: aK, dx: 40, dy: -170, text: 'NINGUÉM DIGITANDO', t0: SW.ninguem, out: 6.62, sty: 'gray', seed: 23 });
    const L4 = tag(ctx, t, fi, { a: aK, dx: 40, dy: -170, text: 'AUTOMÁTICO', t0: SW.automatico, out: 8.10, sty: 'red', seed: 24 });
    if (L4) loopIcon(ctx, L4.x - 40, L4.y + L4.h / 2, 17, t, L4.alpha * tw(t, SW.automatico + 0.05, SW.automatico + 0.25, E.out));

    const aL = scr(LOCK.x + 0.22, TY + LOCK.h, LOCK.z + 0.1);
    tag(ctx, t, fi, { a: aL, dx: 40, dy: -30, text: 'A ÚLTIMA PEÇA', t0: SW.ultima, out: 10.84, sty: 'red', seed: 25 });
    const aP = scr(LOCK.x + 0.2, pieceY(t), LOCK.z);
    tag(ctx, t, fi, { a: aP, dx: 40, dy: -40, text: 'A ASSINATURA', t0: SW.assinatura + 0.02, sty: 'gold', seed: 26 });
  }

  // ---------------- motion blur adaptativo (quanto os pontos andam na tela no obturador)
  const probeCam = new THREE.PerspectiveCamera(34, W / H, 0.02, 60);
  const STATIC = [
    [PL.x0, TY, PL.z0], [PL.x1, TY, PL.z0], [PL.x1, TY, PL.z1], [PL.x0, TY, PL.z1],
    [SCAN_X, TY + 0.77, 0], [SCAN_X, TY, 0.4], [EMIT.x, TY + EMIT.h, 0], [KB.x - 0.2, TY + 0.03, KB.z], [KB.x + 0.2, TY + 0.03, KB.z],
    [LOCK.x, TY + LOCK.h, LOCK.z], [BAR.x, BY + 0.3, 0],
  ];
  function probes(t) {
    const pts = STATIC.slice();
    const xs = orderX(t);
    ORDERS.forEach((o, k) => { if (k % 2 === 0 && shown(xs[k])) pts.push([xs[k], BY + ORD.h, o.z]); });
    if (t > T.piece - 0.05) pts.push([LOCK.x, pieceY(t), LOCK.z]);
    return pts;
  }
  const pv = new THREE.Vector3();
  function projectAll(t) {
    const c = cameraAt(t);
    probeCam.fov = c.f; probeCam.updateProjectionMatrix();
    probeCam.position.set(c.p[0], c.p[1], c.p[2]); probeCam.up.set(0, 1, 0);
    probeCam.lookAt(c.q[0], c.q[1], c.q[2]); probeCam.updateMatrixWorld(true);
    return probes(t).map(([x, y, z]) => { pv.set(x, y, z).project(probeCam); return { x: (pv.x * 0.5 + 0.5) * W, y: (-pv.y * 0.5 + 0.5) * H, ok: pv.z < 1 }; });
  }
  function samples(t) {
    const h = 0.25 / 24;
    const A = projectAll(t - h), B = projectAll(t + h);
    let m = 0;
    const inside = (q) => q.x > -150 && q.x < W + 150 && q.y > -150 && q.y < H + 150;
    A.forEach((a, i) => {
      const b = B[i];
      if (!a.ok || !b.ok || (!inside(a) && !inside(b))) return;
      m = Math.max(m, Math.hypot(b.x - a.x, b.y - a.y));
    });
    let n = Math.ceil(m / 2.0);
    if (t < 0.45) n = Math.max(n, 4);   // entrada desfocada
    return clamp(n, 2, 16);
  }

  return { scene, camera, update, ui, samples };
}
