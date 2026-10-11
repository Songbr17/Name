// Utilitários 3D compartilhados.
import * as THREE from 'three';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { W, H } from './config.js';
import { fbm1 } from './rand.js';

let _env = null;
export function studioEnv(renderer) {
  if (_env) return _env;
  const pm = new THREE.PMREMGenerator(renderer);
  _env = pm.fromScene(new RoomEnvironment(), 0.04).texture;
  pm.dispose();
  return _env;
}

const _v = new THREE.Vector3();
// Projeta um ponto do mundo para pixels da tela (origem no canto superior esquerdo).
export function project(p, camera) {
  _v.set(p.x, p.y, p.z).project(camera);
  return { x: (_v.x * 0.5 + 0.5) * W, y: (-_v.y * 0.5 + 0.5) * H, z: _v.z, behind: _v.z > 1 };
}

// Retângulo de tela que envolve uma lista de pontos 3D.
export function screenRect(points, camera) {
  let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
  for (const p of points) {
    const s = project(p, camera);
    x0 = Math.min(x0, s.x); y0 = Math.min(y0, s.y); x1 = Math.max(x1, s.x); y1 = Math.max(y1, s.y);
  }
  return { x: x0, y: y0, w: x1 - x0, h: y1 - y0 };
}

// "Câmera na mão" bem sutil: ruído fBm de baixa frequência.
export function applyHandheld(camera, t, amp = 1, seed = 5) {
  const r = 0.00055 * amp;
  camera.rotation.x += fbm1(t * 0.35, seed) * r;
  camera.rotation.y += fbm1(t * 0.31, seed + 7) * r * 1.2;
  camera.rotation.z += fbm1(t * 0.27, seed + 13) * r * 0.5;
}

// Posiciona a câmera olhando para um alvo e aplica ruído de mão.
export function aimCamera(camera, pos, target, t, handheld = 1, roll = 0) {
  camera.position.set(pos[0], pos[1], pos[2]);
  camera.up.set(Math.sin(roll), Math.cos(roll), 0);
  camera.lookAt(target[0], target[1], target[2]);
  if (handheld > 0) applyHandheld(camera, t, handheld);
  camera.updateMatrixWorld(true);
}

export function canvasTexture(canvas, { srgb = true, aniso = 8 } = {}) {
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = srgb ? THREE.SRGBColorSpace : THREE.NoColorSpace;
  tex.anisotropy = aniso;
  tex.generateMipmaps = true;
  tex.minFilter = THREE.LinearMipmapLinearFilter;
  return tex;
}

export function makeCanvas(w, h) {
  const c = document.createElement('canvas');
  c.width = w; c.height = h;
  return c;
}

// Material que só escreve profundidade (oclusor invisível — a placa de fundo aparece).
export const holdoutMaterial = () => new THREE.MeshBasicMaterial({ colorWrite: false });

// Mistura aditiva que não mexe no alfa (luz pura somada sobre a placa).
export function additive(mat) {
  mat.transparent = true;
  mat.depthWrite = false;
  mat.blending = THREE.CustomBlending;
  mat.blendEquation = THREE.AddEquation;
  mat.blendSrc = THREE.OneFactor; mat.blendDst = THREE.OneFactor;
  mat.blendSrcAlpha = THREE.ZeroFactor; mat.blendDstAlpha = THREE.OneFactor;
  return mat;
}

// Sombra de contato (quad escuro com gradiente) — escurece a placa por alfa.
export function contactShadow(w, d, opacity = 0.6, softness = 0.5) {
  const mat = new THREE.ShaderMaterial({
    transparent: true, depthWrite: false,
    uniforms: { uOpacity: { value: opacity }, uSoft: { value: softness } },
    vertexShader: `varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }`,
    fragmentShader: `uniform float uOpacity, uSoft; varying vec2 vUv;
      void main(){
        vec2 q = abs(vUv - 0.5) * 2.0;
        float dx = smoothstep(1.0, 1.0 - uSoft, q.x);
        float dy = smoothstep(1.0, 1.0 - uSoft, q.y);
        float a = dx * dy * uOpacity;
        gl_FragColor = vec4(0.0, 0.0, 0.0, a);
      }`,
  });
  const m = new THREE.Mesh(new THREE.PlaneGeometry(w, d), mat);
  m.rotation.x = -Math.PI / 2;
  m.renderOrder = -1;
  return m;
}
