import * as THREE from 'three';

export enum GrassModelType {
  STANDARD = 0, // 2 crossed perpendicular quads (4 triangles, 8 vertices)
  DENSE = 1,    // 3 radial star quads at 60 deg (6 triangles, 12 vertices)
  TUFT = 2,     // 2 crossed quads with outward angled V-flair (4 triangles, 8 vertices)
}

/**
 * Creates a procedural 128x128 RGBA texture with low-poly stylized blades of grass.
 * Variant index (0, 1, or 2) provides distinct blade arrangement, height profile, and color hue.
 * Uses a DataTexture with alpha transparency so that no network request or asset file is needed.
 * The texture is very low resolution (128x128 = 16,384 pixels / 64 KB) to consume minimal resources.
 */
export function createGrassClumpTexture(variant: number = 0): THREE.DataTexture {
  const size = 128;
  const data = new Uint8Array(size * size * 4);

  // Background is completely transparent
  data.fill(0);

  type BladeDef = {
    startX: number;
    endX: number;
    height: number;
    width: number;
    curve: number;
    baseColor: [number, number, number];
    tipColor: [number, number, number];
    isFlowerStem?: boolean;
    flowerColor?: [number, number, number];
  };

  let blades: BladeDef[] = [];

  if (variant === 0) {
    // Model 0: Standard Lush Meadow Grass (medium-tall, rich green blades arching symmetrically)
    blades = [
      { startX: 28, endX: 18, height: 95, width: 9, curve: -0.4, baseColor: [52, 108, 48], tipColor: [98, 168, 62] },
      { startX: 46, endX: 38, height: 110, width: 11, curve: -0.2, baseColor: [44, 96, 42], tipColor: [115, 185, 70] },
      { startX: 64, endX: 65, height: 118, width: 12, curve: 0.05, baseColor: [48, 102, 45], tipColor: [130, 198, 75] },
      { startX: 82, endX: 92, height: 108, width: 11, curve: 0.25, baseColor: [45, 98, 42], tipColor: [112, 180, 68] },
      { startX: 100, endX: 114, height: 92, width: 9, curve: 0.45, baseColor: [50, 104, 46], tipColor: [95, 162, 60] },
      { startX: 38, endX: 26, height: 75, width: 8, curve: -0.3, baseColor: [38, 85, 36], tipColor: [88, 150, 56] },
      { startX: 90, endX: 102, height: 78, width: 8, curve: 0.35, baseColor: [40, 88, 38], tipColor: [90, 155, 58] },
    ];
  } else if (variant === 1) {
    // Model 1: Wild Golden Wheat / Tall Dry Grass (slender, taller stalks with sun-dried golden-amber tips & seed heads)
    blades = [
      { startX: 24, endX: 14, height: 112, width: 8, curve: -0.5, baseColor: [58, 92, 38], tipColor: [175, 162, 75] },
      { startX: 42, endX: 32, height: 122, width: 9, curve: -0.3, baseColor: [54, 88, 35], tipColor: [188, 175, 82], isFlowerStem: true, flowerColor: [210, 195, 110] },
      { startX: 60, endX: 58, height: 124, width: 10, curve: -0.05, baseColor: [60, 95, 40], tipColor: [195, 180, 85], isFlowerStem: true, flowerColor: [220, 205, 120] },
      { startX: 78, endX: 86, height: 120, width: 9, curve: 0.2, baseColor: [56, 90, 36], tipColor: [182, 170, 78], isFlowerStem: true, flowerColor: [215, 198, 112] },
      { startX: 96, endX: 110, height: 114, width: 8, curve: 0.45, baseColor: [58, 92, 38], tipColor: [178, 165, 75] },
      { startX: 34, endX: 22, height: 85, width: 7, curve: -0.35, baseColor: [48, 80, 32], tipColor: [155, 142, 65] },
      { startX: 86, endX: 98, height: 88, width: 7, curve: 0.35, baseColor: [50, 82, 34], tipColor: [160, 148, 68] },
    ];
  } else {
    // Model 2: Broadleaf Shrub / Flower Tuft (shorter, wider leaves with small yellow/white dandelion/wildflower dots at the top)
    blades = [
      { startX: 20, endX: 10, height: 75, width: 14, curve: -0.6, baseColor: [42, 85, 38], tipColor: [85, 148, 55] },
      { startX: 38, endX: 28, height: 90, width: 16, curve: -0.35, baseColor: [38, 80, 35], tipColor: [98, 165, 62], isFlowerStem: true, flowerColor: [245, 230, 80] },
      { startX: 56, endX: 54, height: 96, width: 17, curve: -0.05, baseColor: [40, 82, 36], tipColor: [105, 172, 68], isFlowerStem: true, flowerColor: [255, 240, 95] },
      { startX: 74, endX: 82, height: 92, width: 16, curve: 0.3, baseColor: [38, 80, 35], tipColor: [100, 168, 64], isFlowerStem: true, flowerColor: [248, 232, 85] },
      { startX: 92, endX: 108, height: 78, width: 14, curve: 0.55, baseColor: [42, 85, 38], tipColor: [88, 150, 58] },
      { startX: 32, endX: 20, height: 60, width: 12, curve: -0.45, baseColor: [35, 75, 32], tipColor: [78, 138, 50] },
      { startX: 80, endX: 95, height: 62, width: 12, curve: 0.45, baseColor: [35, 75, 32], tipColor: [80, 140, 52] },
    ];
  }

  for (const blade of blades) {
    const bottomY = 0;
    const topY = Math.min(size - 4, bottomY + blade.height);

    for (let y = bottomY; y <= topY; y++) {
      const t = (y - bottomY) / blade.height; // 0.0 at base (y=0) to 1.0 at tip (y=topY)
      // Center X with quadratic curve
      const centerX = blade.startX + (blade.endX - blade.startX) * t + blade.curve * Math.sin(t * Math.PI) * 14;
      // Taper width from base to pointed tip
      const currentHalfWidth = (blade.width * 0.5) * (1.0 - t * 0.88);

      const xMin = Math.max(0, Math.floor(centerX - currentHalfWidth));
      const xMax = Math.min(size - 1, Math.ceil(centerX + currentHalfWidth));

      // Color interpolation from darker root to sunlit tip
      let r = Math.round(blade.baseColor[0] + (blade.tipColor[0] - blade.baseColor[0]) * t);
      let g = Math.round(blade.baseColor[1] + (blade.tipColor[1] - blade.baseColor[1]) * t);
      let b = Math.round(blade.baseColor[2] + (blade.tipColor[2] - blade.baseColor[2]) * t);

      // If blade has a flower head or seed cluster at the top 12%
      if (blade.isFlowerStem && blade.flowerColor && t > 0.88) {
        const flowerBlend = (t - 0.88) / 0.12;
        r = Math.round(r * (1.0 - flowerBlend) + blade.flowerColor[0] * flowerBlend);
        g = Math.round(g * (1.0 - flowerBlend) + blade.flowerColor[1] * flowerBlend);
        b = Math.round(b * (1.0 - flowerBlend) + blade.flowerColor[2] * flowerBlend);
      }

      for (let x = xMin; x <= xMax; x++) {
        const distFromCenter = Math.abs(x - centerX);
        let alpha = 255;
        if (distFromCenter > currentHalfWidth - 1.0) {
          // Soft antialiased edge
          alpha = Math.max(0, Math.min(255, Math.round(255 * (currentHalfWidth - distFromCenter))));
        }

        if (alpha > 0) {
          const idx = (y * size + x) * 4;
          // Alpha blending over existing pixels in clump
          const prevA = data[idx + 3] / 255;
          const newA = alpha / 255;
          const outA = newA + prevA * (1.0 - newA);

          if (outA > 0) {
            data[idx] = Math.round((r * newA + data[idx] * prevA * (1.0 - newA)) / outA);
            data[idx + 1] = Math.round((g * newA + data[idx + 1] * prevA * (1.0 - newA)) / outA);
            data[idx + 2] = Math.round((b * newA + data[idx + 2] * prevA * (1.0 - newA)) / outA);
            data[idx + 3] = Math.round(outA * 255);
          }
        }
      }
    }
  }

  const texture = new THREE.DataTexture(data, size, size, THREE.RGBAFormat);
  texture.generateMipmaps = true;
  texture.minFilter = THREE.LinearMipmapLinearFilter;
  texture.magFilter = THREE.LinearFilter;
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.needsUpdate = true;
  texture.name = `GrassClump_128_v${variant}`;

  return texture;
}

export interface GrassClumpInstanceData {
  x: number;
  y: number;
  z: number;
  scale?: number;
  rotationY?: number;
  modelType?: GrassModelType;
}

/**
 * Procedural low-overhead Grass System with multiple model/texture variations.
 * Supports at least 3 distinct low-poly models:
 * - Model 0 (Standard): 2 crossed quads at 90 deg (4 triangles, 8 vertices) + Lush Green texture
 * - Model 1 (Dense Star): 3 radial quads at 60 deg (6 triangles, 12 vertices) + Golden Wheat/Amber texture
 * - Model 2 (V-Tuft): 2 outward-angled V-flair quads (4 triangles, 8 vertices) + Wildflower/Broadleaf texture
 *
 * All models are animated efficiently via vertex shader displacement reacting to wind direction & strength.
 */
export class GrassFieldSystem {
  public readonly group: THREE.Group = new THREE.Group();
  public instancedMeshes: THREE.InstancedMesh[] = [];

  private textures: THREE.DataTexture[] = [];
  private materials: THREE.MeshStandardMaterial[] = [];
  private geometries: THREE.BufferGeometry[] = [];
  private dummy: THREE.Object3D = new THREE.Object3D();

  // Wind uniforms for vertex displacement
  private windTime: number = 0;
  private windAngleRad: number = Math.PI * 0.25;
  private windStrength: number = 1.0;
  private uniforms: {
    uWindTime: { value: number };
    uWindDir: { value: THREE.Vector2 };
    uWindStrength: { value: number };
  };

  private totalCount: number = 0;

  constructor() {
    this.group.name = 'GrassFieldSystem';

    this.uniforms = {
      uWindTime: { value: 0 },
      uWindDir: { value: new THREE.Vector2(Math.cos(this.windAngleRad), Math.sin(this.windAngleRad)) },
      uWindStrength: { value: this.windStrength },
    };

    // Initialize 3 distinct low-poly geometries and 3 distinct 128x128 textures
    this.geometries = [
      GrassFieldSystem.createCrossedQuadsGeometry(0.38, 0.32),
      GrassFieldSystem.createDenseStarGeometry(0.36, 0.35),
      GrassFieldSystem.createTuftVGeometry(0.42, 0.28),
    ];

    for (let i = 0; i < 3; i++) {
      const tex = createGrassClumpTexture(i);
      this.textures.push(tex);

      const mat = new THREE.MeshStandardMaterial({
        map: tex,
        transparent: true,
        alphaTest: 0.35,
        roughness: 0.9,
        metalness: 0.05,
        side: THREE.DoubleSide,
        depthWrite: true,
      });

      mat.onBeforeCompile = (shader) => {
        shader.uniforms.uWindTime = this.uniforms.uWindTime;
        shader.uniforms.uWindDir = this.uniforms.uWindDir;
        shader.uniforms.uWindStrength = this.uniforms.uWindStrength;

        shader.vertexShader = shader.vertexShader.replace(
          '#include <common>',
          `#include <common>
uniform float uWindTime;
uniform vec2 uWindDir;
uniform float uWindStrength;
`
        );

        shader.vertexShader = shader.vertexShader.replace(
          '#include <begin_vertex>',
          `#include <begin_vertex>
// Local Y >= 0 is height above ground. Base (y=0) stays pinned, tips sway with wind
float heightFactor = clamp(position.y / 0.35, 0.0, 1.0);
float bendFactor = heightFactor * heightFactor;

// World position offset to desynchronize clumps
vec4 worldInstancePos = instanceMatrix * vec4(0.0, 0.0, 0.0, 1.0);
float clumpPhase = worldInstancePos.x * 1.8 + worldInstancePos.z * 1.3;

// Wind wave oscillating sway + gust displacement (doubled frequency)
float swayCycle = sin(uWindTime * (5.6 + uWindStrength * 2.4) + clumpPhase);
float gustWave = sin(uWindTime * 2.4 + worldInstancePos.x * 0.8 + worldInstancePos.z * 0.8);
float swayAmt = (0.05 + 0.07 * uWindStrength) * bendFactor * (0.65 + 0.35 * swayCycle) + (0.03 * uWindStrength * gustWave * bendFactor);

transformed.x += uWindDir.x * swayAmt;
transformed.z += uWindDir.y * swayAmt;
transformed.y -= abs(swayAmt) * 0.22;
`
        );
      };

      this.materials.push(mat);
    }
  }

  /**
   * Model 0: 2 crossed vertical quads at 90 degrees (4 triangles, 8 vertices total).
   */
  public static createCrossedQuadsGeometry(width = 0.38, height = 0.32): THREE.BufferGeometry {
    const halfW = width * 0.5;

    const vertices = new Float32Array([
      // Quad 1 (along X)
      -halfW, 0, 0,
       halfW, 0, 0,
       halfW, height, 0,
      -halfW, height, 0,

      // Quad 2 (along Z)
      0, 0, -halfW,
      0, 0,  halfW,
      0, height,  halfW,
      0, height, -halfW,
    ]);

    const uvs = new Float32Array([
      0, 0,  1, 0,  1, 1,  0, 1,
      0, 0,  1, 0,  1, 1,  0, 1,
    ]);

    const indices = [
      0, 1, 2,  0, 2, 3,
      4, 5, 6,  4, 6, 7,
    ];

    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(vertices, 3));
    geo.setAttribute('uv', new THREE.BufferAttribute(uvs, 2));
    geo.setIndex(indices);
    geo.computeVertexNormals();
    return geo;
  }

  /**
   * Model 1: 3 radial quads at 60 degree intervals (star pattern, 6 triangles, 12 vertices total).
   */
  public static createDenseStarGeometry(width = 0.36, height = 0.35): THREE.BufferGeometry {
    const halfW = width * 0.5;
    const angles = [0, Math.PI / 3, (2 * Math.PI) / 3];

    const vertices: number[] = [];
    const uvs: number[] = [];
    const indices: number[] = [];

    angles.forEach((ang, q) => {
      const cosA = Math.cos(ang) * halfW;
      const sinA = Math.sin(ang) * halfW;
      const baseIdx = q * 4;

      // Bottom-left, Bottom-right, Top-right, Top-left
      vertices.push(
        -cosA, 0, -sinA,
         cosA, 0,  sinA,
         cosA, height,  sinA,
        -cosA, height, -sinA
      );

      uvs.push(0, 0,  1, 0,  1, 1,  0, 1);
      indices.push(baseIdx, baseIdx + 1, baseIdx + 2, baseIdx, baseIdx + 2, baseIdx + 3);
    });

    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(new Float32Array(vertices), 3));
    geo.setAttribute('uv', new THREE.BufferAttribute(new Float32Array(uvs), 2));
    geo.setIndex(indices);
    geo.computeVertexNormals();
    return geo;
  }

  /**
   * Model 2: 2 quads with an outward V-shaped spread / lean angle (4 triangles, 8 vertices total).
   */
  public static createTuftVGeometry(width = 0.42, height = 0.28): THREE.BufferGeometry {
    const halfW = width * 0.5;
    const topOutward = 0.08;

    const vertices = new Float32Array([
      // Quad 1: angled slightly forward/back
      -halfW, 0, 0,
       halfW, 0, 0,
       halfW + topOutward, height,  topOutward,
      -halfW - topOutward, height,  topOutward,

      // Quad 2: angled perpendicular
      0, 0, -halfW,
      0, 0,  halfW,
      -topOutward, height,  halfW + topOutward,
      -topOutward, height, -halfW - topOutward,
    ]);

    const uvs = new Float32Array([
      0, 0,  1, 0,  1, 1,  0, 1,
      0, 0,  1, 0,  1, 1,  0, 1,
    ]);

    const indices = [
      0, 1, 2,  0, 2, 3,
      4, 5, 6,  4, 6, 7,
    ];

    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(vertices, 3));
    geo.setAttribute('uv', new THREE.BufferAttribute(uvs, 2));
    geo.setIndex(indices);
    geo.computeVertexNormals();
    return geo;
  }

  /**
   * Populates grass clumps across playable tiles and outer borders,
   * categorizing instances across the 3 distinct model & texture variants.
   */
  public buildGrassField(positions: GrassClumpInstanceData[]): void {
    this.clear();

    if (positions.length === 0) return;

    this.totalCount = positions.length;

    // Group clump positions by model type (0, 1, or 2)
    const groupedPositions: GrassClumpInstanceData[][] = [[], [], []];
    for (let i = 0; i < positions.length; i++) {
      const p = positions[i];
      const modelIdx = p.modelType !== undefined ? (p.modelType % 3) : (i % 3);
      groupedPositions[modelIdx].push(p);
    }

    // Build separate instanced mesh for each variation
    for (let m = 0; m < 3; m++) {
      const groupList = groupedPositions[m];
      if (groupList.length === 0) continue;

      const geo = this.geometries[m];
      const mat = this.materials[m];
      const instancedMesh = new THREE.InstancedMesh(geo, mat, groupList.length);
      instancedMesh.name = `GrassInstancedMesh_Var${m}`;
      instancedMesh.castShadow = false;
      instancedMesh.receiveShadow = true;

      for (let i = 0; i < groupList.length; i++) {
        const p = groupList[i];
        const s = p.scale ?? (0.85 + Math.random() * 0.35);
        const rotY = p.rotationY ?? (Math.random() * Math.PI * 2);

        this.dummy.position.set(p.x, p.y, p.z);
        this.dummy.scale.set(s, s, s);
        this.dummy.rotation.set(0, rotY, 0);
        this.dummy.updateMatrix();

        instancedMesh.setMatrixAt(i, this.dummy.matrix);
      }

      instancedMesh.instanceMatrix.needsUpdate = true;
      this.instancedMeshes.push(instancedMesh);
      this.group.add(instancedMesh);
    }
  }

  public getCount(): number {
    return this.totalCount;
  }

  public getModelCount(): number {
    return this.geometries.length;
  }

  public getTexture(variant = 0): THREE.DataTexture {
    return this.textures[variant] ?? this.textures[0];
  }

  public getMaterial(variant = 0): THREE.MeshStandardMaterial {
    return this.materials[variant] ?? this.materials[0];
  }

  public getGeometry(variant = 0): THREE.BufferGeometry {
    return this.geometries[variant] ?? this.geometries[0];
  }

  /**
   * Sets current wind parameters across all model instances.
   */
  public setWindState(windAngleRad: number, windStrength: number = 1.0): void {
    this.windAngleRad = windAngleRad;
    this.windStrength = Math.max(0.1, windStrength);

    this.uniforms.uWindDir.value.set(Math.cos(windAngleRad), Math.sin(windAngleRad));
    this.uniforms.uWindStrength.value = this.windStrength;
  }

  public getWindState(): { angleRad: number; strength: number } {
    return {
      angleRad: this.windAngleRad,
      strength: this.windStrength,
    };
  }

  /**
   * Frame-by-frame animation update for wind sway and gust ripple.
   */
  public update(deltaMS: number): void {
    if (this.totalCount === 0) return;

    this.windTime += deltaMS * 0.001;
    this.uniforms.uWindTime.value = this.windTime;
  }

  public clear(): void {
    for (const mesh of this.instancedMeshes) {
      this.group.remove(mesh);
      mesh.dispose();
    }
    this.instancedMeshes = [];
    this.totalCount = 0;
  }

  public dispose(): void {
    this.clear();
    for (const geo of this.geometries) {
      geo.dispose();
    }
    for (const tex of this.textures) {
      tex.dispose();
    }
    for (const mat of this.materials) {
      mat.dispose();
    }
  }
}
