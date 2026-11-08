import * as THREE from 'three';

export interface BlowingLeafParticle {
  x: number;
  y: number;
  z: number;
  vx: number;
  vy: number;
  vz: number;
  rotX: number;
  rotY: number;
  rotZ: number;
  tumbleSpeedX: number;
  tumbleSpeedY: number;
  flutterPhase: number;
  age: number;
  maxAge: number;
  colorHex: number;
}

/**
 * Very low-poly blowing leaves particle system:
 * Generates fluttering, tumbling leaves blown off tree canopies by the wind.
 * Uses a single InstancedMesh (2 triangles per leaf) to achieve zero performance overhead.
 */
export class BlowingLeavesSystem {
  public readonly group: THREE.Group = new THREE.Group();
  public instancedMesh!: THREE.InstancedMesh;

  private leafCount: number = 120;
  private leaves: BlowingLeafParticle[] = [];
  private dummy: THREE.Object3D = new THREE.Object3D();

  private windAngleRad: number = Math.PI * 0.25;
  private windStrength: number = 1.0;
  private simTime: number = 0;

  // Active tree canopy positions to spawn leaves from
  private treeCanopies: THREE.Vector3[] = [];

  // Authentic palette of early autumn leaf colors matching tree species
  private leafPalette: number[] = [
    0x9fc838, // Birch yellow-green
    0xe8c734, // Birch luminous golden-yellow
    0xd4be3a, // Willow pale autumn gold
    0x7e9e38, // Willow olive-lime
    0x86b032, // Maple late-summer yellow-green
    0xedb82b, // Maple golden amber-yellow
    0xdf6c22, // Maple vibrant autumn orange
    0xa42d1e, // Maple deep crimson / brown-red
    0xc85222, // Maple warm russet
  ];

  constructor(leafCount: number = 120) {
    this.leafCount = leafCount;
    this.group.name = 'BlowingLeavesSystem';

    this.initInstancedMesh();
    this.initLeaves();
  }

  private initInstancedMesh(): void {
    // 2-triangle low-poly leaf quad / diamond shape (4 vertices, 2 triangles)
    const halfW = 0.024;
    const halfH = 0.016;
    const vertices = new Float32Array([
      -halfW, 0, 0,
      0, 0, -halfH,
      halfW, 0, 0,
      0, 0, halfH,
    ]);
    const indices = [
      0, 1, 2,
      0, 2, 3,
    ];
    const uvs = new Float32Array([
      0, 0.5,
      0.5, 0,
      1, 0.5,
      0.5, 1,
    ]);

    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(vertices, 3));
    geo.setAttribute('uv', new THREE.BufferAttribute(uvs, 2));
    geo.setIndex(indices);
    geo.computeVertexNormals();

    const mat = new THREE.MeshStandardMaterial({
      color: 0xffffff,
      roughness: 0.78,
      metalness: 0.0,
      side: THREE.DoubleSide,
      depthWrite: true,
    });

    this.instancedMesh = new THREE.InstancedMesh(geo, mat, this.leafCount);
    this.instancedMesh.name = 'BlowingLeaves_Instanced';
    this.instancedMesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    this.instancedMesh.frustumCulled = false;

    this.group.add(this.instancedMesh);
  }

  private initLeaves(): void {
    this.leaves = [];
    const color = new THREE.Color();

    for (let i = 0; i < this.leafCount; i++) {
      const colorHex = this.leafPalette[i % this.leafPalette.length];
      color.setHex(colorHex);
      this.instancedMesh.setColorAt(i, color);

      const leaf: BlowingLeafParticle = {
        x: 0,
        y: 0,
        z: 0,
        vx: 0,
        vy: 0,
        vz: 0,
        rotX: Math.random() * Math.PI * 2,
        rotY: Math.random() * Math.PI * 2,
        rotZ: Math.random() * Math.PI * 2,
        tumbleSpeedX: (Math.random() - 0.5) * 8.0,
        tumbleSpeedY: (Math.random() - 0.5) * 6.0,
        flutterPhase: Math.random() * Math.PI * 2,
        age: Math.random() * 6.0,
        maxAge: 4.5 + Math.random() * 4.5,
        colorHex,
      };

      this.respawnLeaf(leaf);
      this.leaves.push(leaf);

      this.dummy.position.set(leaf.x, leaf.y, leaf.z);
      this.dummy.rotation.set(leaf.rotX, leaf.rotY, leaf.rotZ);
      this.dummy.updateMatrix();
      this.instancedMesh.setMatrixAt(i, this.dummy.matrix);
    }

    if (this.instancedMesh.instanceColor) {
      this.instancedMesh.instanceColor.needsUpdate = true;
    }
    this.instancedMesh.instanceMatrix.needsUpdate = true;
  }

  public setTreeCanopyPositions(canopies: THREE.Vector3[]): void {
    this.treeCanopies = canopies.map((c) => c.clone());
    // Respawn existing leaves near newly registered tree canopies
    for (let i = 0; i < this.leaves.length; i++) {
      this.respawnLeaf(this.leaves[i]);
    }
  }

  private respawnLeaf(leaf: BlowingLeafParticle): void {
    leaf.age = 0;
    leaf.maxAge = 4.5 + Math.random() * 4.5;
    leaf.tumbleSpeedX = (Math.random() - 0.5) * 8.0;
    leaf.tumbleSpeedY = (Math.random() - 0.5) * 6.0;

    if (this.treeCanopies.length > 0) {
      const canopy = this.treeCanopies[Math.floor(Math.random() * this.treeCanopies.length)];
      leaf.x = canopy.x + (Math.random() - 0.5) * 0.35;
      leaf.y = canopy.y + (Math.random() - 0.5) * 0.30;
      leaf.z = canopy.z + (Math.random() - 0.5) * 0.35;
    } else {
      // Default scatter around board area if no tree positions set
      const r = 4.0 + Math.random() * 12.0;
      const angle = Math.random() * Math.PI * 2;
      leaf.x = Math.cos(angle) * r;
      leaf.y = 0.50 + Math.random() * 0.45;
      leaf.z = Math.sin(angle) * r;
    }

    // Initial gust velocity
    const windDx = Math.cos(this.windAngleRad);
    const windDz = Math.sin(this.windAngleRad);
    const speed = (1.5 + Math.random() * 1.8) * this.windStrength;

    leaf.vx = windDx * speed + (Math.random() - 0.5) * 0.4;
    leaf.vy = 0.20 + Math.random() * 0.35;
    leaf.vz = windDz * speed + (Math.random() - 0.5) * 0.4;
  }

  public setWindState(angleRad: number, strength: number = 1.0): void {
    this.windAngleRad = angleRad;
    this.windStrength = Math.max(0.1, strength);
  }

  public update(deltaMS: number): void {
    const dt = Math.max(0.001, deltaMS * 0.001);
    this.simTime += dt;

    const windDx = Math.cos(this.windAngleRad);
    const windDz = Math.sin(this.windAngleRad);
    const targetSpeed = 2.4 * this.windStrength;

    for (let i = 0; i < this.leaves.length; i++) {
      const leaf = this.leaves[i];
      leaf.age += dt;

      // Accelerate towards wind direction
      leaf.vx += (windDx * targetSpeed - leaf.vx) * 1.8 * dt;
      leaf.vz += (windDz * targetSpeed - leaf.vz) * 1.8 * dt;

      // Aerodynamic sinusoidal fluttering and lift
      const flutter = Math.sin(this.simTime * 5.5 + leaf.flutterPhase);
      const lift = flutter * 0.45 * this.windStrength;
      const gravity = -0.32;
      leaf.vy += (gravity + lift - leaf.vy * 0.8) * 2.2 * dt;

      leaf.x += leaf.vx * dt;
      leaf.y += leaf.vy * dt;
      leaf.z += leaf.vz * dt;

      // 3D aerodynamic rotation & tumble
      leaf.rotX += leaf.tumbleSpeedX * dt;
      leaf.rotY += leaf.tumbleSpeedY * dt;
      leaf.rotZ += flutter * 0.15;

      // Respawn if leaf has hit ground or exceeded lifespan
      if (leaf.y <= 0.02 || leaf.age >= leaf.maxAge) {
        this.respawnLeaf(leaf);
      }

      this.dummy.position.set(leaf.x, leaf.y, leaf.z);
      this.dummy.rotation.set(leaf.rotX, leaf.rotY, leaf.rotZ);
      this.dummy.updateMatrix();
      this.instancedMesh.setMatrixAt(i, this.dummy.matrix);
    }

    this.instancedMesh.instanceMatrix.needsUpdate = true;
  }

  public getLeafCount(): number {
    return this.leafCount;
  }

  public dispose(): void {
    this.instancedMesh.geometry.dispose();
    (this.instancedMesh.material as THREE.Material).dispose();
    this.group.clear();
  }
}
