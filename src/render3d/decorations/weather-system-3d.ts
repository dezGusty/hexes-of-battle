import * as THREE from 'three';
import { WeatherType } from '../../ui/weather-dropdown';

export { WeatherType };

/**
 * Creates a procedural 128x128 soft cloud/mist RGBA DataTexture for low-lying ground fog.
 * Generates organic Gaussian cloudy blobs with smooth alpha falloff.
 */
export function createGroundFogNoiseTexture(): THREE.DataTexture {
  const size = 128;
  const data = new Uint8Array(size * size * 4);

  // Generate 8 soft Gaussian noise blobs with wrapping coordinates
  const blobs: Array<{ cx: number; cy: number; r: number; weight: number }> = [
    { cx: 32, cy: 32, r: 28, weight: 0.9 },
    { cx: 96, cy: 36, r: 32, weight: 0.85 },
    { cx: 64, cy: 80, r: 34, weight: 1.0 },
    { cx: 20, cy: 90, r: 24, weight: 0.75 },
    { cx: 104, cy: 96, r: 26, weight: 0.8 },
    { cx: 64, cy: 30, r: 22, weight: 0.7 },
    { cx: 110, cy: 60, r: 20, weight: 0.65 },
    { cx: 16, cy: 50, r: 20, weight: 0.65 },
  ];

  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      let density = 0;
      for (let b = 0; b < blobs.length; b++) {
        const blob = blobs[b];
        // Toroidal distance for seamless UV wrapping
        const dx = Math.min(Math.abs(x - blob.cx), size - Math.abs(x - blob.cx));
        const dy = Math.min(Math.abs(y - blob.cy), size - Math.abs(y - blob.cy));
        const distSq = dx * dx + dy * dy;
        const radiusSq = blob.r * blob.r;
        if (distSq < radiusSq) {
          const factor = 1 - distSq / radiusSq;
          density += factor * factor * blob.weight;
        }
      }

      // Add high-frequency subtle variation
      const noise = ((Math.sin(x * 0.45) * Math.cos(y * 0.45) + 1) * 0.5) * 0.18;
      const alpha = Math.min(1.0, Math.max(0.0, (density * 0.55 + noise) * 0.85));

      const idx = (y * size + x) * 4;
      // Light silver-gray mist color (220, 226, 234)
      data[idx] = 220;
      data[idx + 1] = 226;
      data[idx + 2] = 234;
      data[idx + 3] = Math.round(alpha * 255);
    }
  }

  const texture = new THREE.DataTexture(data, size, size, THREE.RGBAFormat);
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  texture.minFilter = THREE.LinearMipmapLinearFilter;
  texture.magFilter = THREE.LinearFilter;
  texture.generateMipmaps = true;
  texture.needsUpdate = true;
  texture.name = 'GroundFogNoise_128';
  return texture;
}

/**
 * 3D Weather System managing purely visual atmospheric effects:
 * - None (default, Sunny): restores rich sunlight and clean atmosphere
 * - Rain: cloudy overcast lighting, 2000 falling rain streak particles reacting to wind
 * - Thunderstorm: dark tempest lighting, rain, lightning sky flashes, and occasional vicinity thunder strikes
 * - Fog: light gray scene fog + ground-level fog planes hovering at unit foot height ($y \le 0.35$)
 */
export class WeatherSystem3D {
  public readonly group: THREE.Group = new THREE.Group();
  private currentWeather: WeatherType = WeatherType.NONE;

  // Scene references
  private scene?: THREE.Scene;
  private dirLight?: THREE.DirectionalLight;
  private ambientLight?: THREE.AmbientLight;
  private hemiLight?: THREE.HemisphereLight;
  private renderer?: THREE.WebGLRenderer;

  // Baseline Sunny weather lighting & fog
  private baseDirLightColor: number = 0xfff5e6;
  private baseDirLightIntensity: number = 2.4;
  private baseAmbientColor: number = 0xffffff;
  private baseAmbientIntensity: number = 0.22;
  private baseHemiSkyColor: number = 0xddeeff;
  private baseHemiGroundColor: number = 0x223322;
  private baseHemiIntensity: number = 0.15;
  private baseFogColor: number = 0x203525;
  private baseFogDensity: number = 0.0035;
  private baseClearColor: number = 0x76a9cc;

  // Wind state
  private windAngleRad: number = Math.PI * 0.25;
  private windStrength: number = 1.0;

  // Rain particle system
  public readonly rainGroup: THREE.Group = new THREE.Group();
  private rainLineSegments?: THREE.LineSegments;
  private rainCount: number = 2000;
  private rainPositions?: Float32Array;
  private rainVelocities?: Float32Array;

  // Thunderstorm & Lightning system
  public readonly thunderGroup: THREE.Group = new THREE.Group();
  private lightningLight: THREE.DirectionalLight;
  private strikePointLight: THREE.PointLight;
  private strikeBoltMesh?: THREE.LineSegments;
  private strikeGlowDisc?: THREE.Mesh;

  private lightningTimer: number = 4.0;
  private lightningInterval: number = 5.0;
  private isSkyFlashing: boolean = false;
  private skyFlashTime: number = 0;
  private skyFlashDuration: number = 0.35;

  private thunderStrikeTimer: number = 7.0;
  private thunderStrikeInterval: number = 9.0;
  private isThunderStriking: boolean = false;
  private thunderStrikeTime: number = 0;
  private thunderStrikeDuration: number = 0.28;

  // Fog ground-level mist system
  public readonly groundFogGroup: THREE.Group = new THREE.Group();
  private fogPlanes: THREE.Mesh[] = [];
  private fogTexture?: THREE.DataTexture;

  // Sunny drifting clouds (cast shadows onto the battle map)
  public readonly driftingCloudsGroup: THREE.Group = new THREE.Group();
  private cloudMeshes: THREE.Mesh[] = [];
  private cloudTexture?: THREE.DataTexture;

  constructor() {
    this.group.name = 'WeatherSystem3D';
    this.rainGroup.name = 'RainSystem';
    this.thunderGroup.name = 'ThunderSystem';
    this.groundFogGroup.name = 'GroundFogSystem';
    this.driftingCloudsGroup.name = 'DriftingCloudsSystem';

    this.group.add(this.rainGroup);
    this.group.add(this.thunderGroup);
    this.group.add(this.groundFogGroup);
    this.group.add(this.driftingCloudsGroup);

    // Dedicated lightning directional flash light
    this.lightningLight = new THREE.DirectionalLight(0xe8f4ff, 0.0);
    this.lightningLight.name = 'LightningFlashLight';
    this.lightningLight.position.set(0, 30, 0);
    this.lightningLight.castShadow = false;
    this.thunderGroup.add(this.lightningLight);

    // Dedicated vicinity thunder strike impact point light
    this.strikePointLight = new THREE.PointLight(0x7ad4ff, 0.0, 35, 1.5);
    this.strikePointLight.name = 'ThunderStrikeImpactLight';
    this.thunderGroup.add(this.strikePointLight);

    this.initRainSystem();
    this.initGroundFogSystem();
    this.initThunderStrikeMeshes();
    this.initDriftingCloudsSystem();

    // Start with default sunny weather (all weather overlays hidden, drifting clouds active)
    this.rainGroup.visible = false;
    this.thunderGroup.visible = false;
    this.groundFogGroup.visible = false;
    this.driftingCloudsGroup.visible = true;
  }

  public attachScene(
    scene: THREE.Scene,
    dirLight?: THREE.DirectionalLight,
    ambientLight?: THREE.AmbientLight,
    hemiLight?: THREE.HemisphereLight,
    renderer?: THREE.WebGLRenderer
  ): void {
    this.scene = scene;
    this.dirLight = dirLight;
    this.ambientLight = ambientLight;
    this.hemiLight = hemiLight;
    this.renderer = renderer;

    if (this.dirLight) {
      this.baseDirLightColor = this.dirLight.color.getHex();
      this.baseDirLightIntensity = this.dirLight.intensity;
    }
    if (this.ambientLight) {
      this.baseAmbientColor = this.ambientLight.color.getHex();
      this.baseAmbientIntensity = this.ambientLight.intensity;
    }
    if (this.hemiLight) {
      this.baseHemiSkyColor = this.hemiLight.color.getHex();
      this.baseHemiGroundColor = this.hemiLight.groundColor.getHex();
      this.baseHemiIntensity = this.hemiLight.intensity;
    }
    if (this.scene?.fog instanceof THREE.FogExp2) {
      this.baseFogColor = this.scene.fog.color.getHex();
      this.baseFogDensity = this.scene.fog.density;
    }

    this.applyWeatherVisuals(this.currentWeather);
  }

  public setBaseEnvironment(fogHex: number, fogDensity: number, horizonHex: number): void {
    this.baseFogColor = fogHex;
    this.baseFogDensity = fogDensity;
    this.baseClearColor = horizonHex;
    if (this.currentWeather === WeatherType.NONE) {
      this.applySunnyLighting();
    }
  }

  public setWindState(angleRad: number, strength: number = 1.0): void {
    this.windAngleRad = angleRad;
    this.windStrength = Math.max(0.1, strength);
  }

  public getWeather(): WeatherType {
    return this.currentWeather;
  }

  public setWeather(weather: WeatherType): void {
    if (this.currentWeather === weather) return;
    this.currentWeather = weather;
    this.applyWeatherVisuals(weather);
  }

  private applyWeatherVisuals(weather: WeatherType): void {
    // Reset active timers and overlay states
    this.isSkyFlashing = false;
    this.isThunderStriking = false;
    this.lightningLight.intensity = 0.0;
    this.strikePointLight.intensity = 0.0;
    if (this.strikeBoltMesh) this.strikeBoltMesh.visible = false;
    if (this.strikeGlowDisc) this.strikeGlowDisc.visible = false;

    switch (weather) {
      case WeatherType.NONE:
        this.rainGroup.visible = false;
        this.thunderGroup.visible = false;
        this.groundFogGroup.visible = false;
        this.driftingCloudsGroup.visible = true;
        this.applySunnyLighting();
        break;

      case WeatherType.RAIN:
        this.rainGroup.visible = true;
        this.thunderGroup.visible = false;
        this.groundFogGroup.visible = false;
        this.driftingCloudsGroup.visible = false;
        this.applyRainLighting();
        break;

      case WeatherType.THUNDERSTORM:
        this.rainGroup.visible = true;
        this.thunderGroup.visible = true;
        this.groundFogGroup.visible = false;
        this.driftingCloudsGroup.visible = false;
        this.lightningTimer = 2.0 + Math.random() * 3.0;
        this.thunderStrikeTimer = 4.0 + Math.random() * 4.0;
        this.applyThunderstormLighting();
        break;

      case WeatherType.FOG:
        this.rainGroup.visible = false;
        this.thunderGroup.visible = false;
        this.groundFogGroup.visible = true;
        this.driftingCloudsGroup.visible = false;
        this.applyFogLighting();
        break;
    }
  }

  private applySunnyLighting(): void {
    if (this.dirLight) {
      this.dirLight.color.setHex(this.baseDirLightColor);
      this.dirLight.intensity = this.baseDirLightIntensity;
    }
    if (this.ambientLight) {
      this.ambientLight.color.setHex(this.baseAmbientColor);
      this.ambientLight.intensity = this.baseAmbientIntensity;
    }
    if (this.hemiLight) {
      this.hemiLight.color.setHex(this.baseHemiSkyColor);
      this.hemiLight.groundColor.setHex(this.baseHemiGroundColor);
      this.hemiLight.intensity = this.baseHemiIntensity;
    }
    if (this.scene?.fog instanceof THREE.FogExp2) {
      this.scene.fog.color.setHex(this.baseFogColor);
      this.scene.fog.density = this.baseFogDensity;
    }
    if (this.renderer?.setClearColor) {
      this.renderer.setClearColor(this.baseClearColor, 1.0);
    }
  }

  private applyRainLighting(): void {
    // Cloudy, overcast diffuse lighting
    if (this.dirLight) {
      this.dirLight.color.setHex(0x9eb0c2);
      this.dirLight.intensity = 1.8;
    }
    if (this.ambientLight) {
      this.ambientLight.color.setHex(0x657585);
      this.ambientLight.intensity = 0.35;
    }
    if (this.hemiLight) {
      this.hemiLight.color.setHex(0x758595);
      this.hemiLight.groundColor.setHex(0x2b333a);
      this.hemiLight.intensity = 0.20;
    }
    if (this.scene?.fog instanceof THREE.FogExp2) {
      this.scene.fog.color.setHex(0x505c68);
      this.scene.fog.density = 0.012;
    }
    if (this.renderer?.setClearColor) {
      this.renderer.setClearColor(0x444f5b, 1.0);
    }
  }

  private applyThunderstormLighting(): void {
    // Dark tempest storm lighting
    if (this.dirLight) {
      this.dirLight.color.setHex(0x6a7583);
      this.dirLight.intensity = 1.4;
    }
    if (this.ambientLight) {
      this.ambientLight.color.setHex(0x4a5450);
      this.ambientLight.intensity = 0.28;
    }
    if (this.hemiLight) {
      this.hemiLight.color.setHex(0x6a7486);
      this.hemiLight.groundColor.setHex(0x243726);
      this.hemiLight.intensity = 0.20;
    }
    if (this.scene?.fog instanceof THREE.FogExp2) {
      this.scene.fog.color.setHex(0x222832);
      this.scene.fog.density = 0.018;
    }
    if (this.renderer?.setClearColor) {
      this.renderer.setClearColor(0x1c212a, 1.0);
    }
  }

  private applyFogLighting(): void {
    // Diffuse morning light with light gray atmosphere
    if (this.dirLight) {
      this.dirLight.color.setHex(0xe4e8ec);
      this.dirLight.intensity = 1.7;
    }
    if (this.ambientLight) {
      this.ambientLight.color.setHex(0xd0d6dc);
      this.ambientLight.intensity = 0.55;
    }
    if (this.hemiLight) {
      this.hemiLight.color.setHex(0xdde2e8);
      this.hemiLight.groundColor.setHex(0x4a545e);
      this.hemiLight.intensity = 0.30;
    }
    if (this.scene?.fog instanceof THREE.FogExp2) {
      this.scene.fog.color.setHex(0xcfd7de);
      this.scene.fog.density = 0.024;
    }
    if (this.renderer?.setClearColor) {
      this.renderer.setClearColor(0xc2cace, 1.0);
    }
  }

  // ---------------------------------------------------------------------------
  // Rain System
  // ---------------------------------------------------------------------------

  private initRainSystem(): void {
    const count = this.rainCount;
    // Each rain drop is a line segment (2 vertices: bottom and top)
    const vertexCount = count * 2;
    const positions = new Float32Array(vertexCount * 3);
    const velocities = new Float32Array(count);

    const span = 28;
    for (let i = 0; i < count; i++) {
      const x = (Math.random() - 0.5) * span * 2;
      const y = Math.random() * 22;
      const z = (Math.random() - 0.5) * span * 2;
      const streakLen = 0.55 + Math.random() * 0.25;

      const idx = i * 6;
      // Vertex 0 (bottom)
      positions[idx] = x;
      positions[idx + 1] = y;
      positions[idx + 2] = z;

      // Vertex 1 (top)
      positions[idx + 3] = x;
      positions[idx + 4] = y + streakLen;
      positions[idx + 5] = z;

      velocities[i] = 24.0 + Math.random() * 8.0;
    }

    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));

    const material = new THREE.LineBasicMaterial({
      color: 0xc4d8ea,
      transparent: true,
      opacity: 0.65,
      depthWrite: false,
    });

    this.rainLineSegments = new THREE.LineSegments(geometry, material);
    this.rainLineSegments.frustumCulled = false;
    this.rainPositions = positions;
    this.rainVelocities = velocities;

    this.rainGroup.add(this.rainLineSegments);
  }

  private updateRain(deltaSeconds: number): void {
    if (!this.rainLineSegments || !this.rainPositions || !this.rainVelocities) return;

    const count = this.rainCount;
    const positions = this.rainPositions;
    const velocities = this.rainVelocities;
    const span = 28;

    // Wind velocity component for slanted rain
    const windDx = Math.cos(this.windAngleRad) * this.windStrength * 4.2;
    const windDz = Math.sin(this.windAngleRad) * this.windStrength * 4.2;

    for (let i = 0; i < count; i++) {
      const idx = i * 6;
      const fallSpeed = velocities[i] * deltaSeconds;

      let bx = positions[idx] + windDx * deltaSeconds;
      let by = positions[idx + 1] - fallSpeed;
      let bz = positions[idx + 2] + windDz * deltaSeconds;

      const streakLen = 0.60;
      const slantX = windDx * 0.022;
      const slantZ = windDz * 0.022;

      // Wrap back to top if below ground
      if (by < 0.0) {
        bx = (Math.random() - 0.5) * span * 2;
        by = 18.0 + Math.random() * 5.0;
        bz = (Math.random() - 0.5) * span * 2;
      }

      // Bottom vertex
      positions[idx] = bx;
      positions[idx + 1] = by;
      positions[idx + 2] = bz;

      // Top vertex
      positions[idx + 3] = bx - slantX;
      positions[idx + 4] = by + streakLen;
      positions[idx + 5] = bz - slantZ;
    }

    this.rainLineSegments.geometry.attributes.position.needsUpdate = true;
  }

  // ---------------------------------------------------------------------------
  // Thunder & Lightning System
  // ---------------------------------------------------------------------------

  private initThunderStrikeMeshes(): void {
    // Impact disc on ground
    const discGeo = new THREE.RingGeometry(0.1, 1.8, 16);
    discGeo.rotateX(-Math.PI * 0.5);
    const discMat = new THREE.MeshBasicMaterial({
      color: 0x90e0ff,
      transparent: true,
      opacity: 0.85,
      side: THREE.DoubleSide,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    });
    this.strikeGlowDisc = new THREE.Mesh(discGeo, discMat);
    this.strikeGlowDisc.visible = false;
    this.strikeGlowDisc.position.y = 0.02;
    this.thunderGroup.add(this.strikeGlowDisc);

    // Initial dummy geometry for lightning bolt line
    const boltGeo = new THREE.BufferGeometry();
    boltGeo.setAttribute('position', new THREE.BufferAttribute(new Float32Array(72 * 3), 3));
    const boltMat = new THREE.LineBasicMaterial({
      color: 0xeef9ff,
      transparent: true,
      opacity: 1.0,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    });
    this.strikeBoltMesh = new THREE.LineSegments(boltGeo, boltMat);
    this.strikeBoltMesh.visible = false;
    this.thunderGroup.add(this.strikeBoltMesh);
  }

  /**
   * Triggers an occasional visual lightning bolt striking the vicinity of the battle area.
   */
  public triggerLightningStrike(targetCoords?: { x: number; z: number }): void {
    // Vicinity of battle board: radius 14 to 22 units from board center
    let tx: number;
    let tz: number;

    if (targetCoords) {
      tx = targetCoords.x;
      tz = targetCoords.z;
    } else {
      const angle = Math.random() * Math.PI * 2;
      const dist = 14.0 + Math.random() * 8.0;
      tx = Math.cos(angle) * dist;
      tz = Math.sin(angle) * dist;
    }

    // Generate jagged lightning path from sky y=24 down to ground (tx, 0.0, tz)
    const segments = 16;
    const vertices: number[] = [];
    let curX = tx + (Math.random() - 0.5) * 4.0;
    let curY = 24.0;
    let curZ = tz + (Math.random() - 0.5) * 4.0;

    for (let s = 1; s <= segments; s++) {
      const progress = s / segments;
      const targetY = 24.0 * (1 - progress);
      // Interpolate towards target ground coordinate with perpendicular jitter
      const jitter = (1 - progress * 0.7) * 1.2;
      const nextX = tx * progress + (1 - progress) * curX + (Math.random() - 0.5) * jitter;
      const nextY = targetY;
      const nextZ = tz * progress + (1 - progress) * curZ + (Math.random() - 0.5) * jitter;

      vertices.push(curX, curY, curZ);
      vertices.push(nextX, nextY, nextZ);

      // Add a small branch fork occasionally
      if (s === 6 || s === 11) {
        const forkX = nextX + (Math.random() - 0.5) * 2.5;
        const forkY = nextY - 1.8;
        const forkZ = nextZ + (Math.random() - 0.5) * 2.5;
        vertices.push(nextX, nextY, nextZ);
        vertices.push(forkX, forkY, forkZ);
      }

      curX = nextX;
      curY = nextY;
      curZ = nextZ;
    }

    // Connect final segment right to ground target
    vertices.push(curX, curY, curZ);
    vertices.push(tx, 0.05, tz);

    if (this.strikeBoltMesh) {
      this.strikeBoltMesh.geometry.dispose();
      const newGeo = new THREE.BufferGeometry();
      newGeo.setAttribute('position', new THREE.BufferAttribute(new Float32Array(vertices), 3));
      this.strikeBoltMesh.geometry = newGeo;
      this.strikeBoltMesh.visible = true;
    }

    if (this.strikeGlowDisc) {
      this.strikeGlowDisc.position.set(tx, 0.03, tz);
      this.strikeGlowDisc.scale.set(1.0, 1.0, 1.0);
      this.strikeGlowDisc.visible = true;
      (this.strikeGlowDisc.material as THREE.MeshBasicMaterial).opacity = 0.9;
    }

    // Ground impact flash point light
    this.strikePointLight.position.set(tx, 0.4, tz);
    this.strikePointLight.intensity = 5.5;

    this.isThunderStriking = true;
    this.thunderStrikeTime = 0;
  }

  private triggerSkyFlash(): void {
    this.isSkyFlashing = true;
    this.skyFlashTime = 0;
    this.skyFlashDuration = 0.28 + Math.random() * 0.12;
  }

  private updateThunderAndLightning(deltaSeconds: number): void {
    // 1. Sky flash timer & animation
    this.lightningTimer -= deltaSeconds;
    if (this.lightningTimer <= 0) {
      this.triggerSkyFlash();
      this.lightningTimer = this.lightningInterval + (Math.random() - 0.5) * 2.5;
    }

    if (this.isSkyFlashing) {
      this.skyFlashTime += deltaSeconds;
      const p = this.skyFlashTime / this.skyFlashDuration;
      if (p >= 1.0) {
        this.isSkyFlashing = false;
        this.lightningLight.intensity = 0.0;
        this.applyThunderstormLighting();
      } else {
        // Double-burst flash curve
        let intensityFactor = 0;
        if (p < 0.25) {
          intensityFactor = Math.sin((p / 0.25) * Math.PI);
        } else if (p < 0.45) {
          intensityFactor = 0.25;
        } else {
          intensityFactor = (1.0 - (p - 0.45) / 0.55);
        }

        const flashIntensity = intensityFactor * 3.8;
        this.lightningLight.intensity = flashIntensity;

        if (this.ambientLight) {
          this.ambientLight.intensity = 0.18 + intensityFactor * 0.55;
        }
        if (this.renderer?.setClearColor && intensityFactor > 0.4) {
          this.renderer.setClearColor(0x354252, 1.0);
        }
      }
    }

    // 2. Vicinity thunder strike timer & animation
    this.thunderStrikeTimer -= deltaSeconds;
    if (this.thunderStrikeTimer <= 0) {
      this.triggerLightningStrike();
      this.thunderStrikeTimer = this.thunderStrikeInterval + (Math.random() - 0.5) * 3.5;
    }

    if (this.isThunderStriking) {
      this.thunderStrikeTime += deltaSeconds;
      const p = this.thunderStrikeTime / this.thunderStrikeDuration;
      if (p >= 1.0) {
        this.isThunderStriking = false;
        if (this.strikeBoltMesh) this.strikeBoltMesh.visible = false;
        if (this.strikeGlowDisc) this.strikeGlowDisc.visible = false;
        this.strikePointLight.intensity = 0.0;
      } else {
        // Rapid flicker during bolt lifetime
        const flicker = Math.sin(p * Math.PI * 8) > -0.2 ? 1.0 : 0.3;
        const fade = (1.0 - p);

        if (this.strikeBoltMesh) {
          this.strikeBoltMesh.visible = p < 0.65;
          (this.strikeBoltMesh.material as THREE.LineBasicMaterial).opacity = flicker * fade;
        }

        this.strikePointLight.intensity = 5.5 * fade * flicker;

        if (this.strikeGlowDisc) {
          const s = 1.0 + p * 1.5;
          this.strikeGlowDisc.scale.set(s, s, s);
          (this.strikeGlowDisc.material as THREE.MeshBasicMaterial).opacity = 0.9 * fade;
        }
      }
    }
  }

  // ---------------------------------------------------------------------------
  // Ground Fog System
  // ---------------------------------------------------------------------------

  private initGroundFogSystem(): void {
    this.fogTexture = createGroundFogNoiseTexture();

    // 3 layered horizontal fog planes at unit foot height ($y = 0.10, 0.20, 0.32$)
    // Hexes are at y=0, humanoids are ~1.2 units tall with feet between 0.0 and 0.35
    const layerHeights = [0.10, 0.20, 0.32];
    const opacities = [0.55, 0.48, 0.40];
    const planeSize = 58;

    for (let i = 0; i < layerHeights.length; i++) {
      const geo = new THREE.PlaneGeometry(planeSize, planeSize, 4, 4);
      geo.rotateX(-Math.PI * 0.5);

      const mat = new THREE.MeshBasicMaterial({
        map: this.fogTexture,
        transparent: true,
        opacity: opacities[i],
        color: 0xdde3ea,
        depthWrite: false,
        side: THREE.DoubleSide,
      });

      const mesh = new THREE.Mesh(geo, mat);
      mesh.position.y = layerHeights[i];
      mesh.name = `GroundFogPlane_Layer_${i}`;
      this.groundFogGroup.add(mesh);
      this.fogPlanes.push(mesh);
    }
  }

  private updateGroundFog(deltaSeconds: number): void {
    if (!this.fogTexture) return;

    // Slowly drift ground fog along wind vector
    const speed = 0.015 * this.windStrength * deltaSeconds;
    const dx = Math.cos(this.windAngleRad) * speed;
    const dy = Math.sin(this.windAngleRad) * speed;

    this.fogTexture.offset.x = (this.fogTexture.offset.x + dx) % 1.0;
    this.fogTexture.offset.y = (this.fogTexture.offset.y + dy) % 1.0;
  }

  // ---------------------------------------------------------------------------
  // Drifting Clouds (Sunny weather only — casts soft shadows onto the arena)
  // ---------------------------------------------------------------------------

  private initDriftingCloudsSystem(): void {
    const size = 64;
    const data = new Uint8Array(size * size * 4);
    const puffs = [
      { cx: 32, cy: 32, r: 22, w: 1.0 },
      { cx: 20, cy: 30, r: 16, w: 0.85 },
      { cx: 44, cy: 34, r: 16, w: 0.85 },
      { cx: 30, cy: 22, r: 14, w: 0.75 },
      { cx: 35, cy: 42, r: 14, w: 0.75 },
    ];

    for (let y = 0; y < size; y++) {
      for (let x = 0; x < size; x++) {
        let density = 0;
        for (let p = 0; p < puffs.length; p++) {
          const puff = puffs[p];
          const dx = x - puff.cx;
          const dy = y - puff.cy;
          const dSq = dx * dx + dy * dy;
          const rSq = puff.r * puff.r;
          if (dSq < rSq) {
            const f = 1 - dSq / rSq;
            density += f * f * puff.w;
          }
        }
        const alpha = Math.min(1.0, Math.max(0.0, density * 0.65));
        const idx = (y * size + x) * 4;
        data[idx] = 255;
        data[idx + 1] = 250;
        data[idx + 2] = 242;
        data[idx + 3] = Math.round(alpha * 255);
      }
    }

    const tex = new THREE.DataTexture(data, size, size, THREE.RGBAFormat);
    tex.magFilter = THREE.LinearFilter;
    tex.minFilter = THREE.LinearMipmapLinearFilter;
    tex.generateMipmaps = true;
    tex.needsUpdate = true;
    tex.name = 'DriftingCloudTexture_64';
    this.cloudTexture = tex;

    const cloudScale = 1.8; // +80% larger clouds
    const cloudConfigs = [
      { x: -12, y: 12.0, z: -12, sx: 8.5 * cloudScale, sz: 5.5 * cloudScale, speed: 0.75 },
      { x: -3, y: 12.6, z: -8, sx: 7.0 * cloudScale, sz: 4.8 * cloudScale, speed: 0.9 },
      { x: 5, y: 11.8, z: -14, sx: 9.0 * cloudScale, sz: 6.0 * cloudScale, speed: 0.65 },
      { x: -15, y: 13.0, z: 1, sx: 7.8 * cloudScale, sz: 5.2 * cloudScale, speed: 0.85 },
      { x: 2, y: 12.4, z: 3, sx: 6.8 * cloudScale, sz: 4.5 * cloudScale, speed: 0.8 },
    ];

    for (let i = 0; i < cloudConfigs.length; i++) {
      const cfg = cloudConfigs[i];
      const geo = new THREE.PlaneGeometry(cfg.sx, cfg.sz);
      geo.rotateX(-Math.PI * 0.5);
      const mat = new THREE.MeshBasicMaterial({
        map: tex,
        color: 0xfffaf0,
        transparent: true,
        opacity: 0.24,
        alphaTest: 0.32,
        depthWrite: false,
        side: THREE.DoubleSide,
      });
      const mesh = new THREE.Mesh(geo, mat);
      mesh.position.set(cfg.x, cfg.y, cfg.z);
      mesh.castShadow = true;
      mesh.receiveShadow = false;
      mesh.raycast = () => {};
      mesh.name = `DriftingCloud_${i}`;
      mesh.userData = { speedFactor: cfg.speed };
      this.driftingCloudsGroup.add(mesh);
      this.cloudMeshes.push(mesh);
    }
  }

  private updateDriftingClouds(deltaSeconds: number): void {
    const baseSpeed = 0.65 * 0.33 * this.windStrength * deltaSeconds;
    const dirX = Math.cos(this.windAngleRad);
    const dirZ = Math.sin(this.windAngleRad);

    for (let i = 0; i < this.cloudMeshes.length; i++) {
      const cloud = this.cloudMeshes[i];
      const factor = cloud.userData?.speedFactor ?? 0.8;
      cloud.position.x += dirX * baseSpeed * factor;
      cloud.position.z += dirZ * baseSpeed * factor;

      // Wrap seamlessly across the sun-to-board shadow corridor [-20, 14]
      if (cloud.position.x > 14) cloud.position.x = -20;
      if (cloud.position.x < -20) cloud.position.x = 14;
      if (cloud.position.z > 14) cloud.position.z = -20;
      if (cloud.position.z < -20) cloud.position.z = 14;
    }
  }

  // ---------------------------------------------------------------------------
  // Main Update Loop
  // ---------------------------------------------------------------------------

  public update(deltaMS: number): void {
    const deltaSeconds = Math.max(0.001, deltaMS / 1000);

    if (this.currentWeather === WeatherType.NONE) {
      this.updateDriftingClouds(deltaSeconds);
    } else if (this.currentWeather === WeatherType.RAIN) {
      this.updateRain(deltaSeconds);
    } else if (this.currentWeather === WeatherType.THUNDERSTORM) {
      this.updateRain(deltaSeconds * 1.25);
      this.updateThunderAndLightning(deltaSeconds);
    } else if (this.currentWeather === WeatherType.FOG) {
      this.updateGroundFog(deltaSeconds);
    }
  }

  public dispose(): void {
    if (this.rainLineSegments) {
      this.rainLineSegments.geometry.dispose();
      (this.rainLineSegments.material as THREE.Material).dispose();
    }
    if (this.strikeBoltMesh) {
      this.strikeBoltMesh.geometry.dispose();
      (this.strikeBoltMesh.material as THREE.Material).dispose();
    }
    if (this.strikeGlowDisc) {
      this.strikeGlowDisc.geometry.dispose();
      (this.strikeGlowDisc.material as THREE.Material).dispose();
    }
    for (const plane of this.fogPlanes) {
      plane.geometry.dispose();
      (plane.material as THREE.Material).dispose();
    }
    for (const cloud of this.cloudMeshes) {
      cloud.geometry.dispose();
      (cloud.material as THREE.Material).dispose();
    }
    this.cloudTexture?.dispose();
    this.fogTexture?.dispose();
    this.group.clear();
  }
}
