// CENA 3D 1 — "E quem abriu a porta / não foi um hacker" (39.92s – 42.13s)
// Porta de acesso escura no vazio, leitor de crachá que libera (LED vermelho ->
// teal), porta abrindo com peso real (mola amortecida), luz vermelha vazando
// pelo vão (luz volumétrica analítica), silhueta de "hacker" no vão que se
// desfaz em glitch, e um push-in de câmera atravessando a porta.
import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { W, H, PAL, FONTS, WORDS as Wd } from '../core/config.js';
import { E, tw, kf, spring, clamp, lerp, env } from '../core/ease.js';
import { hash } from '../core/rand.js';
import { studioEnv, project, aimCamera, canvasTexture, makeCanvas, holdoutMaterial, additive, contactShadow } from '../core/three-utils.js';
import { labelBox, drawLine, node, cornerBrackets, withAlpha, shadowOn } from '../core/draw.js';
import { decode, setFont, drawSegs } from '../core/text.js';

const OW = 0.92, OH = 2.05;         // vão da porta
const JW = 0.075, JD = 0.17;        // largura / profundidade do batente
const LEAF_W = OW - 0.012, LEAF_H = OH - 0.008, LEAF_T = 0.045;
const HINGE_X = -OW / 2 + 0.004;
const LIGHT_POS = new THREE.Vector3(0.05, 1.65, -2.7);

export const DOOR_T = {
  in0: 39.93, in1: 40.40,
  led: 40.20, latch: 40.24, swing: 40.40,
  hackLabel: 40.72, strike: 41.33, hackOut: 41.40,
  push0: 41.56, cut: 42.125,
};

// ---------------------------------------------------------------- shaders
const VIS_GLSL = /* glsl */`
uniform vec3 uL; uniform vec2 uOpen; uniform float uTheta, uHingeX, uLeafW, uLeafH, uSoft;
float doorVis(vec3 P){
  vec3 d = P - uL;
  if (abs(d.z) < 1e-5) return 0.0;
  float s = (0.0 - uL.z) / d.z;
  if (s <= 0.0 || s >= 1.0) return 0.0;
  vec3 Q = uL + d * s;
  float pen = uSoft * (1.0 / s - 1.0) + 0.003;
  float inX = smoothstep(-uOpen.x - pen, -uOpen.x + pen, Q.x) * (1.0 - smoothstep(uOpen.x - pen, uOpen.x + pen, Q.x));
  float inY = smoothstep(-pen, pen, Q.y) * (1.0 - smoothstep(uOpen.y - pen, uOpen.y + pen, Q.y));
  float vis = inX * inY;
  vec3 u = vec3(cos(uTheta), 0.0, -sin(uTheta));
  vec3 n = vec3(sin(uTheta), 0.0, cos(uTheta));
  vec3 H0 = vec3(uHingeX, 0.0, 0.0);
  float den = dot(n, d);
  if (abs(den) > 1e-5) {
    float s2 = dot(n, H0 - uL) / den;
    if (s2 > 0.0 && s2 < 1.0) {
      vec3 R = uL + d * s2;
      float a = dot(R - H0, u);
      float pen2 = uSoft * (1.0 / s2 - 1.0) + 0.003;
      float inA = smoothstep(-pen2, pen2, a) * (1.0 - smoothstep(uLeafW - pen2, uLeafW + pen2, a));
      float inB = smoothstep(0.012 - pen2, 0.012 + pen2, R.y) * (1.0 - smoothstep(uLeafH - pen2, uLeafH + pen2, R.y));
      vis *= 1.0 - inA * inB;
    }
  }
  return vis;
}
float hash13(vec3 p3){ p3 = fract(p3 * .1031); p3 += dot(p3, p3.zyx + 31.32); return fract((p3.x + p3.y) * p3.z); }
float vnoise(vec3 p){
  vec3 i = floor(p), f = fract(p); f = f*f*(3.0-2.0*f);
  return mix(mix(mix(hash13(i), hash13(i+vec3(1,0,0)), f.x), mix(hash13(i+vec3(0,1,0)), hash13(i+vec3(1,1,0)), f.x), f.y),
             mix(mix(hash13(i+vec3(0,0,1)), hash13(i+vec3(1,0,1)), f.x), mix(hash13(i+vec3(0,1,1)), hash13(i+vec3(1,1,1)), f.x), f.y), f.z);
}`;

function visUniforms() {
  return {
    uL: { value: LIGHT_POS.clone() }, uOpen: { value: new THREE.Vector2(OW / 2, OH) }, uTheta: { value: 0 },
    uHingeX: { value: -OW / 2 - 0.025 }, uLeafW: { value: OW + 0.05 }, uLeafH: { value: OH + 0.03 }, uSoft: { value: 0.035 },
  };
}

function floorLightMaterial() {
  return additive(new THREE.ShaderMaterial({
    uniforms: { ...visUniforms(), uColor: { value: new THREE.Color(1.0, 0.07, 0.09) }, uPower: { value: 0 } },
    vertexShader: `varying vec3 vW; void main(){ vec4 w = modelMatrix * vec4(position,1.0); vW = w.xyz; gl_Position = projectionMatrix * viewMatrix * w; }`,
    fragmentShader: VIS_GLSL + /* glsl */`
      uniform vec3 uColor; uniform float uPower; varying vec3 vW;
      void main(){
        vec3 P = vW; vec3 d = P - uL; float r2 = dot(d, d);
        float v = doorVis(P);
        float cosF = max(0.0, (uL.y - P.y) / sqrt(r2));
        float fade = (1.0 - smoothstep(3.5, 7.5, P.z)) * (1.0 - smoothstep(1.6, 3.2, abs(P.x)));
        float grain = 0.85 + 0.3 * vnoise(P * 9.0);
        vec3 c = uColor * uPower * v * cosF / r2 * fade * grain;
        gl_FragColor = vec4(c, 0.0);
      }`,
  }));
}

function hazeSliceMaterial() {
  return additive(new THREE.ShaderMaterial({
    side: THREE.DoubleSide,
    uniforms: { ...visUniforms(), uColor: { value: new THREE.Color(1.0, 0.08, 0.1) }, uDensity: { value: 0 }, uTime: { value: 0 } },
    vertexShader: `varying vec3 vW; void main(){ vec4 w = modelMatrix * vec4(position,1.0); vW = w.xyz; gl_Position = projectionMatrix * viewMatrix * w; }`,
    fragmentShader: VIS_GLSL + /* glsl */`
      uniform vec3 uColor; uniform float uDensity, uTime; varying vec3 vW;
      void main(){
        vec3 P = vW; vec3 d = P - uL; float r2 = dot(d, d);
        float v = doorVis(P);
        float n = vnoise(P * vec3(2.2, 1.4, 2.2) + vec3(uTime * 0.05, uTime * 0.11, 0.0));
        n = 0.45 + 0.9 * n * vnoise(P * 5.0 - vec3(0.0, uTime * 0.07, uTime * 0.03));
        float fade = (1.0 - smoothstep(1.2, 2.4, P.y)) * 0.6 + 0.4;
        vec3 c = uColor * uDensity * v * n * fade / (0.6 + r2);
        gl_FragColor = vec4(c, 0.0);
      }`,
  }));
}

function backWallMaterial() {
  return new THREE.ShaderMaterial({
    uniforms: { uInt: { value: 1 }, uTime: { value: 0 } },
    vertexShader: `varying vec3 vW; void main(){ vec4 w = modelMatrix * vec4(position,1.0); vW = w.xyz; gl_Position = projectionMatrix * viewMatrix * w; }`,
    fragmentShader: /* glsl */`
      uniform float uInt, uTime; varying vec3 vW;
      void main(){
        vec2 p = vW.xy - vec2(0.05, 1.05);
        float g = exp(-dot(p * vec2(0.75, 1.0), p * vec2(0.75, 1.0)) * 1.3);
        float core = exp(-dot(p * vec2(1.4, 1.1), p * vec2(1.4, 1.1)) * 3.0);
        vec3 red = vec3(1.0, 0.06, 0.075);
        vec3 c = red * (0.22 + 1.75 * g) + vec3(1.0, 0.17, 0.17) * core * 0.5;
        gl_FragColor = vec4(c * uInt, 1.0);
      }`,
  });
}

// Silhueta de "hacker" encapuzado, de corpo inteiro (plana), com halo vermelho de contraluz.
// Canvas 512x1024 = 0,9 m x 1,8 m (pés em y=1010).
function hackerTexture() {
  const c = makeCanvas(512, 1024);
  const g = c.getContext('2d');
  // contorno (lado direito do personagem = esquerda da imagem não importa: é silhueta)
  const R = [
    [256, 30], [286, 33], [312, 48], [326, 74], [330, 108], [326, 140], [316, 168], [308, 186],
    [340, 194], [372, 204], [392, 222], [400, 252], [405, 312], [409, 382], [404, 432], [392, 470],
    [381, 500], [379, 540], [373, 562], [360, 567], [352, 640], [346, 742], [340, 842], [334, 950],
    [347, 984], [349, 1004], [300, 1010], [290, 996], [288, 960], [284, 860], [278, 762], [272, 662],
    [264, 596],
  ];
  // lado esquerdo espelhado com leve assimetria (ombro mais baixo, perna mais aberta)
  const L = R.slice().reverse().map(([x, y]) => [512 - x - (y > 600 ? 6 : 0), y + (y > 180 && y < 260 ? 5 : 0)]);
  const pts = [...R, [256, 590], ...L.slice(0, -1)];
  const fig = new Path2D();
  const mid = (a, b) => [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2];
  let m0 = mid(pts[pts.length - 1], pts[0]);
  fig.moveTo(m0[0], m0[1]);
  for (let i = 0; i < pts.length; i++) {
    const p = pts[i], n = pts[(i + 1) % pts.length];
    const m = mid(p, n);
    fig.quadraticCurveTo(p[0], p[1], m[0], m[1]);
  }
  fig.closePath();
  g.save();
  g.shadowColor = 'rgba(255,70,80,1)'; g.shadowBlur = 26;
  g.fillStyle = '#050506'; g.fill(fig);
  g.shadowBlur = 8; g.shadowColor = 'rgba(255,120,120,0.9)'; g.fill(fig);
  g.restore();
  g.fillStyle = '#060607'; g.fill(fig);
  // abertura do capuz (rosto em sombra total)
  g.beginPath(); g.ellipse(258, 112, 40, 52, 0, 0, Math.PI * 2); g.fillStyle = '#020203'; g.fill();
  return canvasTexture(c);
}

function hackerMaterial(tex) {
  return new THREE.ShaderMaterial({
    transparent: true, depthWrite: false,
    uniforms: { map: { value: tex }, uOpacity: { value: 1 }, uGlitch: { value: 0 }, uSeed: { value: 0 } },
    vertexShader: `varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }`,
    fragmentShader: /* glsl */`
      uniform sampler2D map; uniform float uOpacity, uGlitch, uSeed; varying vec2 vUv;
      float h(vec2 p){ return fract(sin(dot(p, vec2(12.9898, 78.233)) + uSeed) * 43758.5453); }
      void main(){
        vec2 uv = vUv;
        float row = floor(uv.y * 26.0);
        float r = h(vec2(row, 1.0));
        float on = step(1.0 - uGlitch, r);
        uv.x += (h(vec2(row, 2.0)) - 0.5) * 0.5 * uGlitch * on;
        vec4 c = texture2D(map, uv);
        vec4 cr = texture2D(map, uv + vec2(0.04 * uGlitch, 0.0));
        vec4 cb = texture2D(map, uv - vec2(0.04 * uGlitch, 0.0));
        vec3 col = vec3(cr.r, c.g, cb.b);
        float a = max(c.a, max(cr.a, cb.a) * uGlitch);
        // dissolve por faixas
        float kill = step(h(vec2(row, floor(uSeed))) , uGlitch * 1.15 - 0.15);
        a *= (1.0 - kill) * uOpacity;
        gl_FragColor = vec4(col * a, a);
      }`,
    blending: THREE.CustomBlending, blendSrc: THREE.OneFactor, blendDst: THREE.OneMinusSrcAlphaFactor,
    blendSrcAlpha: THREE.OneFactor, blendDstAlpha: THREE.OneMinusSrcAlphaFactor,
  });
}

function signTexture() {
  const c = makeCanvas(1024, 280);
  const g = c.getContext('2d');
  g.fillStyle = '#16181b'; g.fillRect(0, 0, 1024, 280);
  g.strokeStyle = '#5a1a20'; g.lineWidth = 6; g.strokeRect(10, 10, 1004, 260);
  g.fillStyle = '#9b2a33'; g.fillRect(52, 98, 64, 64);
  g.font = `700 92px ${FONTS.mono}`; g.letterSpacing = '10px'; g.fillStyle = '#C9CBCB';
  g.textBaseline = 'middle'; g.fillText('ACESSO', 160, 104);
  g.font = `500 52px ${FONTS.mono}`; g.letterSpacing = '18px'; g.fillStyle = '#7a7d80';
  g.fillText('RESTRITO', 162, 200);
  return canvasTexture(c);
}

function readerTexture() {
  const c = makeCanvas(256, 640);
  const g = c.getContext('2d');
  const grd = g.createLinearGradient(0, 0, 256, 640);
  grd.addColorStop(0, '#202327'); grd.addColorStop(1, '#121417');
  g.fillStyle = grd; g.fillRect(0, 0, 256, 640);
  // ícone de cartão por aproximação
  g.strokeStyle = '#4b4f54'; g.lineWidth = 8;
  g.beginPath(); g.arc(128, 360, 46, -Math.PI * 0.75, -Math.PI * 0.25); g.stroke();
  g.beginPath(); g.arc(128, 360, 76, -Math.PI * 0.75, -Math.PI * 0.25); g.stroke();
  g.beginPath(); g.arc(128, 360, 106, -Math.PI * 0.75, -Math.PI * 0.25); g.stroke();
  g.fillStyle = '#4b4f54'; g.fillRect(84, 420, 88, 58);
  return canvasTexture(c);
}

function interiorMaterial(kind) {
  return new THREE.ShaderMaterial({
    side: THREE.DoubleSide,
    vertexShader: `varying vec3 vW; void main(){ vec4 w = modelMatrix * vec4(position,1.0); vW = w.xyz; gl_Position = projectionMatrix * viewMatrix * w; }`,
    fragmentShader: kind === 'floor' ? /* glsl */`
      varying vec3 vW;
      void main(){
        // piso escuro e brilhante: reflexo alongado da parede vermelha + luz caindo do fundo
        float back = smoothstep(-0.2, -3.2, vW.z);
        float streak = exp(-pow(vW.x - 0.05, 2.0) * 1.6);
        vec3 red = vec3(1.0, 0.06, 0.075);
        vec3 c = vec3(0.006) + red * (0.06 + 0.9 * back * back * streak + 0.12 * back);
        gl_FragColor = vec4(c, 1.0);
      }` : /* glsl */`
      varying vec3 vW;
      void main(){
        float back = smoothstep(-0.2, -3.2, vW.z);
        float low = 1.0 - smoothstep(0.0, 2.8, vW.y);
        vec3 red = vec3(1.0, 0.06, 0.075);
        gl_FragColor = vec4(vec3(0.004) + red * (0.02 + 0.35 * back * (0.4 + 0.6 * low)), 1.0);
      }`,
  });
}

export function createDoorSet(renderer) {
  const scene = new THREE.Scene();
  scene.environment = studioEnv(renderer);
  scene.environmentIntensity = 0.22;
  const camera = new THREE.PerspectiveCamera(30, W / H, 0.05, 80);

  // ---- materiais
  const frameMat = new THREE.MeshPhysicalMaterial({ color: 0x2c2f34, metalness: 0.35, roughness: 0.48, clearcoat: 0.2, clearcoatRoughness: 0.5 });
  const leafMat = new THREE.MeshPhysicalMaterial({ color: 0x2a2d31, metalness: 0.5, roughness: 0.4, clearcoat: 0.35, clearcoatRoughness: 0.35 });
  const steel = new THREE.MeshStandardMaterial({ color: 0x9a9ea3, metalness: 1.0, roughness: 0.28 });
  const darkMat = new THREE.MeshStandardMaterial({ color: 0x0c0d0f, roughness: 0.9, envMapIntensity: 0.0 });

  // ---- parede invisível (oclusor) com o vão
  const hold = holdoutMaterial();
  const wallL = new THREE.Mesh(new THREE.PlaneGeometry(10, 8), hold); wallL.position.set(-OW / 2 - JW - 5, 4, -0.02);
  const wallR = new THREE.Mesh(new THREE.PlaneGeometry(10, 8), hold); wallR.position.set(OW / 2 + JW + 5, 4, -0.02);
  const wallT = new THREE.Mesh(new THREE.PlaneGeometry(OW + 2 * JW, 8), hold); wallT.position.set(0, OH + JW + 4, -0.02);
  for (const w of [wallL, wallR, wallT]) w.renderOrder = -10;
  scene.add(wallL, wallR, wallT);

  // ---- batente (guarnição)
  const jambGeo = new RoundedBoxGeometry(JW, OH + JW, JD, 3, 0.007);
  const jL = new THREE.Mesh(jambGeo, frameMat); jL.position.set(-OW / 2 - JW / 2, (OH + JW) / 2, -JD / 2 + 0.05);
  const jR = new THREE.Mesh(jambGeo, frameMat); jR.position.set(OW / 2 + JW / 2, (OH + JW) / 2, -JD / 2 + 0.05);
  const head = new THREE.Mesh(new RoundedBoxGeometry(OW + 2 * JW, JW, JD, 3, 0.007), frameMat);
  head.position.set(0, OH + JW / 2, -JD / 2 + 0.05);
  scene.add(jL, jR, head);

  // ---- folha da porta (dobradiça à esquerda, abre para dentro)
  const hinge = new THREE.Group(); hinge.position.set(HINGE_X, 0.004, -0.03);
  const leaf = new THREE.Mesh(new RoundedBoxGeometry(LEAF_W, LEAF_H, LEAF_T, 3, 0.006), leafMat);
  leaf.position.set(LEAF_W / 2, LEAF_H / 2, 0);
  hinge.add(leaf);
  // puxador vertical
  const bar = new THREE.Mesh(new THREE.CylinderGeometry(0.011, 0.011, 0.58, 20), steel);
  bar.position.set(LEAF_W - 0.085, 1.05, LEAF_T / 2 + 0.045);
  const standGeo = new THREE.CylinderGeometry(0.007, 0.007, 0.045, 12); standGeo.rotateX(Math.PI / 2);
  const st1 = new THREE.Mesh(standGeo, steel); st1.position.set(LEAF_W - 0.085, 1.30, LEAF_T / 2 + 0.022);
  const st2 = new THREE.Mesh(standGeo, steel); st2.position.set(LEAF_W - 0.085, 0.80, LEAF_T / 2 + 0.022);
  // placa "ACESSO RESTRITO"
  const sign = new THREE.Mesh(new THREE.PlaneGeometry(0.30, 0.082), new THREE.MeshStandardMaterial({ map: signTexture(), roughness: 0.55, metalness: 0.1 }));
  sign.position.set(LEAF_W / 2, 1.58, LEAF_T / 2 + 0.0015);
  hinge.add(bar, st1, st2, sign);
  scene.add(hinge);

  // ---- leitor de crachá no batente direito
  const reader = new THREE.Mesh(new RoundedBoxGeometry(0.052, 0.128, 0.022, 2, 0.005), new THREE.MeshPhysicalMaterial({ color: 0x1a1c1f, roughness: 0.25, metalness: 0.2, clearcoat: 0.8 }));
  reader.position.set(OW / 2 + JW / 2, 1.13, 0.05 + 0.011);
  const readerFace = new THREE.Mesh(new THREE.PlaneGeometry(0.046, 0.115), new THREE.MeshStandardMaterial({ map: readerTexture(), roughness: 0.3 }));
  readerFace.position.set(OW / 2 + JW / 2, 1.13, 0.05 + 0.0225);
  const ledMat = new THREE.MeshBasicMaterial({ color: new THREE.Color(4, 0.4, 0.45) });
  const led = new THREE.Mesh(new THREE.PlaneGeometry(0.03, 0.0045), ledMat);
  led.position.set(OW / 2 + JW / 2, 1.177, 0.05 + 0.023);
  const ledLight = new THREE.PointLight(0xff3040, 0.0, 0.5, 2);
  ledLight.position.set(OW / 2 + JW / 2, 1.18, 0.12);
  scene.add(reader, readerFace, led, ledLight);

  // ---- interior vermelho
  const back = new THREE.Mesh(new THREE.PlaneGeometry(6, 4.2), backWallMaterial());
  back.position.set(0, 2.0, -3.3);
  // interior "não-iluminado": as luzes de fora não entram; só o vermelho da sala existe lá dentro
  const inFloor = new THREE.Mesh(new THREE.PlaneGeometry(6, 3.25), interiorMaterial('floor'));
  inFloor.rotation.x = -Math.PI / 2; inFloor.position.set(0, 0, -1.68);
  const sideL = new THREE.Mesh(new THREE.PlaneGeometry(3.25, 4.2), interiorMaterial('wall')); sideL.rotation.y = Math.PI / 2; sideL.position.set(-1.7, 2.0, -1.68);
  const sideR = new THREE.Mesh(new THREE.PlaneGeometry(3.25, 4.2), interiorMaterial('wall')); sideR.rotation.y = -Math.PI / 2; sideR.position.set(1.7, 2.0, -1.68);
  const ceil = new THREE.Mesh(new THREE.PlaneGeometry(6, 3.25), interiorMaterial('wall')); ceil.rotation.x = Math.PI / 2; ceil.position.set(0, 3.0, -1.68);
  scene.add(back, inFloor, sideL, sideR, ceil);
  const redLight = new THREE.PointLight(0xff2a36, 0, 0, 2);
  redLight.position.copy(LIGHT_POS);
  scene.add(redLight);

  // ---- silhueta
  const hackTex = hackerTexture();
  const hackMat = hackerMaterial(hackTex);
  const hacker = new THREE.Mesh(new THREE.PlaneGeometry(0.90, 1.80), hackMat);
  hacker.position.set(0.08, 0.90 - 0.025, -1.35);
  scene.add(hacker);

  // ---- luz no piso de fora + névoa volumétrica
  const floorLightMat = floorLightMaterial();
  const floorLight = new THREE.Mesh(new THREE.PlaneGeometry(8, 8), floorLightMat);
  floorLight.rotation.x = -Math.PI / 2; floorLight.position.set(0, 0.002, 4.0);
  scene.add(floorLight);
  const hazeScene = new THREE.Scene();
  const hazeMats = [];
  for (let i = 0; i < 16; i++) {
    const z = 0.07 + i * 0.17;
    const m = hazeSliceMaterial();
    hazeMats.push(m);
    const s = new THREE.Mesh(new THREE.PlaneGeometry(3.6, 2.8), m);
    s.position.set(0, 1.4, z);
    hazeScene.add(s);
  }
  // sombra de contato na base do batente
  const cs = contactShadow(1.6, 0.55, 0.55, 0.7); cs.position.set(0, 0.001, 0.08);
  scene.add(cs);

  // ---- luzes externas
  const key = new THREE.SpotLight(0xdfe6ee, 26, 0, 0.55, 0.85, 2);
  key.position.set(-2.4, 3.1, 3.6); key.target.position.set(0.15, 1.0, 0);
  scene.add(key, key.target);
  const rim = new THREE.SpotLight(0xbfc8d2, 9, 0, 0.5, 0.9, 2);
  rim.position.set(3.0, 2.4, 1.2); rim.target.position.set(0.4, 1.1, 0);
  scene.add(rim, rim.target);
  scene.add(new THREE.HemisphereLight(0x8c949c, 0x101012, 0.06));

  const state = { theta: 0, ledTeal: 0 };

  function doorAngle(t) {
    const latch = 0.055 * spring(t, DOOR_T.latch, 5.5, 0.45);
    const swing = 1.36 * spring(t, DOOR_T.swing, 0.78, 0.74);
    return latch + swing;
  }

  function cameraAt(t) {
    // aproximação lenta e depois "atravessa" a porta
    const slow = tw(t, 39.9, DOOR_T.push0, E.inOutSoft);
    let pos = [lerp(0.46, 0.30, slow), lerp(1.24, 1.18, slow), lerp(6.5, 5.35, slow)];
    let tgt = [lerp(0.22, 0.17, slow), lerp(1.03, 1.05, slow), 0];
    const p = tw(t, DOOR_T.push0, DOOR_T.cut + 0.02, (x) => Math.pow(x, 2.6));
    if (p > 0) {
      pos = [lerp(pos[0], 0.06, E.inOut(Math.min(1, p * 1.3))), lerp(pos[1], 1.08, p), lerp(pos[2], -0.65, p)];
      tgt = [lerp(tgt[0], 0.04, p), lerp(tgt[1], 1.02, p), lerp(0, -3.0, p)];
    }
    return { pos, tgt };
  }

  function update(t) {
    const theta = doorAngle(t);
    state.theta = theta;
    hinge.rotation.y = theta;

    // LED: vermelho, pisca, teal (acesso liberado)
    const blinkOff = t > DOOR_T.led && t < DOOR_T.led + 0.05;
    const teal = t >= DOOR_T.latch - 0.02;
    state.ledTeal = teal ? 1 : 0;
    const ledCol = teal ? new THREE.Color(0.35, 2.6, 2.0) : new THREE.Color(3.2, 0.32, 0.38);
    ledMat.color.copy(blinkOff ? new THREE.Color(0.05, 0.05, 0.05) : ledCol);
    ledLight.color.set(teal ? 0x5fe0c0 : 0xff3040);
    ledLight.intensity = blinkOff ? 0 : 0.012;

    // luz interna sempre acesa; o que muda é o quanto passa pelo vão
    const open = clamp(theta / 1.2);
    redLight.intensity = 9.0 * (0.12 + 0.88 * clamp(theta / 0.5));
    back.material.uniforms.uInt.value = 1.0;
    for (const m of [floorLightMat, ...hazeMats]) m.uniforms.uTheta.value = theta;
    floorLightMat.uniforms.uPower.value = 5.2;
    const hz = 0.9 * (0.65 + 0.35 * open);
    hazeMats.forEach((m) => { m.uniforms.uDensity.value = hz * 0.08; m.uniforms.uTime.value = t; });

    // silhueta: some em glitch quando o narrador diz "hacker"
    const g = tw(t, DOOR_T.hackOut, DOOR_T.hackOut + 0.22, E.linear);
    hackMat.uniforms.uGlitch.value = g > 0 ? Math.min(1, 0.25 + g) : 0;
    hackMat.uniforms.uSeed.value = Math.floor(t * 24) * 1.37;
    hackMat.uniforms.uOpacity.value = 1 - tw(t, DOOR_T.hackOut + 0.12, DOOR_T.hackOut + 0.24, E.linear);
    hacker.visible = t < DOOR_T.hackOut + 0.26;

    const { pos, tgt } = cameraAt(t);
    const hh = 1 - tw(t, DOOR_T.push0, DOOR_T.push0 + 0.2);
    aimCamera(camera, pos, tgt, t, hh);

    // entrada: desfoque -> foco + fade (como o celular na referência)
    const fin = tw(t, DOOR_T.in0, DOOR_T.in1, E.out);
    const blur = 22 * (1 - tw(t, DOOR_T.in0, DOOR_T.in1 + 0.08, E.outQuart));
    // exposição sobe ao atravessar a porta
    const pp = tw(t, DOOR_T.push0 + 0.25, DOOR_T.cut, E.inQuad);
    return {
      blur, extra: hazeScene,
      comp: { alpha3d: fin, exposure: 1 + pp * 1.2, flash: tw(t, DOOR_T.cut - 0.1, DOOR_T.cut, E.inQuad) * 0.35, flashColor: 0xff2030 },
    };
  }

  // ---- UI 2D ancorada nos objetos 3D
  function ui(ctx, t, fi) {
    const fadeUI = 1 - tw(t, DOOR_T.push0 - 0.02, DOOR_T.push0 + 0.16, E.linear);
    if (fadeUI <= 0) return;
    ctx.save();
    ctx.globalAlpha *= fadeUI;

    // cantoneiras em volta do batente (rastreiam a câmera)
    const r = (() => {
      const pts = [new THREE.Vector3(-OW / 2 - JW, 0, 0.05), new THREE.Vector3(OW / 2 + JW, 0, 0.05), new THREE.Vector3(-OW / 2 - JW, OH + JW, 0.05), new THREE.Vector3(OW / 2 + JW, OH + JW, 0.05)];
      const s = pts.map((p) => project(p, camera));
      const x0 = Math.min(...s.map((q) => q.x)), x1 = Math.max(...s.map((q) => q.x));
      const y0 = Math.min(...s.map((q) => q.y)), y1 = Math.max(...s.map((q) => q.y));
      return { x: x0 - 38, y: y0 - 34, w: x1 - x0 + 76, h: y1 - y0 + 68 };
    })();
    const cb = tw(t, 40.02, 40.42, E.outQuart);
    withAlpha(ctx, cb, () => cornerBrackets(ctx, r.x, r.y, r.w, r.h, { len: 40, color: '#55595d', lw: 2, p: cb }));

    // status do leitor: "ACESSO LIBERADO"
    const rd = project(new THREE.Vector3(OW / 2 + JW / 2 + 0.03, 1.18, 0.07), camera);
    const lt0 = DOOR_T.latch - 0.02;
    const lineP = tw(t, lt0, lt0 + 0.13, E.outQuart);
    const stA = env(t, lt0, lt0 + 0.05, 40.64, 40.74, E.linear, E.linear);
    if (stA > 0) {
      withAlpha(ctx, stA, () => {
        const x1 = rd.x + 150, y1 = rd.y - 190;
        drawLine(ctx, rd.x + 8, rd.y - 8, lerp(rd.x + 8, x1, lineP), lerp(rd.y - 8, y1, lineP), 1, { color: PAL.tealBright, width: 2 });
        node(ctx, rd.x + 8, rd.y - 8, 8, PAL.tealBright, 1);
        if (lineP >= 1) {
          drawLine(ctx, x1, y1, x1 + 40, y1, 1, { color: PAL.tealBright, width: 2 });
          const d = decode('LIBERADO', t, lt0 + 0.08, { cps: 40, seed: 41, fi });
          setFont(ctx, FONTS.mono, 22, 700);
          ctx.textBaseline = 'middle';
          drawSegs(ctx, [{ text: d.text, color: PAL.tealBright }], x1 + 54, y1 + 1, { ls: 5, glow: { color: PAL.tealBright, blur: 12, alpha: 0.4 }, shadow: { color: 'rgba(0,0,0,0.6)', blur: 6, x: 2, y: 3 } });
          ctx.textBaseline = 'alphabetic';
        }
      });
    }

    // callout "HACKER?" apontando para a silhueta, riscado em "hacker"
    const hp = project(new THREE.Vector3(0.24, 1.30, -1.35), camera);
    const h0 = DOOR_T.hackLabel;
    const hA = env(t, h0, h0 + 0.04, 41.66, 41.78, E.linear, E.linear);
    if (hA > 0) {
      withAlpha(ctx, hA, () => {
        const bx = Math.max(hp.x + 330, r.x + r.w + 70), by = hp.y - 46;
        const lp = tw(t, h0, h0 + 0.15, E.outQuart);
        const midX = lerp(hp.x, bx, 0.45);
        drawLine(ctx, hp.x, hp.y, lerp(hp.x, bx, lp), hp.y, 1, { color: PAL.redBox, width: 2 });
        node(ctx, hp.x, hp.y, 9, PAL.redBox, 1);
        node(ctx, midX, hp.y, 9, PAL.redBox, lp > 0.5 ? 1 : 0);
        if (lp >= 1) {
          const dim = tw(t, DOOR_T.strike + 0.1, DOOR_T.strike + 0.3, E.linear);
          labelBox(ctx, t, fi, { x: bx, y: by, w: 300, h: 92, text: 'HACKER?', t0: h0 + 0.13, size: 34, ls: 8, seed: 77, alpha: 1 - 0.55 * dim });
          // risco
          const sp = tw(t, DOOR_T.strike, DOOR_T.strike + 0.13, E.outQuart);
          if (sp > 0) {
            ctx.save();
            ctx.fillStyle = PAL.red;
            ctx.shadowColor = PAL.red; ctx.shadowBlur = 10;
            ctx.fillRect(bx - 16, by + 44, (300 + 32) * sp, 4);
            ctx.restore();
          }
        }
      });
    }
    ctx.restore();
  }

  return { scene, camera, update, ui, state };
}
