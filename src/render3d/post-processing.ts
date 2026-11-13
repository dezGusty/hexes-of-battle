import * as THREE from 'three';
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass.js';
import { ShaderPass } from 'three/examples/jsm/postprocessing/ShaderPass.js';
import { OutputPass } from 'three/examples/jsm/postprocessing/OutputPass.js';

export interface EadorBloomConfig {
  threshold: number;
  strength: number;
  radius: number;
}

export const EADOR_BLOOM_CONFIG: EadorBloomConfig = {
  threshold: 0.85,
  strength: 0.35,
  radius: 0.7,
};

/**
 * Lightweight screen-space Tilt-Shift ShaderPass for a miniature tabletop feel
 * without paying for a second full-scene depth render pass.
 * Keeps the central horizontal band sharp while gently blurring the top/bottom edges.
 */
export const EadorTiltShiftShader = {
  name: 'EadorTiltShiftShader',
  uniforms: {
    tDiffuse: { value: null as THREE.Texture | null },
    uFocusY: { value: 0.5 },
    uFocusBand: { value: 0.22 },
    uEdgeBand: { value: 0.50 },
    uMaxBlur: { value: 0.0014 },
    uAspect: { value: 16 / 9 },
  },
  vertexShader: /* glsl */ `
    varying vec2 vUv;
    void main() {
      vUv = uv;
      gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    }
  `,
  fragmentShader: /* glsl */ `
    uniform sampler2D tDiffuse;
    uniform float uFocusY;
    uniform float uFocusBand;
    uniform float uEdgeBand;
    uniform float uMaxBlur;
    uniform float uAspect;
    varying vec2 vUv;

    void main() {
      float dist = abs(vUv.y - uFocusY);
      float blurAmount = smoothstep(uFocusBand, uEdgeBand, dist) * uMaxBlur;

      if (blurAmount <= 0.00005) {
        gl_FragColor = texture2D(tDiffuse, vUv);
        return;
      }

      vec2 stepUv = vec2(blurAmount / max(0.5, uAspect), blurAmount);
      vec4 sum = texture2D(tDiffuse, vUv) * 0.24;
      sum += texture2D(tDiffuse, vUv + vec2( stepUv.x,  0.0)) * 0.12;
      sum += texture2D(tDiffuse, vUv + vec2(-stepUv.x,  0.0)) * 0.12;
      sum += texture2D(tDiffuse, vUv + vec2( 0.0,  stepUv.y)) * 0.12;
      sum += texture2D(tDiffuse, vUv + vec2( 0.0, -stepUv.y)) * 0.12;
      sum += texture2D(tDiffuse, vUv + vec2( stepUv.x,  stepUv.y) * 0.75) * 0.07;
      sum += texture2D(tDiffuse, vUv + vec2(-stepUv.x,  stepUv.y) * 0.75) * 0.07;
      sum += texture2D(tDiffuse, vUv + vec2( stepUv.x, -stepUv.y) * 0.75) * 0.07;
      sum += texture2D(tDiffuse, vUv + vec2(-stepUv.x, -stepUv.y) * 0.75) * 0.07;

      gl_FragColor = sum;
    }
  `,
};

/**
 * Custom ShaderPass replicating Eador: Masters of the Broken World's
 * early-2010s painterly color grading & subtle vignette:
 * - Slightly desaturates deep shadows
 * - Pushes midtones toward warm amber and earthy greens
 * - Applies a soft radial vignette
 */
export const EadorColorGradingShader = {
  name: 'EadorColorGradingShader',
  uniforms: {
    tDiffuse: { value: null as THREE.Texture | null },
    uVignetteStrength: { value: 0.24 },
    uVignetteSmoothness: { value: 0.55 },
    uShadowDesaturation: { value: 0.38 },
    uMidtoneStrength: { value: 0.32 },
    uWarmAmberTint: { value: new THREE.Vector3(1.08, 0.99, 0.86) },
    uEarthyGreenTint: { value: new THREE.Vector3(0.95, 1.04, 0.90) },
  },
  vertexShader: /* glsl */ `
    varying vec2 vUv;
    void main() {
      vUv = uv;
      gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    }
  `,
  fragmentShader: /* glsl */ `
    uniform sampler2D tDiffuse;
    uniform float uVignetteStrength;
    uniform float uVignetteSmoothness;
    uniform float uShadowDesaturation;
    uniform float uMidtoneStrength;
    uniform vec3 uWarmAmberTint;
    uniform vec3 uEarthyGreenTint;
    varying vec2 vUv;

    void main() {
      vec4 texel = texture2D(tDiffuse, vUv);
      vec3 col = texel.rgb;

      // Perceptual luminance in linear HDR space
      float luma = dot(col, vec3(0.2126, 0.7152, 0.0722));

      // 1. Slightly desaturate shadows
      float shadowWeight = 1.0 - smoothstep(0.03, 0.36, luma);
      col = mix(col, vec3(luma), shadowWeight * uShadowDesaturation);

      // 2. Push midtones toward warm amber and earthy greens
      float midtoneWeight = smoothstep(0.06, 0.42, luma) * (1.0 - smoothstep(0.55, 0.95, luma));
      float greenBalance = clamp((col.g - col.r) * 2.5 + 0.5, 0.0, 1.0);
      vec3 midTint = mix(uWarmAmberTint, uEarthyGreenTint, greenBalance * 0.45);
      col = mix(col, col * midTint, midtoneWeight * uMidtoneStrength);

      // 3. Subtle radial vignette
      vec2 centered = vUv - 0.5;
      float dist = length(centered) * 1.41421356;
      float vignette = smoothstep(1.0 - uVignetteSmoothness, 1.05, dist);
      col *= 1.0 - vignette * uVignetteStrength;

      gl_FragColor = vec4(max(col, vec3(0.0)), texel.a);
    }
  `,
};

export interface EadorPostProcessingPipeline {
  composer: EffectComposer;
  renderPass: RenderPass;
  bloomPass: UnrealBloomPass;
  tiltShiftPass: ShaderPass;
  colorGradingPass: ShaderPass;
  outputPass: OutputPass;
  setTiltShiftEnabled: (enabled: boolean) => void;
  resize: (width: number, height: number) => void;
  render: () => void;
  dispose: () => void;
}

/**
 * Creates the Eador-inspired post-processing pipeline:
 * RenderPass -> UnrealBloomPass -> EadorTiltShiftShader -> EadorColorGradingShader -> OutputPass (ToneMapping + sRGB).
 */
export function createEadorPostProcessing(
  renderer: THREE.WebGLRenderer,
  scene: THREE.Scene,
  camera: THREE.Camera,
  width: number,
  height: number
): EadorPostProcessingPipeline {
  const safeW = Math.max(1, width);
  const safeH = Math.max(1, height);

  const renderTarget = new THREE.WebGLRenderTarget(safeW, safeH, {
    type: THREE.HalfFloatType,
    samples: 4,
  });

  const composer = new EffectComposer(renderer, renderTarget);
  composer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.5));
  composer.setSize(safeW, safeH);

  const renderPass = new RenderPass(scene, camera);
  composer.addPass(renderPass);

  const bloomPass = new UnrealBloomPass(
    new THREE.Vector2(safeW, safeH),
    EADOR_BLOOM_CONFIG.strength,
    EADOR_BLOOM_CONFIG.radius,
    EADOR_BLOOM_CONFIG.threshold
  );
  composer.addPass(bloomPass);

  const tiltShiftPass = new ShaderPass(EadorTiltShiftShader);
  tiltShiftPass.uniforms.uAspect.value = safeW / safeH;
  composer.addPass(tiltShiftPass);

  const colorGradingPass = new ShaderPass(EadorColorGradingShader);
  composer.addPass(colorGradingPass);

  const outputPass = new OutputPass();
  composer.addPass(outputPass);

  return {
    composer,
    renderPass,
    bloomPass,
    tiltShiftPass,
    colorGradingPass,
    outputPass,
    setTiltShiftEnabled(enabled: boolean) {
      tiltShiftPass.enabled = enabled;
    },
    resize(newWidth: number, newHeight: number) {
      const w = Math.max(1, newWidth);
      const h = Math.max(1, newHeight);
      composer.setSize(w, h);
      bloomPass.resolution.set(w, h);
      tiltShiftPass.uniforms.uAspect.value = w / h;
    },
    render() {
      composer.render();
    },
    dispose() {
      bloomPass.dispose();
      tiltShiftPass.dispose();
      colorGradingPass.dispose();
      outputPass.dispose();
      renderPass.dispose();
      composer.dispose();
    },
  };
}
