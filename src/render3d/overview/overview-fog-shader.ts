import * as THREE from 'three';

export interface FogLayerMaterialOptions {
  fogMask: THREE.DataTexture;
  mapMin: THREE.Vector2;
  mapSize: THREE.Vector2;
  scrollSpeed: THREE.Vector2;
  noiseScale: number;
  layerOpacity: number;
  seedOffset: number;
}

export function createFogMaskTexture(size: number = 96): THREE.DataTexture {
  const data = new Uint8Array(size * size * 4);
  data.fill(255);
  const tex = new THREE.DataTexture(data, size, size, THREE.RGBAFormat);
  tex.wrapS = THREE.ClampToEdgeWrapping;
  tex.wrapT = THREE.ClampToEdgeWrapping;
  tex.magFilter = THREE.LinearFilter;
  tex.minFilter = THREE.LinearFilter;
  tex.needsUpdate = true;
  return tex;
}

const FOG_VERTEX_SHADER = /* glsl */ `
  varying vec3 vWorldPos;

  void main() {
    vec4 worldPos = modelMatrix * vec4(position, 1.0);
    vWorldPos = worldPos.xyz;
    gl_Position = projectionMatrix * viewMatrix * worldPos;
  }
`;

const FOG_FRAGMENT_SHADER = /* glsl */ `
  uniform float uTime;
  uniform sampler2D uFogMask;
  uniform vec2 uMapMin;
  uniform vec2 uMapSize;
  uniform vec2 uScrollSpeed;
  uniform float uNoiseScale;
  uniform float uLayerOpacity;
  uniform float uSeedOffset;
  uniform vec3 uSlateBlueColor;
  uniform vec3 uWarmGreyColor;

  varying vec3 vWorldPos;

  float hash21(vec2 p) {
    p = fract(p * vec2(127.1, 311.7));
    p += dot(p, p + 34.23);
    return fract(p.x * p.y);
  }

  float noise(vec2 p) {
    vec2 i = floor(p);
    vec2 f = fract(p);
    vec2 u = f * f * (3.0 - 2.0 * f);
    float a = hash21(i);
    float b = hash21(i + vec2(1.0, 0.0));
    float c = hash21(i + vec2(0.0, 1.0));
    float d = hash21(i + vec2(1.0, 1.0));
    return mix(mix(a, b, u.x), mix(c, d, u.x), u.y);
  }

  float fbm(vec2 p) {
    float val = 0.0;
    float amp = 0.5;
    mat2 rot = mat2(0.8, 0.6, -0.6, 0.8);
    for (int i = 0; i < 4; i++) {
      val += amp * noise(p);
      p = rot * p * 2.02 + vec2(13.1, 7.7);
      amp *= 0.5;
    }
    return val;
  }

  void main() {
    vec2 maskUv = clamp((vWorldPos.xz - uMapMin) / max(uMapSize, vec2(0.001)), 0.0, 1.0);
    float rawMask = texture2D(uFogMask, maskUv).r;

    // Outside the map shard bounds, blend seamlessly into dense Astral Plane clouds
    vec2 edgeDist = min(maskUv, 1.0 - maskUv);
    float borderFog = 1.0 - smoothstep(0.0, 0.06, min(edgeDist.x, edgeDist.y));
    float baseFog = max(rawMask, borderFog);

    vec2 p = vWorldPos.xz * uNoiseScale + uScrollSpeed * uTime + vec2(uSeedOffset);
    vec2 warp = vec2(
      fbm(p + vec2(1.7, 9.2)),
      fbm(p + vec2(8.3, 2.8) - uScrollSpeed * uTime * 0.45)
    );
    float cloudDensity = fbm(p + warp * 1.45);

    // Smooth organic fade at the edge of explored/visible territory
    float erodedMask = smoothstep(0.08, 0.92, baseFog + (cloudDensity - 0.5) * 0.42 * baseFog * (1.0 - baseFog) * 4.0);
    float alpha = erodedMask * smoothstep(0.18, 0.85, cloudDensity + baseFog * 0.35) * uLayerOpacity;

    if (alpha < 0.01) discard;

    vec3 cloudColor = mix(uSlateBlueColor, uWarmGreyColor, smoothstep(0.28, 0.82, cloudDensity));
    gl_FragColor = vec4(cloudColor, alpha);
  }
`;

export function createBillowingFogLayerMaterial(
  options: FogLayerMaterialOptions
): THREE.ShaderMaterial {
  const mat = new THREE.ShaderMaterial({
    uniforms: {
      uTime: { value: 0 },
      uFogMask: { value: options.fogMask },
      uMapMin: { value: options.mapMin.clone() },
      uMapSize: { value: options.mapSize.clone() },
      uScrollSpeed: { value: options.scrollSpeed.clone() },
      uNoiseScale: { value: options.noiseScale },
      uLayerOpacity: { value: options.layerOpacity },
      uSeedOffset: { value: options.seedOffset },
      uSlateBlueColor: { value: new THREE.Color(0x1a202c) },
      uWarmGreyColor: { value: new THREE.Color(0x7c7872) },
    },
    vertexShader: FOG_VERTEX_SHADER,
    fragmentShader: FOG_FRAGMENT_SHADER,
    transparent: true,
    depthWrite: false,
  });
  mat.userData.isSharedAsset = true;
  return mat;
}
