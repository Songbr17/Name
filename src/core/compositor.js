// Pipeline de composição em WebGL:
//   placa de fundo (quadro original da referência) + camada 3D (linear, HDR)
//   + camada de UI 2D (canvas) -> acumulação de sub-quadros (motion blur real)
//   -> bloom + glitch + aberração cromática + grão -> tela.
import * as THREE from 'three';

const VS = /* glsl */`
varying vec2 vUv;
void main(){ vUv = uv; gl_Position = vec4(position.xy, 0.0, 1.0); }`;

const COMMON = /* glsl */`
vec3 toLin(vec3 c){ return mix(c/12.92, pow((c+0.055)/1.055, vec3(2.4)), step(0.04045, c)); }
vec3 toSRGB(vec3 c){ c = max(c, 0.0); return mix(c*12.92, 1.055*pow(c, vec3(1.0/2.4))-0.055, step(0.0031308, c)); }
float hash12(vec2 p){ vec3 p3 = fract(vec3(p.xyx) * .1031); p3 += dot(p3, p3.yzx + 33.33); return fract((p3.x + p3.y) * p3.z); }
`;

function quad(material) {
  const m = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), material);
  m.frustumCulled = false;
  const s = new THREE.Scene(); s.add(m);
  return s;
}

export class Compositor {
  constructor(renderer, W, H) {
    this.r = renderer; this.W = W; this.H = H;
    this.cam = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
    this.emptyScene = new THREE.Scene();
    const rtOpts = { type: THREE.HalfFloatType, depthBuffer: false, colorSpace: THREE.NoColorSpace };
    this.rt3d = new THREE.WebGLRenderTarget(W, H, { type: THREE.HalfFloatType, samples: 4, colorSpace: THREE.NoColorSpace });
    this.rtBlurA = new THREE.WebGLRenderTarget(W / 2, H / 2, rtOpts);
    this.rtBlurB = new THREE.WebGLRenderTarget(W / 2, H / 2, rtOpts);
    this.rtSub = new THREE.WebGLRenderTarget(W, H, rtOpts);
    this.rtHaze = new THREE.WebGLRenderTarget(W / 4, H / 4, rtOpts);
    this.rtAcc = new THREE.WebGLRenderTarget(W, H, rtOpts);
    this.bloomRTs = [];
    for (let i = 1; i <= 5; i++) {
      const w = Math.ceil(W / 2 ** i), h = Math.ceil(H / 2 ** i);
      this.bloomRTs.push([new THREE.WebGLRenderTarget(w, h, rtOpts), new THREE.WebGLRenderTarget(w, h, rtOpts)]);
    }

    this.plateTex = new THREE.Texture();
    this.plateTex.colorSpace = THREE.NoColorSpace;
    this.plateTex.generateMipmaps = false; this.plateTex.minFilter = THREE.LinearFilter;

    this.uiCanvas = document.createElement('canvas');
    this.uiCanvas.width = W; this.uiCanvas.height = H;
    this.uiTex = new THREE.CanvasTexture(this.uiCanvas);
    this.uiTex.colorSpace = THREE.NoColorSpace;
    this.uiTex.premultiplyAlpha = true;
    this.uiTex.generateMipmaps = false; this.uiTex.minFilter = THREE.LinearFilter;

    // --- blur separável (para desfoque da camada 3D: "foco" das entradas)
    this.blurMat = new THREE.ShaderMaterial({
      vertexShader: VS,
      fragmentShader: /* glsl */`
        uniform sampler2D tSrc; uniform vec2 uDir; varying vec2 vUv;
        void main(){
          vec4 s = vec4(0.0); float wsum = 0.0;
          for (int i = -6; i <= 6; i++) { float w = exp(-float(i*i)/18.0); s += texture2D(tSrc, vUv + uDir*float(i)) * w; wsum += w; }
          gl_FragColor = s / wsum;
        }`,
      uniforms: { tSrc: { value: null }, uDir: { value: new THREE.Vector2() } },
      depthTest: false, depthWrite: false,
    });
    this.blurScene = quad(this.blurMat);

    // --- composição de um sub-quadro
    this.compMat = new THREE.ShaderMaterial({
      vertexShader: VS,
      fragmentShader: COMMON + /* glsl */`
        uniform sampler2D tPlate, t3d, t3dBlur, tUI, tHaze;
        uniform float uBlurMix, uExposure, u3dAlpha, uUIAlpha, uFlash, uPlateGain, uUIBlurMix, uHaze;
        uniform vec3 uFlashColor;
        varying vec2 vUv;
        vec3 tonemap(vec3 x){ x *= uExposure; return x * (1.0 + x / 9.0) / (1.0 + x); }
        void main(){
          vec3 plate = toLin(texture2D(tPlate, vUv).rgb) * uPlateGain;
          vec4 c3 = mix(texture2D(t3d, vUv), texture2D(t3dBlur, vUv), uBlurMix) * u3dAlpha;
          vec3 hz = texture2D(tHaze, vUv).rgb * uHaze * u3dAlpha;
          vec3 lin = tonemap(c3.rgb + hz) + plate * (1.0 - clamp(c3.a, 0.0, 1.0));
          lin += uFlashColor * uFlash;
          vec3 s = toSRGB(lin);
          vec4 ui = texture2D(tUI, vUv) * uUIAlpha;
          s = ui.rgb + s * (1.0 - ui.a);
          float mask = max(clamp(c3.a, 0.0, 1.0), ui.a);
          gl_FragColor = vec4(s, mask);
        }`,
      uniforms: {
        tPlate: { value: this.plateTex }, t3d: { value: this.rt3d.texture }, t3dBlur: { value: this.rtBlurB.texture },
        tUI: { value: this.uiTex }, tHaze: { value: this.rtHaze.texture }, uHaze: { value: 0 }, uBlurMix: { value: 0 }, uExposure: { value: 1 }, u3dAlpha: { value: 1 },
        uUIAlpha: { value: 1 }, uFlash: { value: 0 }, uFlashColor: { value: new THREE.Color(1, 0.2, 0.25) },
        uPlateGain: { value: 1 }, uUIBlurMix: { value: 0 },
      },
      depthTest: false, depthWrite: false,
    });
    this.compScene = quad(this.compMat);

    // --- acumulação (média dos sub-quadros)
    this.accMat = new THREE.ShaderMaterial({
      vertexShader: VS,
      fragmentShader: `uniform sampler2D tSrc; uniform float uW; varying vec2 vUv; void main(){ gl_FragColor = texture2D(tSrc, vUv) * uW; }`,
      uniforms: { tSrc: { value: this.rtSub.texture }, uW: { value: 1 } },
      blending: THREE.CustomBlending, blendEquation: THREE.AddEquation,
      blendSrc: THREE.OneFactor, blendDst: THREE.OneFactor,
      blendSrcAlpha: THREE.OneFactor, blendDstAlpha: THREE.OneFactor,
      depthTest: false, depthWrite: false, transparent: true,
    });
    this.accScene = quad(this.accMat);

    // --- bloom (bright-pass + pirâmide)
    this.brightMat = new THREE.ShaderMaterial({
      vertexShader: VS,
      fragmentShader: /* glsl */`
        uniform sampler2D tSrc; uniform float uThr, uKnee; uniform vec2 uTexel; varying vec2 vUv;
        void main(){
          vec3 c = vec3(0.0);
          c += texture2D(tSrc, vUv + uTexel*vec2(-0.5,-0.5)).rgb; c += texture2D(tSrc, vUv + uTexel*vec2(0.5,-0.5)).rgb;
          c += texture2D(tSrc, vUv + uTexel*vec2(-0.5,0.5)).rgb; c += texture2D(tSrc, vUv + uTexel*vec2(0.5,0.5)).rgb;
          c *= 0.25;
          float m = max(c.r, max(c.g, c.b));
          float w = clamp((m - uThr + uKnee) / (2.0 * uKnee), 0.0, 1.0); w = w*w;
          float k = max(w * uKnee, m - uThr) / max(m, 1e-4);
          gl_FragColor = vec4(c * clamp(k, 0.0, 1.0), 1.0);
        }`,
      uniforms: { tSrc: { value: null }, uThr: { value: 0.82 }, uKnee: { value: 0.12 }, uTexel: { value: new THREE.Vector2() } },
      depthTest: false, depthWrite: false,
    });
    this.brightScene = quad(this.brightMat);
    this.downMat = new THREE.ShaderMaterial({
      vertexShader: VS,
      fragmentShader: /* glsl */`
        uniform sampler2D tSrc; uniform vec2 uTexel; varying vec2 vUv;
        void main(){
          vec3 c = texture2D(tSrc, vUv).rgb * 4.0;
          c += texture2D(tSrc, vUv + uTexel*vec2(-1.0,-1.0)).rgb; c += texture2D(tSrc, vUv + uTexel*vec2(1.0,-1.0)).rgb;
          c += texture2D(tSrc, vUv + uTexel*vec2(-1.0,1.0)).rgb; c += texture2D(tSrc, vUv + uTexel*vec2(1.0,1.0)).rgb;
          gl_FragColor = vec4(c / 8.0, 1.0);
        }`,
      uniforms: { tSrc: { value: null }, uTexel: { value: new THREE.Vector2() } },
      depthTest: false, depthWrite: false,
    });
    this.downScene = quad(this.downMat);
    this.upMat = new THREE.ShaderMaterial({
      vertexShader: VS,
      fragmentShader: /* glsl */`
        uniform sampler2D tSrc, tBase; uniform vec2 uTexel; varying vec2 vUv;
        void main(){
          vec3 c = vec3(0.0);
          c += texture2D(tSrc, vUv + uTexel*vec2(-1.0, 0.0)).rgb * 2.0; c += texture2D(tSrc, vUv + uTexel*vec2(1.0, 0.0)).rgb * 2.0;
          c += texture2D(tSrc, vUv + uTexel*vec2(0.0, -1.0)).rgb * 2.0; c += texture2D(tSrc, vUv + uTexel*vec2(0.0, 1.0)).rgb * 2.0;
          c += texture2D(tSrc, vUv + uTexel*vec2(-1.0,-1.0)).rgb; c += texture2D(tSrc, vUv + uTexel*vec2(1.0,-1.0)).rgb;
          c += texture2D(tSrc, vUv + uTexel*vec2(-1.0,1.0)).rgb; c += texture2D(tSrc, vUv + uTexel*vec2(1.0,1.0)).rgb;
          gl_FragColor = vec4(c / 12.0 + texture2D(tBase, vUv).rgb, 1.0);
        }`,
      uniforms: { tSrc: { value: null }, tBase: { value: null }, uTexel: { value: new THREE.Vector2() } },
      depthTest: false, depthWrite: false,
    });
    this.upScene = quad(this.upMat);

    // --- passo final
    this.finalMat = new THREE.ShaderMaterial({
      vertexShader: VS,
      fragmentShader: COMMON + /* glsl */`
        uniform sampler2D tAcc, tBloom, tPlate;
        uniform float uBloom, uGrain, uGrainBase, uSeed, uGlitch, uDark, uCA, uRGB, uFade, uBlockRows;
        uniform vec2 uRes;
        varying vec2 vUv;
        float rnd(float a, float b){ return hash12(vec2(a, b) + uSeed * 1.7319); }
        void main(){
          vec2 uv = vUv;
          // --- glitch: fatias horizontais deslocadas (como o glitch de saída da referência)
          float rows = uBlockRows;
          float row = floor((1.0 - uv.y) * rows);
          float r1 = rnd(row, 1.0);
          float shift = 0.0;
          if (uGlitch > 0.0 && r1 < uGlitch * 0.75) {
            shift = (rnd(row, 2.0) - 0.5) * 0.18 * uGlitch;
            // sub-faixas mais finas
            float sub = floor((1.0 - uv.y) * rows * 6.0);
            shift += (rnd(sub, 3.0) - 0.5) * 0.02 * uGlitch;
          }
          uv.x += shift;
          float split = uRGB * (0.6 + 0.4 * step(0.001, abs(shift)));
          vec2 caDir = (vUv - 0.5) * uCA;
          vec4 acc = texture2D(tAcc, uv);
          vec3 col;
          col.r = texture2D(tAcc, uv + vec2(split, 0.0) + caDir).r;
          col.g = acc.g;
          col.b = texture2D(tAcc, uv - vec2(split, 0.0) - caDir).b;
          float mask = acc.a;
          // fora da tela após deslocamento -> placa original
          if (uv.x < 0.0 || uv.x > 1.0) { col = texture2D(tPlate, vUv).rgb; mask = 0.0; }
          col += texture2D(tBloom, vUv).rgb * uBloom;
          // --- blocos escuros do glitch
          if (uDark > 0.0) {
            float by = floor((1.0 - vUv.y) * 22.0);
            float bx = floor(vUv.x * (3.0 + floor(rnd(by, 5.0) * 4.0)));
            float rb = rnd(by * 13.0 + bx, 6.0);
            if (rb < uDark * 0.55) col *= mix(0.12, 0.45, rnd(by, bx));
          }
          col *= uFade;
          // --- grão (só sobre os elementos; o fundo já tem o grão original)
          float n = (hash12(gl_FragCoord.xy + uSeed * 91.7) + hash12(gl_FragCoord.xy * 1.37 + uSeed * 13.1) - 1.0);
          col += n * (uGrain * mask + uGrainBase);
          gl_FragColor = vec4(clamp(col, 0.0, 1.0), 1.0);
        }`,
      uniforms: {
        tAcc: { value: this.rtAcc.texture }, tBloom: { value: null }, tPlate: { value: this.plateTex },
        uBloom: { value: 0.35 }, uGrain: { value: 0.012 }, uGrainBase: { value: 0.0 }, uSeed: { value: 0 },
        uGlitch: { value: 0 }, uDark: { value: 0 }, uCA: { value: 0 }, uRGB: { value: 0 }, uFade: { value: 1 },
        uBlockRows: { value: 18 }, uRes: { value: new THREE.Vector2(W, H) },
      },
      depthTest: false, depthWrite: false,
    });
    this.finalScene = quad(this.finalMat);
  }

  setPlate(img) {
    this.plateTex.image = img;
    this.plateTex.needsUpdate = true;
  }

  beginFrame() {
    this.r.setRenderTarget(this.rtAcc);
    this.r.setClearColor(0x000000, 0);
    this.r.clear(true, false, false);
  }

  render3D(scene, camera, extra) {
    this.r.setRenderTarget(this.rt3d);
    this.r.setClearColor(0x000000, 0);
    this.r.clear(true, true, true);
    // render() também força o "resolve" do MSAA; sem ele a textura guardaria o quadro anterior
    if (scene && camera) this.r.render(scene, camera);
    else this.r.render(this.emptyScene, this.cam);
    // camada aditiva em baixa resolução (névoa volumétrica)
    this.compMat.uniforms.uHaze.value = extra ? 1 : 0;
    if (extra && camera) {
      this.r.setRenderTarget(this.rtHaze);
      this.r.clear(true, true, true);
      this.r.render(extra, camera);
    }
  }

  blur3D(radiusPx) {
    // duas passadas separáveis em meia resolução
    const texel = Math.max(0.5, radiusPx / 6) / (this.W / 2);
    const texelY = Math.max(0.5, radiusPx / 6) / (this.H / 2);
    this.blurMat.uniforms.tSrc.value = this.rt3d.texture;
    this.blurMat.uniforms.uDir.value.set(texel, 0);
    this.r.setRenderTarget(this.rtBlurA); this.r.render(this.blurScene, this.cam);
    this.blurMat.uniforms.tSrc.value = this.rtBlurA.texture;
    this.blurMat.uniforms.uDir.value.set(0, texelY);
    this.r.setRenderTarget(this.rtBlurB); this.r.render(this.blurScene, this.cam);
  }

  composite(params, weight) {
    const u = this.compMat.uniforms;
    u.uBlurMix.value = params.blurMix ?? 0;
    u.uExposure.value = params.exposure ?? 1;
    u.u3dAlpha.value = params.alpha3d ?? 1;
    u.uUIAlpha.value = params.alphaUI ?? 1;
    u.uFlash.value = params.flash ?? 0;
    if (params.flashColor) u.uFlashColor.value.set(params.flashColor);
    u.uPlateGain.value = params.plateGain ?? 1;
    this.uiTex.needsUpdate = true;
    this.r.setRenderTarget(this.rtSub);
    this.r.render(this.compScene, this.cam);
    this.accMat.uniforms.uW.value = weight;
    this.r.setRenderTarget(this.rtAcc);
    this.r.render(this.accScene, this.cam);
  }

  bloom() {
    const levels = this.bloomRTs;
    this.brightMat.uniforms.tSrc.value = this.rtAcc.texture;
    this.brightMat.uniforms.uTexel.value.set(1 / this.W, 1 / this.H);
    this.r.setRenderTarget(levels[0][0]); this.r.render(this.brightScene, this.cam);
    for (let i = 1; i < levels.length; i++) {
      const src = levels[i - 1][0];
      this.downMat.uniforms.tSrc.value = src.texture;
      this.downMat.uniforms.uTexel.value.set(1 / src.width, 1 / src.height);
      this.r.setRenderTarget(levels[i][0]); this.r.render(this.downScene, this.cam);
    }
    // sobe somando: up[i] = blur(up[i+1]) + down[i]
    let prev = levels[levels.length - 1][0];
    for (let i = levels.length - 2; i >= 0; i--) {
      this.upMat.uniforms.tSrc.value = prev.texture;
      this.upMat.uniforms.tBase.value = levels[i][0].texture;
      this.upMat.uniforms.uTexel.value.set(1 / prev.width, 1 / prev.height);
      this.r.setRenderTarget(levels[i][1]); this.r.render(this.upScene, this.cam);
      prev = levels[i][1];
    }
    return prev.texture;
  }

  finish(fp) {
    const bloomTex = this.bloom();
    const u = this.finalMat.uniforms;
    u.tBloom.value = bloomTex;
    u.uBloom.value = fp.bloom ?? 0.3;
    u.uGrain.value = fp.grain ?? 0.012;
    u.uGrainBase.value = fp.grainBase ?? 0;
    u.uSeed.value = fp.seed ?? 0;
    u.uGlitch.value = fp.glitch ?? 0;
    u.uDark.value = fp.dark ?? 0;
    u.uCA.value = fp.ca ?? 0;
    u.uRGB.value = fp.rgb ?? 0;
    u.uFade.value = fp.fade ?? 1;
    u.uBlockRows.value = fp.rows ?? 18;
    this.r.setRenderTarget(null);
    this.r.render(this.finalScene, this.cam);
  }
}
