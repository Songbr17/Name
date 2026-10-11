// 20,4 s – fim (3D): "É como se uma única empresa guardasse na mesma sala o
// carimbo oficial de dezenas de bancos diferentes. Não uma cópia, o carimbo
// que vale. E a maior cliente da C&M era a BMP Money Plus, uma provedora de
// Banking as a Service, que fornecia a infraestrutura bancária de 92 fintechs,
// 210 fundos de investimento e centenas de outras empresas."
//
// Um único mundo 3D, com uma câmera contínua:
//  • a sala: mesa sob uma luminária pendente com 24 carimbos de madeira (um
//    por banco); a luz acende piscando, a câmera entra, a "cópia" aparece e é
//    riscada e o carimbo verdadeiro é levantado e bate no papel (VÁLIDO);
//  • a grua sai da sala (que vira a caixa "C&M SOFTWARE"), segue o cabo até a
//    plataforma da BMP, onde a infraestrutura acende e sobem 92 fintechs,
//    210 fundos e centenas de outras empresas.
import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { W, H, PAL, FONTS, fq } from '../../core/config.js';
import { E, tw, spring, clamp, lerp, env } from '../../core/ease.js';
import { hash, fbm1 } from '../../core/rand.js';
import { studioEnv, project, aimCamera, canvasTexture, additive, contactShadow } from '../../core/three-utils.js';
import { drawLine, drawPolyline, node, withAlpha, underline, shadowOn, shadowOff, labelBox } from '../../core/draw.js';
import { decode, setFont, drawSegs, measure } from '../../core/text.js';
import { woodCanvas, stampLabelCanvas, paperCanvas, sealCanvas, gridCanvas } from './world-textures.js';
import { CW } from './words.js';

export const WT = {
  start: 20.40,
  lamp: 20.50,                 // luminária acende (pisca)
  room: CW.guardasse,          // 22.28 a caixa da sala se desenha
  sala: CW.sala,               // 23.32 "MESMA SALA"
  oficial: CW.carimbo,         // 24.06
  bancos: CW.dezenas2,         // 25.02
  copia: CW.nao,               // 27.02
  lift: CW.carimbo2 - 0.12,    // 27.96
  hit: CW.vale,                // 28.58
  up: 28.80,
  crane: CW.e_a_maior,         // 29.24
  cable: 29.70,
  bmp: CW.bmp,                 // 31.14
  baas: CW.banking,            // 33.52
  infra: CW.infraestrutura,    // 35.42
  fint: CW.n92,                // 36.58
  fund: CW.n210,               // 38.18
  other: CW.centenas,          // 40.30
};

const TOP = 0.78;
const ROOM = { x0: -1.55, x1: 1.55, z0: -1.3, z1: 1.3, h: 2.45 };
const GRID = { cols: 6, rows: 4, px: 0.104, pz: 0.098, cx: -0.075, cz: -0.08 };
const OFF = 21;                                  // índice do carimbo "oficial" (fileira da frente)
const PAPER = { x: 0.24, z: 0.255, ry: -0.17, w: 0.148, h: 0.21 };
const BMP = { x: 9.0, z: -7.0, s: 7.0, h: 0.42 };
const BASE_R = 0.025, BASE_H = 0.02, FOAM_H = 0.003, RUB_H = 0.003;
const STAMP_H = RUB_H + FOAM_H + BASE_H + 0.0758;

// ------------------------------------------------------------ câmera
// Spline de Hermite pelas chaves (movimento contínuo, sem "para e anda");
// chaves com hold:true param (velocidade zero = easy ease do AE).
const BX = BMP.x, BZ = BMP.z;
const KEYS = [
  { t: 20.40, p: [4.30, 3.30, 6.40], q: [0.05, 0.95, -0.05], f: 34, hold: true },
  { t: 23.80, p: [3.55, 2.80, 5.30], q: [0.00, 0.92, -0.03], f: 34 },
  { t: 25.00, p: [0.80, 1.50, 1.36], q: [-0.05, 0.80, -0.04], f: 34 },
  { t: 26.40, p: [0.66, 1.41, 1.21], q: [-0.03, 0.80, -0.02], f: 34 },
  { t: 27.30, p: [0.36, 1.03, 0.66], q: [0.04, 0.80, 0.13], f: 33, hold: true },
  { t: 28.30, p: [0.33, 0.99, 0.58], q: [0.15, 0.79, 0.22], f: 32 },
  { t: 29.20, p: [0.31, 0.96, 0.53], q: [0.18, 0.785, 0.25], f: 31, hold: true },
  { t: 30.90, p: [4.20, 6.60, 6.60], q: [3.00, 0.40, -2.20], f: 38 },
  { t: 32.80, p: [BX - 7.6, 5.6, BZ + 9.4], q: [BX - 0.3, 0.6, BZ], f: 36, hold: true },
  { t: 40.20, p: [BX - 7.0, 5.9, BZ + 9.0], q: [BX - 0.1, 0.8, BZ], f: 36 },
  { t: 41.90, p: [BX - 9.8, 8.4, BZ + 12.8], q: [BX + 0.2, 0.9, BZ], f: 37, hold: true },
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

// ------------------------------------------------------------ materiais auxiliares
function floorPoolMaterial(color) {
  return additive(new THREE.ShaderMaterial({
    uniforms: { uPos: { value: new THREE.Vector3() }, uDir: { value: new THREE.Vector3(0, -1, 0) }, uCos: { value: new THREE.Vector2(0.8, 0.93) }, uColor: { value: new THREE.Color(color) }, uPower: { value: 0 } },
    vertexShader: `varying vec3 vW; void main(){ vec4 w = modelMatrix * vec4(position,1.0); vW = w.xyz; gl_Position = projectionMatrix * viewMatrix * w; }`,
    fragmentShader: /* glsl */`
      uniform vec3 uPos, uDir, uColor; uniform vec2 uCos; uniform float uPower; varying vec3 vW;
      void main(){
        vec3 d = vW - uPos; float r2 = dot(d, d); vec3 n = d / sqrt(r2);
        float cone = smoothstep(uCos.x, uCos.y, dot(n, normalize(uDir)));
        gl_FragColor = vec4(uColor * uPower * cone * max(0.0, -n.y) / r2, 0.0);
      }`,
  }));
}

function hazeCone(h, r, color) {
  const geo = new THREE.ConeGeometry(r, h, 48, 1, true);
  geo.translate(0, -h / 2, 0); // ápice na origem
  const mat = additive(new THREE.ShaderMaterial({
    uniforms: { uColor: { value: new THREE.Color(color) }, uI: { value: 0 }, uH: { value: h } },
    vertexShader: /* glsl */`
      uniform float uH; varying vec3 vN; varying vec3 vV; varying float vY;
      void main(){
        vec4 w = modelMatrix * vec4(position, 1.0);
        vN = normalize(mat3(modelMatrix) * normal); vV = normalize(cameraPosition - w.xyz); vY = -position.y / uH;
        gl_Position = projectionMatrix * viewMatrix * w;
      }`,
    fragmentShader: /* glsl */`
      uniform vec3 uColor; uniform float uI; varying vec3 vN; varying vec3 vV; varying float vY;
      void main(){
        float f = abs(dot(normalize(vN), normalize(vV)));
        float a = pow(f, 2.2) * (1.0 - smoothstep(0.45, 1.0, vY)) * smoothstep(0.0, 0.1, vY);
        gl_FragColor = vec4(uColor * uI * a, 0.0);
      }`,
    side: THREE.DoubleSide,
  }));
  return new THREE.Mesh(geo, mat);
}

function ghostMaterial() {
  return additive(new THREE.ShaderMaterial({
    uniforms: { uA: { value: 0 }, uColor: { value: new THREE.Color(0.55, 0.68, 0.8) } },
    vertexShader: `varying vec3 vN; varying vec3 vV; void main(){ vec4 w = modelMatrix*vec4(position,1.0); vN = normalize(mat3(modelMatrix)*normal); vV = normalize(cameraPosition - w.xyz); gl_Position = projectionMatrix*viewMatrix*w; }`,
    fragmentShader: `uniform float uA; uniform vec3 uColor; varying vec3 vN; varying vec3 vV;
      void main(){ float f = 1.0 - abs(dot(normalize(vN), normalize(vV))); float a = 0.12 + pow(f, 2.0) * 0.9;
        float scan = 0.75 + 0.25 * step(0.5, fract(gl_FragCoord.y * 0.25));
        gl_FragColor = vec4(uColor * a * scan * uA, 0.0); }`,
    side: THREE.DoubleSide,
  }));
}

function gridMaterial(tex) {
  return additive(new THREE.ShaderMaterial({
    uniforms: { tGrid: { value: tex }, uR: { value: 0 }, uI: { value: 0 }, uColor: { value: new THREE.Color(PAL.tealBright) } },
    vertexShader: `varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix*modelViewMatrix*vec4(position,1.0); }`,
    fragmentShader: /* glsl */`
      uniform sampler2D tGrid; uniform float uR, uI; uniform vec3 uColor; varying vec2 vUv;
      void main(){
        float g = texture2D(tGrid, vUv).r;
        float d = length(vUv - 0.5) * 1.414;
        float front = smoothstep(uR, uR - 0.08, d);
        float edge = smoothstep(0.06, 0.0, abs(d - uR)) * step(d, uR + 0.01);
        gl_FragColor = vec4(uColor * (g * (0.35 * front + 1.6 * edge)) * uI, 0.0);
      }`,
  }));
}

// ------------------------------------------------------------ cena
export function createWorld(renderer) {
  const scene = new THREE.Scene();
  scene.environment = studioEnv(renderer);
  scene.environmentIntensity = 0.18;
  const camera = new THREE.PerspectiveCamera(34, W / H, 0.02, 80);

  // ---------------- mesa
  const tableTex = canvasTexture(woodCanvas(31, { w: 1024, h: 512, base: '#2A201A', dark: 'rgba(0,0,0,0.35)', light: 'rgba(255,200,150,0.05)', rings: 40 }));
  const tableMat = new THREE.MeshPhysicalMaterial({ map: tableTex, roughness: 0.48, clearcoat: 0.3, clearcoatRoughness: 0.3 });
  const tableTop = new THREE.Mesh(new RoundedBoxGeometry(1.5, 0.04, 0.86, 3, 0.008), tableMat);
  tableTop.position.set(0, TOP - 0.02, 0);
  tableTop.receiveShadow = true; tableTop.castShadow = true;
  scene.add(tableTop);
  const legMat = new THREE.MeshStandardMaterial({ color: 0x18191b, metalness: 0.7, roughness: 0.45 });
  for (const [sx, sz] of [[-1, -1], [1, -1], [1, 1], [-1, 1]]) {
    const leg = new THREE.Mesh(new THREE.BoxGeometry(0.036, TOP - 0.04, 0.036), legMat);
    leg.position.set(sx * 0.69, (TOP - 0.04) / 2, sz * 0.37);
    leg.castShadow = true;
    scene.add(leg);
  }
  const tableShadow = contactShadow(1.9, 1.25, 0.8, 0.45);
  tableShadow.position.set(0, 0.001, 0);
  scene.add(tableShadow);

  // ---------------- carimbos
  const prof = [
    [0.0001, 0], [0.0106, 0], [0.0106, 0.0035], [0.0094, 0.0075], [0.0078, 0.014], [0.0068, 0.024],
    [0.0070, 0.031], [0.0084, 0.039], [0.0118, 0.047], [0.0148, 0.055], [0.0156, 0.0605], [0.0146, 0.0665],
    [0.0112, 0.0715], [0.0062, 0.0748], [0.0001, 0.0758],
  ].map(([r, y]) => new THREE.Vector2(r, y));
  const handleGeo = new THREE.LatheGeometry(prof, 40);
  const baseGeo = new THREE.CylinderGeometry(BASE_R, BASE_R, BASE_H, 48);
  const foamGeo = new THREE.CylinderGeometry(BASE_R - 0.0008, BASE_R - 0.0008, FOAM_H, 40);
  const rubGeo = new THREE.CylinderGeometry(BASE_R - 0.0016, BASE_R - 0.0016, RUB_H, 40);
  const labelGeo = new THREE.CircleGeometry(BASE_R - 0.0028, 40);
  const baseTex = canvasTexture(woodCanvas(7, { w: 512, h: 128, base: '#B98C5B', rings: 18 }));
  const baseMat = new THREE.MeshStandardMaterial({ map: baseTex, roughness: 0.55 });
  const foamMat = new THREE.MeshStandardMaterial({ color: 0x55534e, roughness: 0.95 });
  const rubMat = new THREE.MeshStandardMaterial({ color: 0x3a1517, roughness: 0.85 });
  const HANDLE = ['#1E2B42', '#141618', '#6E4B2E', '#2C4637', '#8A6A2C', '#3A3E44', '#5B1C38', '#22343F', '#4A2A22', '#2B2E33', '#5F2125', '#33402C'];

  function makeStamp(i, color) {
    const g = new THREE.Group();
    const rub = new THREE.Mesh(rubGeo, rubMat); rub.position.y = RUB_H / 2;
    const foam = new THREE.Mesh(foamGeo, foamMat); foam.position.y = RUB_H + FOAM_H / 2;
    const base = new THREE.Mesh(baseGeo, baseMat); base.position.y = RUB_H + FOAM_H + BASE_H / 2;
    const lab = new THREE.Mesh(labelGeo, new THREE.MeshStandardMaterial({ map: canvasTexture(stampLabelCanvas(i)), roughness: 0.75 }));
    lab.rotation.x = -Math.PI / 2; lab.position.y = RUB_H + FOAM_H + BASE_H + 0.0003;
    const hmat = new THREE.MeshPhysicalMaterial({ color, roughness: 0.34, clearcoat: 0.7, clearcoatRoughness: 0.18 });
    const handle = new THREE.Mesh(handleGeo, hmat); handle.position.y = RUB_H + FOAM_H + BASE_H;
    for (const m of [rub, foam, base, handle]) { m.castShadow = true; m.receiveShadow = true; }
    lab.receiveShadow = true;
    g.add(rub, foam, base, lab, handle);
    g.userData = { rub, handle };
    return g;
  }

  const stamps = [];
  for (let r = 0; r < GRID.rows; r++) {
    for (let c = 0; c < GRID.cols; c++) {
      const i = r * GRID.cols + c;
      const off = i === OFF;
      const color = off ? '#8C1F2A' : HANDLE[Math.floor(hash(i, 3) * HANDLE.length)];
      const g = makeStamp(i, color);
      // posição "posta à mão": pequenos desvios e giros
      const x = GRID.cx + (c - (GRID.cols - 1) / 2) * GRID.px + (hash(i, 5) - 0.5) * 0.012;
      const z = GRID.cz + (r - (GRID.rows - 1) / 2) * GRID.pz + (hash(i, 6) - 0.5) * 0.012;
      g.position.set(x, TOP, z);
      g.rotation.y = (hash(i, 7) - 0.5) * 0.9;
      scene.add(g);
      stamps.push({ g, x, z, ry: g.rotation.y, i });
    }
  }
  const official = stamps[OFF];

  // "cópia" (holograma) ao lado do oficial
  const ghostMat = ghostMaterial();
  const ghost = makeStamp(OFF, '#8C1F2A');
  ghost.traverse((o) => { if (o.isMesh) { o.material = ghostMat; o.castShadow = false; o.receiveShadow = false; } });
  ghost.position.set(official.x - 0.135, TOP, official.z + 0.11);
  ghost.rotation.y = 0.3;
  ghost.visible = false;
  scene.add(ghost);

  // ---------------- papel + impressão
  const paperGroup = new THREE.Group();
  paperGroup.position.set(PAPER.x, TOP, PAPER.z);
  paperGroup.rotation.y = PAPER.ry;
  const paper = new THREE.Mesh(new THREE.PlaneGeometry(PAPER.w, PAPER.h), new THREE.MeshStandardMaterial({ map: canvasTexture(paperCanvas()), roughness: 0.92 }));
  paper.rotation.x = -Math.PI / 2; paper.position.y = 0.0006; paper.receiveShadow = true;
  const sealMat = new THREE.MeshStandardMaterial({ map: canvasTexture(sealCanvas()), transparent: true, opacity: 0, roughness: 0.6, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -2 });
  const seal = new THREE.Mesh(new THREE.PlaneGeometry(0.047, 0.047), sealMat);
  seal.rotation.x = -Math.PI / 2; seal.rotation.z = 0.12;
  const SEAL_LOCAL = new THREE.Vector3(0.006, 0.0009, 0.064);
  seal.position.copy(SEAL_LOCAL);
  seal.receiveShadow = true;
  paperGroup.add(paper, seal);
  scene.add(paperGroup);
  paperGroup.updateMatrixWorld(true);
  const P1 = paperGroup.localToWorld(SEAL_LOCAL.clone());
  // onde o carimbo é pousado depois (ao lado do papel)
  const P2 = new THREE.Vector3(P1.x + 0.105, TOP, P1.z - 0.02);

  // ---------------- luminária
  const shadeProf = [[0.215, 0], [0.205, 0.012], [0.15, 0.09], [0.08, 0.17], [0.05, 0.205], [0.018, 0.215]].map(([r, y]) => new THREE.Vector2(r, y));
  const shade = new THREE.Mesh(new THREE.LatheGeometry(shadeProf, 48), new THREE.MeshStandardMaterial({ color: 0x141414, metalness: 0.65, roughness: 0.38, side: THREE.DoubleSide }));
  const LAMP_Y = 1.60;
  shade.position.set(0, LAMP_Y, -0.02);
  const bulbMat = new THREE.MeshBasicMaterial({ color: new THREE.Color(1.0, 0.86, 0.66) });
  const bulb = new THREE.Mesh(new THREE.SphereGeometry(0.032, 24, 16), bulbMat);
  bulb.position.set(0, LAMP_Y + 0.045, -0.02);
  const cord = new THREE.Mesh(new THREE.CylinderGeometry(0.0035, 0.0035, 1.2, 8), new THREE.MeshStandardMaterial({ color: 0x0c0c0c, roughness: 0.6 }));
  cord.position.set(0, LAMP_Y + 0.215 + 0.6, -0.02);
  scene.add(shade, bulb, cord);

  const lamp = new THREE.SpotLight(0xffd6a4, 0, 0, 0.66, 0.55, 2);
  lamp.position.set(0, LAMP_Y + 0.02, -0.02);
  lamp.target.position.set(0, TOP, -0.02);
  lamp.castShadow = true;
  lamp.shadow.mapSize.set(1024, 1024);
  lamp.shadow.camera.near = 0.3; lamp.shadow.camera.far = 3;
  lamp.shadow.bias = -0.0004; lamp.shadow.radius = 3; lamp.shadow.blurSamples = 12;
  scene.add(lamp, lamp.target);
  const roomRim = new THREE.SpotLight(0xff2a3a, 0, 0, 0.5, 0.8, 2);
  roomRim.position.set(-1.3, 1.35, -1.4); roomRim.target.position.set(0, TOP + 0.05, 0);
  scene.add(roomRim, roomRim.target);
  const roomFill = new THREE.SpotLight(0x9fb0c4, 0, 0, 0.7, 1.0, 2);
  roomFill.position.set(1.6, 1.4, 2.2); roomFill.target.position.set(0, TOP, 0);
  scene.add(roomFill, roomFill.target);
  const hemi = new THREE.HemisphereLight(0x8a95a0, 0x0c0a09, 0.05);
  scene.add(hemi);

  const lampPoolMat = floorPoolMaterial(0xffd2a0);
  const lampPool = new THREE.Mesh(new THREE.PlaneGeometry(6, 6), lampPoolMat);
  lampPool.rotation.x = -Math.PI / 2; lampPool.position.set(0, 0.0015, 0);
  scene.add(lampPool);
  const haze = hazeCone(LAMP_Y - TOP + 0.02, 0.78, 0xffd8ac);
  haze.position.set(0, LAMP_Y, -0.02);
  scene.add(haze);

  // ---------------- plataforma da BMP
  const slabMat = new THREE.MeshStandardMaterial({ color: 0x1a1d21, roughness: 0.74, metalness: 0.18 });
  const slab = new THREE.Mesh(new RoundedBoxGeometry(BMP.s, BMP.h, BMP.s, 4, 0.04), slabMat);
  slab.position.set(BX, BMP.h / 2, BZ);
  slab.receiveShadow = true; slab.castShadow = true;
  scene.add(slab);
  const edgeMat = new THREE.MeshBasicMaterial({ color: new THREE.Color(PAL.tealBright).multiplyScalar(0) });
  const e = 0.014, hs = BMP.s / 2 - 0.02;
  for (const [x, z, w, d] of [[0, hs, BMP.s - 0.06, e], [0, -hs, BMP.s - 0.06, e], [hs, 0, e, BMP.s - 0.06], [-hs, 0, e, BMP.s - 0.06]]) {
    const m = new THREE.Mesh(new THREE.BoxGeometry(w, e, d), edgeMat);
    m.position.set(BX + x, BMP.h + 0.001, BZ + z);
    scene.add(m);
  }
  const gridMat = gridMaterial(canvasTexture(gridCanvas(25), { srgb: false }));
  const grid = new THREE.Mesh(new THREE.PlaneGeometry(BMP.s - 0.1, BMP.s - 0.1), gridMat);
  grid.rotation.x = -Math.PI / 2; grid.position.set(BX, BMP.h + 0.0015, BZ);
  scene.add(grid);
  const slabShadow = contactShadow(BMP.s + 1.8, BMP.s + 1.8, 0.85, 0.22);
  slabShadow.position.set(BX, 0.001, BZ);
  scene.add(slabShadow);

  // blocos (instâncias): 92 fintechs, 210 fundos, o resto "outras empresas"
  const N = 25, PITCH = 0.26;
  const cells = [];
  for (let i = 0; i < N; i++) for (let j = 0; j < N; j++) {
    const x = BX + (i - (N - 1) / 2) * PITCH, z = BZ + (j - (N - 1) / 2) * PITCH;
    const d = Math.hypot(x - BX, z - BZ) + (hash(i, j, 21) - 0.5) * 0.32;
    cells.push({ x, z, d, i, j });
  }
  cells.sort((a, b) => a.d - b.d);
  const GROUPS = {
    fint: { n: 92, t0: WT.fint + 0.04, spread: 0.85, color: new THREE.Color('#4E7A70'), h: [0.55, 0.8] },
    fund: { n: 210, t0: WT.fund + 0.04, spread: 1.05, color: new THREE.Color('#B29165'), h: [0.26, 0.36] },
    other: { n: cells.length - 302, t0: WT.other + 0.02, spread: 1.05, color: new THREE.Color('#5D6166'), h: [0.09, 0.24] },
  };
  let k = 0;
  const blocks = [];
  for (const [name, gdef] of Object.entries(GROUPS)) {
    for (let q = 0; q < gdef.n; q++, k++) {
      const c = cells[k];
      const hh = gdef.h[0] + hash(c.i, c.j, 33) * gdef.h[1];
      const fw = name === 'fund' ? 0.15 : 0.19;
      blocks.push({ ...c, g: name, h: hh, w: fw, t0: gdef.t0 + gdef.spread * Math.pow(q / gdef.n, 0.9) });
    }
  }
  const blockMat = new THREE.MeshStandardMaterial({ roughness: 0.5, metalness: 0.12 });
  const blockGeo = new THREE.BoxGeometry(1, 1, 1); blockGeo.translate(0, 0.5, 0);
  const inst = new THREE.InstancedMesh(blockGeo, blockMat, blocks.length);
  inst.castShadow = true; inst.receiveShadow = true;
  blocks.forEach((b, i) => inst.setColorAt(i, GROUPS[b.g].color));
  inst.instanceColor.needsUpdate = true;
  inst.frustumCulled = false;
  scene.add(inst);

  const bmpKey = new THREE.SpotLight(0xdfe8f2, 0, 0, 0.6, 0.6, 2);
  bmpKey.position.set(BX - 3, 10.5, BZ + 5); bmpKey.target.position.set(BX, BMP.h, BZ);
  bmpKey.shadow.mapSize.set(2048, 2048);
  bmpKey.shadow.camera.near = 5; bmpKey.shadow.camera.far = 20;
  bmpKey.shadow.bias = -0.0006; bmpKey.shadow.radius = 2; bmpKey.shadow.blurSamples = 8;
  scene.add(bmpKey, bmpKey.target);
  const bmpRim = new THREE.SpotLight(0xff2a3a, 0, 0, 0.6, 0.8, 2);
  bmpRim.position.set(BX + 7, 3.6, BZ - 8); bmpRim.target.position.set(BX, 0.6, BZ);
  scene.add(bmpRim, bmpRim.target);
  const bmpPoolMat = floorPoolMaterial(0xdfe8f2);
  const bmpPool = new THREE.Mesh(new THREE.PlaneGeometry(22, 22), bmpPoolMat);
  bmpPool.rotation.x = -Math.PI / 2; bmpPool.position.set(BX, 0.0012, BZ);
  scene.add(bmpPool);

  // ------------------------------------------------------------ animação
  const mtx = new THREE.Matrix4(), quat = new THREE.Quaternion(), pos = new THREE.Vector3(), scl = new THREE.Vector3();

  // carimbo oficial: levanta, viaja até o papel, bate, levanta e é pousado ao lado
  function stampPos(t) {
    const lift = tw(t, WT.lift, WT.lift + 0.22, E.out);
    const move = tw(t, WT.lift + 0.1, WT.hit - 0.12, E.inOut);
    const down = tw(t, WT.hit - 0.12, WT.hit, E.inQuad);
    const up = tw(t, WT.up, WT.up + 0.26, E.out);
    const settle = tw(t, WT.up + 0.42, WT.up + 1.05, E.inOut);
    const x0 = lerp(official.x, P1.x, move), z0 = lerp(official.z, P1.z, move);
    const x = lerp(x0, P2.x, settle), z = lerp(z0, P2.z, settle);
    let y = TOP + 0.085 * lift * (1 - down) + 0.06 * up * (1 - settle);
    if (t >= WT.hit && t < WT.up) y -= 0.0007; // borracha comprimida
    return [x, y, z];
  }

  let shakeT = WT.hit;
  function cameraAt(t) {
    const p = hermite(KEYS, t, (k) => k.p);
    const q = hermite(KEYS, t, (k) => k.q);
    const f = hermite(KEYS, t, (k) => [k.f])[0];
    // o operador acompanha o carimbo enquanto ele viaja até o papel
    const track = 0.55 * env(t, WT.lift - 0.05, WT.lift + 0.3, WT.hit + 0.15, WT.up + 0.6, E.inOut, E.inOut);
    if (track > 0) {
      const sp = stampPos(t);
      q[0] = lerp(q[0], sp[0], track); q[1] = lerp(q[1], sp[1] + 0.05, track); q[2] = lerp(q[2], sp[2], track);
    }
    // tremida curta no impacto do carimbo
    const a = t - shakeT;
    if (a > 0) q[1] += Math.exp(-a * 18) * Math.sin(a * 2 * Math.PI * 13) * 0.0035;
    return { p, q, f };
  }

  function update(t, fi) {
    // luminária acende piscando (lâmpada velha)
    const L0 = WT.lamp;
    const flick = t < L0 ? 0 : t < L0 + 0.05 ? 0.5 : t < L0 + 0.1 ? 0.05 : t < L0 + 0.15 ? 0.8 : t < L0 + 0.19 ? 0.25 : t < L0 + 0.26 ? 0.92 : 1;
    const dimRoom = 1 - 0.55 * tw(t, 31.0, 32.6, E.inOut);
    lamp.intensity = 7.2 * flick * dimRoom;
    roomRim.intensity = 1.7 * tw(t, L0 + 0.2, L0 + 0.8, E.inOut);
    roomFill.intensity = 0.55 * tw(t, L0 + 0.2, L0 + 0.8, E.inOut);
    bulbMat.color.setRGB(1.0 * (0.2 + 7 * flick), 0.86 * (0.2 + 7 * flick), 0.66 * (0.2 + 7 * flick));
    haze.material.uniforms.uI.value = 0.085 * flick * dimRoom;
    lampPoolMat.uniforms.uPos.value.copy(lamp.position);
    lampPoolMat.uniforms.uDir.value.copy(lamp.target.position).sub(lamp.position);
    lampPoolMat.uniforms.uCos.value.set(Math.cos(0.9), Math.cos(0.35));
    lampPoolMat.uniforms.uPower.value = 0.045 * flick * dimRoom;
    lamp.castShadow = t < 31.5;

    // carimbo oficial + papel
    const sp = stampPos(t);
    official.g.position.set(sp[0], sp[1], sp[2]);
    // inclinação pela aceleração (como se fosse segurado pela mão)
    const dt = 1 / 48;
    const a = stampPos(t - dt), b = stampPos(t + dt);
    const ax = (b[0] - 2 * sp[0] + a[0]) / (dt * dt), az = (b[2] - 2 * sp[2] + a[2]) / (dt * dt);
    official.g.rotation.set(clamp(az * 0.006, -0.16, 0.16), official.ry + 0.25 * tw(t, WT.lift, WT.hit - 0.12, E.inOut), clamp(-ax * 0.006, -0.16, 0.16));
    const pressed = t >= WT.hit && t < WT.up;
    official.g.userData.rub.scale.y = pressed ? 0.75 : 1;
    sealMat.opacity = t >= WT.hit ? 1 : 0;
    shakeT = WT.hit;

    // cópia: pisca ao entrar e se desfaz em glitch
    const ga = t >= WT.copia + 0.02 && t < 27.78;
    ghost.visible = ga;
    if (ga) {
      const f = Math.floor((t - WT.copia) * 24);
      const on = f < 1 ? 0.4 : f < 2 ? 1 : f < 3 ? 0.6 : 1;
      const out = t > 27.55 ? (Math.floor(t * 24) % 2 ? 0.15 : 0.7) * (1 - tw(t, 27.55, 27.78, E.linear)) : 1;
      ghostMat.uniforms.uA.value = on * out;
    }

    // BMP
    const bmpOn = tw(t, 30.4, 31.2, E.inOut);
    bmpKey.intensity = 520 * bmpOn;
    bmpKey.castShadow = t > 30.2;
    bmpRim.intensity = 38 * bmpOn;
    bmpPoolMat.uniforms.uPos.value.copy(bmpKey.position);
    bmpPoolMat.uniforms.uDir.value.copy(bmpKey.target.position).sub(bmpKey.position);
    bmpPoolMat.uniforms.uCos.value.set(Math.cos(0.75), Math.cos(0.3));
    bmpPoolMat.uniforms.uPower.value = 2.2 * bmpOn;
    // bordas acendem em "BMP" (pisca 2x)
    const e0 = WT.bmp;
    const ef = t < e0 ? 0 : t < e0 + 0.04 ? 0.6 : t < e0 + 0.08 ? 0.1 : t < e0 + 0.12 ? 1 : 1;
    edgeMat.color.set(PAL.tealBright).multiplyScalar(2.2 * ef);
    // grade da infraestrutura varre a partir do centro
    gridMat.uniforms.uR.value = lerp(0, 1.05, tw(t, WT.infra - 0.1, WT.infra + 1.0, E.inOut));
    gridMat.uniforms.uI.value = tw(t, WT.infra - 0.1, WT.infra + 0.1, E.linear) * (1 - 0.35 * tw(t, WT.fint, WT.fint + 0.6, E.inOut));
    // blocos sobem com stagger do centro para fora (mola com leve overshoot)
    const anyBlock = t > WT.fint - 0.1;
    inst.visible = anyBlock;
    if (anyBlock) {
      blocks.forEach((bk, i) => {
        const s = spring(t, bk.t0, 2.0, 0.6);
        const sy = Math.max(0.0001, s) * bk.h;
        const sxz = bk.w * (0.55 + 0.45 * clamp(s));
        pos.set(bk.x, BMP.h, bk.z); scl.set(sxz, sy, sxz); quat.identity();
        mtx.compose(pos, quat, scl);
        inst.setMatrixAt(i, mtx);
      });
      inst.instanceMatrix.needsUpdate = true;
    }

    const cam = cameraAt(t);
    camera.fov = cam.f; camera.updateProjectionMatrix();
    aimCamera(camera, cam.p, cam.q, t, t > 32.5 ? 1.6 : 0.8);

    const inB = tw(t, WT.start, WT.start + 0.45, E.outQuart);
    return {
      blur: 16 * (1 - inB),
      comp: { alpha3d: 1, exposure: 1 + 0.4 * (1 - inB) },
    };
  }

  // ------------------------------------------------------------ UI 2D
  const v3 = (x, y, z) => new THREE.Vector3(x, y, z);
  const P = (x, y, z) => project(v3(x, y, z), camera);

  // caixa da sala (como a caixa de transformação, em 3D): arestas crescem
  // dos cantos, com alças nos vértices
  function roomBox(ctx, t, fi) {
    const p = tw(t, WT.room, WT.room + 0.7, E.outQuart);
    const out = 1 - tw(t, 24.25, 24.7, E.inOut);
    const back = tw(t, WT.crane + 0.9, WT.crane + 1.5, E.inOut) * (1 - tw(t, 32.2, 32.8, E.inOut));
    const A = Math.max(p * out, back);
    if (A <= 0.001) return;
    const { x0, x1, z0, z1, h } = ROOM;
    const c = [[x0, 0, z0], [x1, 0, z0], [x1, 0, z1], [x0, 0, z1], [x0, h, z0], [x1, h, z0], [x1, h, z1], [x0, h, z1]].map(([x, y, z]) => P(x, y, z));
    if (c.some((s) => s.behind)) return;
    const edges = [[0, 1], [1, 2], [2, 3], [3, 0], [4, 5], [5, 6], [6, 7], [7, 4], [0, 4], [1, 5], [2, 6], [3, 7]];
    const lp = Math.max(p, back);
    withAlpha(ctx, A, () => {
      ctx.save();
      shadowOn(ctx, { color: 'rgba(0,0,0,0.45)', blur: 6, x: 2, y: 3 });
      ctx.strokeStyle = PAL.frame; ctx.lineWidth = 2;
      ctx.beginPath();
      for (const [a, b] of edges) {
        const mx = (c[a].x + c[b].x) / 2, my = (c[a].y + c[b].y) / 2;
        ctx.moveTo(c[a].x, c[a].y); ctx.lineTo(lerp(c[a].x, mx, lp), lerp(c[a].y, my, lp));
        ctx.moveTo(c[b].x, c[b].y); ctx.lineTo(lerp(c[b].x, mx, lp), lerp(c[b].y, my, lp));
      }
      ctx.stroke();
      shadowOff(ctx);
      for (const s of c) {
        const hs = 12;
        ctx.fillStyle = '#202325'; ctx.fillRect(s.x - hs / 2, s.y - hs / 2, hs, hs);
        ctx.strokeStyle = PAL.frame; ctx.strokeRect(s.x - hs / 2, s.y - hs / 2, hs, hs);
      }
      ctx.restore();
    });
    // rótulo preso ao canto de cima mais à esquerda que esteja dentro do quadro
    const tops = [c[4], c[5], c[6], c[7]].filter((s) => s.x > 120 && s.x < W - 500 && s.y > 230 && s.y < H - 200);
    const tl = tops.sort((a, b) => (a.x + a.y * 0.5) - (b.x + b.y * 0.5))[0];
    if (t < 25 && tl) {
      labelBox(ctx, t, fi, { x: tl.x + 18, y: tl.y - 84, w: 330, h: 64, text: 'MESMA SALA', t0: WT.sala, size: 26, ls: 6, seed: 801, alpha: out });
    }
    if (back > 0.01) {
      const tag = c[4];
      withAlpha(ctx, back, () => {
        const d = decode('C&M SOFTWARE', t, WT.crane + 1.0, { cps: 26, seed: 802, fi });
        setFont(ctx, FONTS.type, 34);
        drawSegs(ctx, [{ text: d.text, color: '#E2E4E4' }], tag.x, tag.y - 26, { ls: 4, shadow: { color: 'rgba(0,0,0,0.6)', blur: 6, x: 2, y: 3 } });
      });
    }
  }

  // carimbo oficial: callout com linha guia
  function oficialTag(ctx, t, fi) {
    const A = env(t, WT.oficial, WT.oficial + 0.05, 26.2, 26.5, E.linear, E.linear);
    if (A <= 0) return;
    const s = P(official.x, TOP + STAMP_H + 0.004, official.z);
    const lx = s.x - 430, ly = s.y - 250;
    withAlpha(ctx, A, () => {
      const lp = tw(t, WT.oficial, WT.oficial + 0.3, E.outQuart);
      drawLine(ctx, s.x, s.y, lerp(s.x, lx + 380, lp), lerp(s.y, ly + 14, lp), 1, { color: PAL.redBox, width: 2 });
      node(ctx, s.x, s.y, 10, PAL.redBox, 1);
      if (lp >= 1) {
        const d = decode('CARIMBO OFICIAL', t, WT.oficial + 0.2, { cps: 26, seed: 810, fi });
        setFont(ctx, FONTS.mono, 30, 700);
        drawSegs(ctx, [{ text: d.text, color: PAL.white }], lx + 380, ly, { ls: 4, align: 'right', shadow: { color: 'rgba(0,0,0,0.6)', blur: 6, x: 2, y: 3 } });
        underline(ctx, lx + 380 - measure(ctx, 'CARIMBO OFICIAL', 4), lx + 384, ly + 14, tw(t, WT.oficial + 0.3, WT.oficial + 0.7, E.outQuart), { color: PAL.redBox, lw: 2 });
      }
    });
  }

  // "dezenas de bancos diferentes": colchetes em cada carimbo, em onda
  function bankMarks(ctx, t, fi) {
    const A = env(t, WT.bancos - 0.02, WT.bancos + 0.05, 26.75, 27.0, E.linear, E.linear);
    if (A <= 0) return;
    const order = stamps.map((s) => ({ s, k: s.x * 1.2 - s.z })).sort((a, b) => a.k - b.k);
    withAlpha(ctx, A, () => {
      order.forEach(({ s }, n) => {
        const t0 = WT.bancos + n * (1 / 24) * 0.8;
        const p = tw(t, t0, t0 + 0.18, E.outQuart);
        if (p <= 0) return;
        const c = P(s.x, TOP + STAMP_H * 0.5, s.z);
        const top = P(s.x, TOP + STAMP_H + 0.004, s.z);
        const hh = Math.max(24, (c.y - top.y) * 2.2), ww = hh * 0.8;
        const l = 10 * p;
        ctx.save();
        ctx.strokeStyle = s.i === OFF ? PAL.redBox : '#B9BBBC'; ctx.lineWidth = 2;
        const x0 = c.x - ww / 2, y0 = c.y - hh / 2, x1 = c.x + ww / 2, y1 = c.y + hh / 2;
        ctx.beginPath();
        ctx.moveTo(x0, y0 + l); ctx.lineTo(x0, y0); ctx.lineTo(x0 + l, y0);
        ctx.moveTo(x1 - l, y0); ctx.lineTo(x1, y0); ctx.lineTo(x1, y0 + l);
        ctx.moveTo(x1, y1 - l); ctx.lineTo(x1, y1); ctx.lineTo(x1 - l, y1);
        ctx.moveTo(x0 + l, y1); ctx.lineTo(x0, y1); ctx.lineTo(x0, y1 - l);
        ctx.stroke();
        ctx.restore();
      });
      // rótulo lateral (sem número: a narração fala em "dezenas")
      const d1 = decode('DEZENAS DE', t, WT.bancos + 0.05, { cps: 30, seed: 820, fi });
      const d2 = decode('BANCOS', t, CW.bancos - 0.04, { cps: 24, seed: 821, fi });
      setFont(ctx, FONTS.mono, 26, 700);
      drawSegs(ctx, [{ text: d1.text, color: '#B9BBBC' }], 200, 1040, { ls: 6 });
      setFont(ctx, FONTS.typeIt, 92);
      drawSegs(ctx, [{ text: d2.text, color: PAL.white }], 196, 1136, { ls: 3, shadow: { color: 'rgba(0,0,0,0.6)', blur: 6, x: 3, y: 4 } });
      const d3 = decode('DIFERENTES', t, CW.diferentes - 0.02, { cps: 26, seed: 822, fi });
      setFont(ctx, FONTS.mono, 26, 700);
      drawSegs(ctx, [{ text: d3.text, color: PAL.red }], 200, 1188, { ls: 6, glow: { color: PAL.red, blur: 10, alpha: 0.3 } });
    });
  }

  // "Não uma cópia, o carimbo que vale."
  function copyTags(ctx, t, fi) {
    if (t >= WT.copia && t < 27.9) {
      const g = P(ghost.position.x, TOP + STAMP_H + 0.006, ghost.position.z);
      const A = 1 - tw(t, 27.62, 27.85, E.linear);
      withAlpha(ctx, A, () => {
        const lx = g.x - 300, ly = g.y - 120;
        drawLine(ctx, g.x, g.y, lx + 210, ly + 12, tw(t, WT.copia, WT.copia + 0.18, E.outQuart), { color: '#8A8D91', width: 2 });
        node(ctx, g.x, g.y, 9, '#8A8D91', 1);
        const d = decode('CÓPIA', t, WT.copia + 0.1, { cps: 22, seed: 830, fi });
        setFont(ctx, FONTS.mono, 34, 700);
        const r = drawSegs(ctx, [{ text: d.text, color: '#B9BBBC' }], lx + 200, ly, { ls: 6, align: 'right', shadow: { color: 'rgba(0,0,0,0.6)', blur: 6, x: 2, y: 3 } });
        // risco vermelho
        const sp = tw(t, CW.copia + 0.06, CW.copia + 0.3, E.outQuart);
        if (sp > 0) { ctx.fillStyle = PAL.red; ctx.fillRect(r.x0 - 8, ly - 12, (r.width + 16) * sp, 4); }
      });
    }
    if (t >= CW.carimbo2 - 0.04 && t < WT.crane + 0.5) {
      const A = 1 - tw(t, WT.crane, WT.crane + 0.4, E.linear);
      const lx = 190, ly = 1020;
      withAlpha(ctx, A, () => {
        const d1 = decode('O CARIMBO', t, CW.carimbo2 - 0.04, { cps: 26, seed: 840, fi });
        const d2 = decode('QUE VALE', t, CW.vale - 0.12, { cps: 26, seed: 841, fi });
        setFont(ctx, FONTS.typeIt, 70);
        ctx.save(); shadowOn(ctx, { color: 'rgba(0,0,0,0.6)', blur: 6, x: 3, y: 4 });
        drawSegs(ctx, [{ text: d1.text, color: PAL.white }], lx, ly, { ls: 2 });
        drawSegs(ctx, [{ text: d2.text, color: PAL.red }], lx, ly + 84, { ls: 2, glow: { color: PAL.red, blur: 14, alpha: 0.35 } });
        ctx.restore();
        setFont(ctx, FONTS.typeIt, 70); ctx.letterSpacing = '2px';
        const w2 = measure(ctx, 'QUE VALE', 2);
        underline(ctx, lx, lx + w2, ly + 106, tw(t, CW.vale + 0.1, CW.vale + 0.5, E.outQuart), { color: PAL.gold, lw: 3 });
      });
    }
  }

  // cabo C&M -> BMP (no chão), com pulsos vermelhos
  const CABLE = [[ROOM.x1, 0.02, -0.6], [3.9, 0.02, -0.6], [3.9, 0.02, BZ + 1.2], [BX - BMP.s / 2, 0.02, BZ + 1.2]];
  function cable(ctx, t) {
    const p = tw(t, WT.cable, WT.cable + 0.9, E.inOut);
    if (p <= 0) return;
    const A = 1 - tw(t, 33.6, 34.2, E.inOut);
    if (A <= 0) return;
    const pts = CABLE.map(([x, y, z]) => P(x, y, z));
    if (pts.some((s) => s.behind)) return;
    withAlpha(ctx, A, () => {
      drawPolyline(ctx, pts.map((s) => [s.x, s.y]), p, { color: PAL.redBox, width: 2.5 });
      node(ctx, pts[0].x, pts[0].y, 11, PAL.redBox, 1);
      if (p >= 1) node(ctx, pts[3].x, pts[3].y, 11, PAL.redBox, 1);
      // pulsos
      for (let j = 0; j < 3; j++) {
        const q = tw(t, WT.cable + 0.5 + j * 0.35, WT.cable + 1.5 + j * 0.35, E.inOut);
        if (q <= 0 || q >= 1) continue;
        const seg = []; let tot = 0;
        for (let i = 1; i < pts.length; i++) { const l = Math.hypot(pts[i].x - pts[i - 1].x, pts[i].y - pts[i - 1].y); seg.push(l); tot += l; }
        let d = tot * q, i = 1;
        while (i < pts.length - 1 && d > seg[i - 1]) { d -= seg[i - 1]; i++; }
        const u = d / seg[i - 1];
        const x = lerp(pts[i - 1].x, pts[i].x, u), y = lerp(pts[i - 1].y, pts[i].y, u);
        ctx.save(); ctx.shadowColor = PAL.red; ctx.shadowBlur = 16;
        node(ctx, x, y, 12, '#FF6A74', 1);
        ctx.restore();
      }
    });
  }

  // BMP: rótulos e contadores
  function bmpLabels(ctx, t, fi) {
    if (t < WT.bmp - 0.1) return;
    const hs2 = BMP.s / 2;
    const corner = [[-1, -1], [1, -1], [1, 1], [-1, 1]].map(([a, b]) => P(BX + a * hs2, BMP.h, BZ + b * hs2)).sort((a, b) => a.x - b.x)[0];
    const lx = 190, ly = 470;
    const A = 1;
    withAlpha(ctx, A, () => {
      // linha guia do rótulo até a quina da plataforma
      const lp = tw(t, WT.bmp, WT.bmp + 0.35, E.outQuart);
      const ex = lx + 520, ey = ly + 22;
      drawLine(ctx, corner.x, corner.y, lerp(corner.x, ex, lp), lerp(corner.y, ey, lp), 1, { color: '#8A8D91', width: 2 });
      node(ctx, corner.x, corner.y, 10, PAL.tealBright, 1);
      const d = decode('BMP MONEY PLUS', t, WT.bmp + 0.05, { cps: 24, seed: 850, fi });
      setFont(ctx, FONTS.type, 58);
      drawSegs(ctx, [{ text: d.text, color: PAL.white }], lx, ly, { ls: 4, shadow: { color: 'rgba(0,0,0,0.65)', blur: 6, x: 3, y: 4 } });
      setFont(ctx, FONTS.type, 58); ctx.letterSpacing = '4px';
      underline(ctx, lx, lx + measure(ctx, 'BMP MONEY PLUS', 4), ly + 20, tw(t, WT.bmp + 0.3, WT.bmp + 0.8, E.outQuart), { color: PAL.gold, lw: 3 });
      const d2 = decode('MAIOR CLIENTE DA C&M', t, CW.bmp + 0.35, { cps: 30, seed: 851, fi });
      setFont(ctx, FONTS.mono, 24, 700);
      drawSegs(ctx, [{ text: d2.text, color: PAL.red }], lx, ly + 66, { ls: 5, glow: { color: PAL.red, blur: 10, alpha: 0.3 } });
      labelBox(ctx, t, fi, { x: lx, y: ly + 104, w: 470, h: 64, text: 'BANKING AS A SERVICE', t0: WT.baas - 0.02, size: 24, ls: 5, seed: 852, color: PAL.tealBright, border: PAL.teal, fill: 'rgba(78,111,104,0.18)' });
      const d3 = decode('INFRAESTRUTURA BANCÁRIA', t, WT.infra, { cps: 30, seed: 853, fi });
      setFont(ctx, FONTS.mono, 20, 500);
      drawSegs(ctx, [{ text: d3.text, color: '#7E8285' }], lx, ly + 214, { ls: 5 });
    });
  }

  const LEG = [
    { g: 'fint', t0: WT.fint, n: 92, label: 'FINTECHS', y: 470, color: '#5E9187', dur: 0.75 },
    { g: 'fund', t0: WT.fund, n: 210, label: 'FUNDOS DE INVESTIMENTO', y: 720, color: PAL.gold, dur: 0.9 },
    { g: 'other', t0: WT.other, n: 0, label: 'DE OUTRAS EMPRESAS', word: 'CENTENAS', y: 970, color: '#8B9096', dur: 0.6 },
  ];
  function legend(ctx, t, fi) {
    const lx = 1830;
    for (const L of LEG) {
      if (t < L.t0 - 0.02) continue;
      // bloco representativo do grupo (o mais alto à frente-direita)
      const cand = blocks.filter((b) => b.g === L.g);
      let best = cand[0], bs = -Infinity;
      for (const b of cand) { const sc = b.x - BX - (b.z - BZ) * 0.2 + (b.z - BZ) * 0.9; if (sc > bs) { bs = sc; best = b; } }
      const s = spring(t, best.t0, 2.0, 0.6);
      const anchor = P(best.x, BMP.h + best.h * Math.max(0, s), best.z);
      const lp = tw(t, L.t0, L.t0 + 0.32, E.outQuart);
      ctx.save();
      drawLine(ctx, anchor.x, anchor.y, lerp(anchor.x, lx - 24, lp), lerp(anchor.y, L.y - 40, lp), 1, { color: '#5A5D61', width: 2 });
      node(ctx, anchor.x, anchor.y, 9, L.color, 1);
      ctx.fillStyle = L.color; ctx.fillRect(lx - 34, L.y - 50, 20, 20);
      ctx.restore();
      ctx.save();
      shadowOn(ctx, { color: 'rgba(0,0,0,0.75)', blur: 4, x: 5, y: 6 });
      setFont(ctx, FONTS.big, 128);
      ctx.letterSpacing = '1px';
      ctx.fillStyle = PAL.white;
      if (L.word) {
        const d = decode(L.word, t, L.t0, { cps: 22, seed: 860, fi });
        ctx.fillText(d.text, lx, L.y);
      } else {
        const c = Math.round(L.n * tw(fq(t), L.t0 + 0.02, L.t0 + L.dur, E.outQuart));
        ctx.fillText(String(c), lx, L.y);
      }
      ctx.restore();
      const d = decode(L.label, t, L.t0 + 0.15, { cps: 30, seed: 870 + L.n, fi });
      setFont(ctx, FONTS.mono, 24, 700);
      drawSegs(ctx, [{ text: d.text, color: '#B9BBBC' }], lx + 4, L.y + 44, { ls: 5 });
    }
  }

  function ui(ctx, t, fi) {
    roomBox(ctx, t, fi);
    oficialTag(ctx, t, fi);
    bankMarks(ctx, t, fi);
    copyTags(ctx, t, fi);
    cable(ctx, t);
    bmpLabels(ctx, t, fi);
    legend(ctx, t, fi);
  }

  // Motion blur adaptativo: mede quanto pontos de referência (mesa, carimbo,
  // caixa da sala, plataforma, topo dos blocos) andam na tela durante o
  // obturador e usa sub-quadros suficientes para o rastro ficar contínuo.
  const probeCam = new THREE.PerspectiveCamera(34, W / H, 0.02, 80);
  const STATIC = [
    [-0.75, TOP, -0.43], [0.75, TOP, -0.43], [0.75, TOP, 0.43], [-0.75, TOP, 0.43], [0, LAMP_Y, -0.02],
    [ROOM.x0, 0, ROOM.z0], [ROOM.x1, 0, ROOM.z0], [ROOM.x1, 0, ROOM.z1], [ROOM.x0, 0, ROOM.z1],
    [ROOM.x0, ROOM.h, ROOM.z0], [ROOM.x1, ROOM.h, ROOM.z0], [ROOM.x1, ROOM.h, ROOM.z1], [ROOM.x0, ROOM.h, ROOM.z1],
    [BX - 3.5, BMP.h, BZ - 3.5], [BX + 3.5, BMP.h, BZ - 3.5], [BX + 3.5, BMP.h, BZ + 3.5], [BX - 3.5, BMP.h, BZ + 3.5],
    ...stamps.filter((_, i) => i % 5 === 0).map((st) => [st.x, TOP + STAMP_H, st.z]),
  ];
  const probeBlocks = blocks.filter((_, i) => i % 23 === 0);
  function probes(t) {
    const sp = stampPos(t);
    const pts = STATIC.map((p) => p);
    pts.push([sp[0], sp[1] + STAMP_H, sp[2]], [sp[0], sp[1], sp[2]]);
    for (const bk of probeBlocks) pts.push([bk.x, BMP.h + bk.h * Math.max(0, spring(t, bk.t0, 2.0, 0.6)), bk.z]);
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
    A.forEach((a, i) => {
      const b = B[i];
      if (!a.ok || !b.ok) return;
      const inside = (q) => q.x > -150 && q.x < W + 150 && q.y > -150 && q.y < H + 150;
      if (!inside(a) && !inside(b)) return;
      m = Math.max(m, Math.hypot(b.x - a.x, b.y - a.y));
    });
    let n = Math.ceil(m / 2.0);
    if (t < WT.start + 0.45) n = Math.max(n, 4);   // entrada desfocada
    return clamp(n, 2, 20);
  }

  return { scene, camera, update, ui, samples };
}
