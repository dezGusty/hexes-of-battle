import * as THREE from 'three';

export function createProceduralWaterNormalTexture(
  size: number = 128,
  phaseOffset: number = 0,
  freqScale: number = 1
): THREE.DataTexture {
  const heights = new Float32Array(size * size);
  const twoPi = Math.PI * 2;

  for (let y = 0; y < size; y++) {
    const v = y / size;
    for (let x = 0; x < size; x++) {
      const u = x / size;
      const h =
        Math.sin(twoPi * (u * 2 * freqScale + v * 1 * freqScale) + phaseOffset) * 0.35 +
        Math.cos(twoPi * (u * 3 * freqScale - v * 2 * freqScale) + phaseOffset * 1.7) * 0.25 +
        Math.sin(twoPi * (u * 5 * freqScale + v * 4 * freqScale) - phaseOffset * 0.9) * 0.18 +
        Math.cos(twoPi * (u * 7 * freqScale - v * 6 * freqScale) + phaseOffset * 2.3) * 0.12;
      heights[y * size + x] = h;
    }
  }

  const data = new Uint8Array(size * size * 4);
  const strength = 2.6;
  for (let y = 0; y < size; y++) {
    const yPrev = (y - 1 + size) % size;
    const yNext = (y + 1) % size;
    for (let x = 0; x < size; x++) {
      const xPrev = (x - 1 + size) % size;
      const xNext = (x + 1) % size;

      const dX = (heights[y * size + xNext] - heights[y * size + xPrev]) * strength;
      const dY = (heights[yNext * size + x] - heights[yPrev * size + x]) * strength;

      const nx = -dX;
      const ny = -dY;
      const nz = 1.0;
      const len = Math.hypot(nx, ny, nz) || 1;

      const idx = (y * size + x) * 4;
      data[idx] = Math.round(((nx / len) * 0.5 + 0.5) * 255);
      data[idx + 1] = Math.round(((ny / len) * 0.5 + 0.5) * 255);
      data[idx + 2] = Math.round(((nz / len) * 0.5 + 0.5) * 255);
      data[idx + 3] = 255;
    }
  }

  const tex = new THREE.DataTexture(data, size, size, THREE.RGBAFormat);
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.magFilter = THREE.LinearFilter;
  tex.minFilter = THREE.LinearMipmapLinearFilter;
  tex.generateMipmaps = true;
  tex.needsUpdate = true;
  return tex;
}

const WATER_VERTEX_SHADER = /* glsl */ `
  attribute float aShoreDist;

  varying vec3 vWorldPos;
  varying vec2 vUv;
  varying float vShoreDist;

  void main() {
    vUv = uv;
    vShoreDist = aShoreDist;
    vec4 worldPos = modelMatrix * vec4(position, 1.0);
    vWorldPos = worldPos.xyz;
    gl_Position = projectionMatrix * viewMatrix * worldPos;
  }
`;

const WATER_FRAGMENT_SHADER = /* glsl */ `
  uniform float uTime;
  uniform sampler2D uDiffuseMap;
  uniform float uHasDiffuseMap;
  uniform sampler2D uNormalMapA;
  uniform sampler2D uNormalMapB;
  uniform vec3 uSunDir;
  uniform vec3 uCameraPos;
  uniform vec3 uShallowColor;
  uniform vec3 uDeepColor;
  uniform vec3 uFoamColor;

  varying vec3 vWorldPos;
  varying vec2 vUv;
  varying float vShoreDist;

  float hash21(vec2 p) {
    p = fract(p * vec2(123.34, 456.21));
    p += dot(p, p + 45.32);
    return fract(p.x * p.y);
  }

  float valueNoise(vec2 p) {
    vec2 i = floor(p);
    vec2 f = fract(p);
    f = f * f * (3.0 - 2.0 * f);
    float a = hash21(i);
    float b = hash21(i + vec2(1.0, 0.0));
    float c = hash21(i + vec2(0.0, 1.0));
    float d = hash21(i + vec2(1.0, 1.0));
    return mix(mix(a, b, f.x), mix(c, d, f.x), f.y);
  }

  void main() {
    // Dual-scrolling normal maps moving in opposing directions
    vec2 uvA = vWorldPos.xz * 0.42 + vec2(uTime * 0.048, uTime * 0.029);
    vec2 uvB = vWorldPos.xz * 0.64 - vec2(uTime * 0.039, -uTime * 0.033);

    vec3 nA = texture2D(uNormalMapA, uvA).xyz * 2.0 - 1.0;
    vec3 nB = texture2D(uNormalMapB, uvB).xyz * 2.0 - 1.0;
    vec3 N = normalize(vec3((nA.x + nB.x) * 0.6, 1.0, (nA.y + nB.y) * 0.6));

    vec3 V = normalize(uCameraPos - vWorldPos);
    vec3 L = normalize(uSunDir);
    vec3 H = normalize(L + V);

    // Depth-based blue-teal color gradient
    float depthFactor = clamp(vShoreDist / 1.15, 0.0, 1.0);
    vec3 waterCol = mix(uShallowColor, uDeepColor, smoothstep(0.0, 1.0, depthFactor));

    if (uHasDiffuseMap > 0.5) {
      vec3 texCol = texture2D(uDiffuseMap, vWorldPos.xz * 0.32 + N.xz * 0.12).rgb;
      waterCol = mix(waterCol, waterCol * 0.55 + texCol * 0.65, 0.55);
    }

    // Distorted sky/Fresnel reflection
    float fresnel = pow(1.0 - max(dot(N, V), 0.0), 3.0);
    vec3 skyReflect = vec3(0.32, 0.68, 0.86);
    waterCol = mix(waterCol, skyReflect, fresnel * 0.42);

    // Directional diffuse wrap + bright sparkling Eador specular highlights
    float diffuse = max(dot(N, L), 0.0) * 0.35 + 0.65;
    waterCol *= diffuse;

    float specBroad = pow(max(dot(N, H), 0.0), 72.0) * 0.85;
    float specSparkle = pow(max(dot(N, H), 0.0), 260.0) * 2.5;
    waterCol += vec3(1.0, 0.97, 0.86) * (specBroad + specSparkle);

    // Depth-based noisy shore foam + outer coastal ripple ring
    float n1 = valueNoise(vWorldPos.xz * 5.2 + vec2(uTime * 0.35, -uTime * 0.25));
    float n2 = valueNoise(vWorldPos.xz * 10.4 - vec2(uTime * 0.28, uTime * 0.31));
    float shoreNoise = n1 * 0.65 + n2 * 0.35;

    float shoreFoam = 1.0 - smoothstep(0.02, 0.32, vShoreDist + shoreNoise * 0.14);
    float rippleRing =
      smoothstep(0.58, 0.94, sin(vShoreDist * 22.0 - uTime * 2.4 + shoreNoise * 2.4)) *
      (1.0 - smoothstep(0.05, 0.48, vShoreDist));
    float totalFoam = clamp(shoreFoam + rippleRing * 0.6, 0.0, 1.0);

    vec3 finalCol = mix(waterCol, uFoamColor, totalFoam * 0.92);
    gl_FragColor = vec4(finalCol, 1.0);
  }
`;

export function createEadorWaterMaterial(
  normalMapA: THREE.Texture,
  normalMapB: THREE.Texture
): THREE.ShaderMaterial {
  const fallbackTex = new THREE.DataTexture(
    new Uint8Array([20, 75, 110, 255]),
    1,
    1,
    THREE.RGBAFormat
  );
  fallbackTex.needsUpdate = true;

  const mat = new THREE.ShaderMaterial({
    uniforms: {
      uTime: { value: 0 },
      uDiffuseMap: { value: fallbackTex },
      uHasDiffuseMap: { value: 0 },
      uNormalMapA: { value: normalMapA },
      uNormalMapB: { value: normalMapB },
      uSunDir: { value: new THREE.Vector3(0.45, 0.8, 0.35).normalize() },
      uCameraPos: { value: new THREE.Vector3(0, 14, 14) },
      uShallowColor: { value: new THREE.Color(0x2899a2) },
      uDeepColor: { value: new THREE.Color(0x0b3856) },
      uFoamColor: { value: new THREE.Color(0xeef8ff) },
    },
    vertexShader: WATER_VERTEX_SHADER,
    fragmentShader: WATER_FRAGMENT_SHADER,
  });
  mat.userData.isSharedAsset = true;
  return mat;
}

const RIVER_FRAGMENT_SHADER = `
  uniform float uTime;
  uniform sampler2D uNormalMapA;
  uniform sampler2D uNormalMapB;
  uniform vec3 uSunDir;
  uniform vec3 uCameraPos;
  uniform vec3 uShallowColor;
  uniform vec3 uDeepColor;
  uniform vec3 uFoamColor;

  varying vec3 vWorldPos;
  varying vec2 vUv;
  varying float vShoreDist;

  float hash21(vec2 p) {
    p = fract(p * vec2(123.34, 456.21));
    p += dot(p, p + 45.32);
    return fract(p.x * p.y);
  }

  float valueNoise(vec2 p) {
    vec2 i = floor(p);
    vec2 f = fract(p);
    f = f * f * (3.0 - 2.0 * f);
    float a = hash21(i);
    float b = hash21(i + vec2(1.0, 0.0));
    float c = hash21(i + vec2(0.0, 1.0));
    float d = hash21(i + vec2(1.0, 1.0));
    return mix(mix(a, b, f.x), mix(c, d, f.x), f.y);
  }

  void main() {
    // Downstream-scrolling normal maps (vUv.y increases downstream)
    vec2 uvA = vec2(vUv.x * 2.2, vUv.y * 2.8 - uTime * 1.15);
    vec2 uvB = vec2(vUv.x * 3.1 + 0.35, vUv.y * 4.2 - uTime * 1.65);

    vec3 nA = texture2D(uNormalMapA, uvA).xyz * 2.0 - 1.0;
    vec3 nB = texture2D(uNormalMapB, uvB).xyz * 2.0 - 1.0;
    vec3 N = normalize(vec3((nA.x + nB.x) * 0.55, 1.0, (nA.y + nB.y) * 0.55));

    vec3 V = normalize(uCameraPos - vWorldPos);
    vec3 L = normalize(uSunDir);
    vec3 H = normalize(L + V);

    // Bank-to-center gradient (vUv.x = 0.5 at channel center, 0 or 1 at banks)
    float edgeDist = abs(vUv.x - 0.5) * 2.0;
    float centerDepth = clamp(1.0 - edgeDist * edgeDist, 0.0, 1.0);
    vec3 waterCol = mix(uShallowColor, uDeepColor, smoothstep(0.0, 0.85, centerDepth));

    // Sky Fresnel reflection
    float fresnel = pow(1.0 - max(dot(N, V), 0.0), 3.0);
    waterCol = mix(waterCol, vec3(0.36, 0.72, 0.88), fresnel * 0.38);

    // Directional diffuse + fast-moving river sparkles
    float diffuse = max(dot(N, L), 0.0) * 0.35 + 0.65;
    waterCol *= diffuse;
    float specBroad = pow(max(dot(N, H), 0.0), 64.0) * 0.75;
    float specSparkle = pow(max(dot(N, H), 0.0), 220.0) * 2.2;
    waterCol += vec3(1.0, 0.97, 0.86) * (specBroad + specSparkle);

    // Downstream current streaks & bank froth
    float streakNoise = valueNoise(vec2(vUv.x * 8.0, vUv.y * 2.4 - uTime * 1.9));
    float fineStreak = valueNoise(vec2(vUv.x * 14.0 + 3.1, vUv.y * 3.6 - uTime * 2.4));
    float currentFoam = smoothstep(0.66, 0.92, streakNoise * 0.65 + fineStreak * 0.35) * centerDepth * 0.55;
    float bankFoam = smoothstep(0.62, 0.94, edgeDist + (streakNoise - 0.5) * 0.18) * 0.65;

    float totalFoam = clamp(currentFoam + bankFoam, 0.0, 1.0);
    vec3 finalCol = mix(waterCol, uFoamColor, totalFoam * 0.85);

    // Soft alpha fade at outer riverbanks so it blends smoothly with surrounding terrain
    float bankAlpha = smoothstep(1.0, 0.78, edgeDist);
    gl_FragColor = vec4(finalCol, bankAlpha * 0.94);
  }
`;

export function createEadorRiverMaterial(
  normalMapA: THREE.Texture,
  normalMapB: THREE.Texture
): THREE.ShaderMaterial {
  const mat = new THREE.ShaderMaterial({
    uniforms: {
      uTime: { value: 0 },
      uNormalMapA: { value: normalMapA },
      uNormalMapB: { value: normalMapB },
      uSunDir: { value: new THREE.Vector3(0.45, 0.8, 0.35).normalize() },
      uCameraPos: { value: new THREE.Vector3(0, 14, 14) },
      uShallowColor: { value: new THREE.Color(0x2ea6b8) },
      uDeepColor: { value: new THREE.Color(0x145d80) },
      uFoamColor: { value: new THREE.Color(0xeef8ff) },
    },
    vertexShader: WATER_VERTEX_SHADER,
    fragmentShader: RIVER_FRAGMENT_SHADER,
    transparent: true,
    depthWrite: false,
  });
  mat.userData.isSharedAsset = true;
  return mat;
}
