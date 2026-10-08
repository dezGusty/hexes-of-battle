import * as THREE from 'three';
import { ProjectileTrajectoryParams } from '../types';

interface ActiveProjectile {
  mesh: THREE.Object3D;
  trailLine?: THREE.Line;
  trailPoints: THREE.Vector3[];
  sourcePos: THREE.Vector3;
  targetPos: THREE.Vector3;
  apexHeight: number;
  durationMs: number;
  elapsedMs: number;
  delayMs: number;
  onImpact?: () => void;
  impactTriggered: boolean;
}

interface ImpactBurst {
  points: THREE.Points;
  velocities: THREE.Vector3[];
  elapsedMs: number;
  durationMs: number;
}

export class ProjectileSystem3D {
  public readonly group: THREE.Group = new THREE.Group();

  private activeProjectiles: ActiveProjectile[] = [];
  private activeBursts: ImpactBurst[] = [];

  constructor() {}

  private createArrowMesh(type: string): THREE.Group {
    const arrow = new THREE.Group();

    // Shaft
    const shaftMat = new THREE.MeshStandardMaterial({ color: 0xbb9955 });
    const shaft = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.02, 0.6, 6), shaftMat);

    // Tip
    const tipColor = type === 'magic' ? 0x66ccff : 0x777788;
    const tipMat = new THREE.MeshStandardMaterial({ color: tipColor, metalness: 0.8, roughness: 0.2 });
    const tip = new THREE.Mesh(new THREE.ConeGeometry(0.05, 0.15, 6), tipMat);
    tip.position.y = 0.35;

    // Feathers
    const fletchMat = new THREE.MeshBasicMaterial({ color: 0xcc2222, side: THREE.DoubleSide });
    const fletch = new THREE.Mesh(new THREE.PlaneGeometry(0.1, 0.14), fletchMat);
    fletch.position.y = -0.22;

    arrow.add(shaft);
    arrow.add(tip);
    arrow.add(fletch);

    // Align pointing forward along +Z when rotation is 0
    arrow.rotation.x = Math.PI * 0.5;

    const wrapper = new THREE.Group();
    wrapper.add(arrow);
    return wrapper;
  }

  /**
   * Spawns a multi-projectile volley travelling along 3D parabolic arcs.
   */
  public spawnVolley(params: ProjectileTrajectoryParams): void {
    const volleyCount = params.volleyCount ?? 5;
    const dist = params.sourcePos.distanceTo(params.targetPos);
    const apex = params.apexHeight > 0 ? params.apexHeight : Math.max(1.5, dist * 0.35);
    const baseDuration = params.durationMs > 0 ? params.durationMs : Math.max(400, dist * 120);

    for (let i = 0; i < volleyCount; i++) {
      const isPrimary = i === 0;
      const delayMs = isPrimary ? 0 : i * 45 + Math.random() * 30;

      // Add slight spatial jitter for volley spread
      const spreadX = isPrimary ? 0 : (Math.random() - 0.5) * 0.4;
      const spreadZ = isPrimary ? 0 : (Math.random() - 0.5) * 0.4;
      const start = params.sourcePos.clone().add(new THREE.Vector3(spreadX, 0.6, spreadZ));

      const targetJitterX = isPrimary ? 0 : (Math.random() - 0.5) * 0.5;
      const targetJitterZ = isPrimary ? 0 : (Math.random() - 0.5) * 0.5;
      const end = params.targetPos.clone().add(new THREE.Vector3(targetJitterX, 0.2, targetJitterZ));

      if (params.scatterOffset) {
        end.add(params.scatterOffset);
      }

      const mesh = this.createArrowMesh(params.projectileType);
      mesh.position.copy(start);
      mesh.visible = isPrimary;
      this.group.add(mesh);

      // Trail line
      const maxTrailPoints = 8;
      const trailPositions = new Float32Array(maxTrailPoints * 3);
      for (let j = 0; j < maxTrailPoints; j++) {
        trailPositions[j * 3 + 0] = start.x;
        trailPositions[j * 3 + 1] = start.y;
        trailPositions[j * 3 + 2] = start.z;
      }
      const trailGeo = new THREE.BufferGeometry();
      trailGeo.setAttribute('position', new THREE.BufferAttribute(trailPositions, 3));
      trailGeo.setDrawRange(0, 1);

      const trailMat = new THREE.LineBasicMaterial({
        color: params.projectileType === 'magic' ? 0x88ddff : 0xffffff,
        transparent: true,
        opacity: 0.5,
      });
      const trailLine = new THREE.Line(trailGeo, trailMat);
      this.group.add(trailLine);

      this.activeProjectiles.push({
        mesh,
        trailLine,
        trailPoints: [start.clone()],
        sourcePos: start,
        targetPos: end,
        apexHeight: isPrimary ? apex : apex + (Math.random() - 0.5) * 0.3,
        durationMs: isPrimary ? baseDuration : baseDuration + (Math.random() - 0.5) * 60,
        elapsedMs: 0,
        delayMs,
        onImpact: isPrimary ? params.onImpact : undefined,
        impactTriggered: false,
      });
    }
  }

  public update(deltaMs: number): void {
    // 1. Update flying projectiles
    for (let i = this.activeProjectiles.length - 1; i >= 0; i--) {
      const p = this.activeProjectiles[i];

      if (p.delayMs > 0) {
        p.delayMs -= deltaMs;
        continue;
      }

      p.mesh.visible = true;
      p.elapsedMs += deltaMs;
      const t = Math.min(1.0, p.elapsedMs / p.durationMs);

      // Calculate 3D Parabolic position:
      // P(t) = lerp(source, target, t) + (4 * h * t * (1-t)) * Y
      const currentPos = new THREE.Vector3().lerpVectors(p.sourcePos, p.targetPos, t);
      const arcY = 4 * p.apexHeight * t * (1.0 - t);
      currentPos.y += arcY;
      p.mesh.position.copy(currentPos);

      // Calculate tangent velocity vector for orientation:
      // v(t) = dP/dt = (target - source) + (4 * h * (1 - 2t)) * Y
      const tangent = new THREE.Vector3().subVectors(p.targetPos, p.sourcePos);
      tangent.y += 4 * p.apexHeight * (1.0 - 2.0 * t);
      tangent.normalize();

      // Orient projectile along velocity vector
      const targetLook = currentPos.clone().add(tangent);
      p.mesh.lookAt(targetLook);

      // Update trail ribbon
      p.trailPoints.push(currentPos.clone());
      if (p.trailPoints.length > 8) p.trailPoints.shift();
      if (p.trailLine) {
        const attr = p.trailLine.geometry.attributes.position as THREE.BufferAttribute;
        const arr = attr.array as Float32Array;
        for (let ptIdx = 0; ptIdx < p.trailPoints.length; ptIdx++) {
          arr[ptIdx * 3 + 0] = p.trailPoints[ptIdx].x;
          arr[ptIdx * 3 + 1] = p.trailPoints[ptIdx].y;
          arr[ptIdx * 3 + 2] = p.trailPoints[ptIdx].z;
        }
        attr.needsUpdate = true;
        p.trailLine.geometry.setDrawRange(0, p.trailPoints.length);
      }

      // Check impact
      if (t >= 1.0) {
        if (!p.impactTriggered) {
          p.impactTriggered = true;
          this.triggerImpact(p.targetPos);
          if (p.onImpact) {
            p.onImpact();
          }
        }

        // Cleanup projectile
        this.group.remove(p.mesh);
        if (p.trailLine) {
          this.group.remove(p.trailLine);
          p.trailLine.geometry.dispose();
          (p.trailLine.material as THREE.Material).dispose();
        }
        this.activeProjectiles.splice(i, 1);
      }
    }

    // 2. Update impact particle bursts
    for (let i = this.activeBursts.length - 1; i >= 0; i--) {
      const burst = this.activeBursts[i];
      burst.elapsedMs += deltaMs;
      const progress = burst.elapsedMs / burst.durationMs;

      if (progress >= 1.0) {
        this.group.remove(burst.points);
        burst.points.geometry.dispose();
        (burst.points.material as THREE.Material).dispose();
        this.activeBursts.splice(i, 1);
      } else {
        const positions = burst.points.geometry.attributes.position.array as Float32Array;
        for (let j = 0; j < burst.velocities.length; j++) {
          const vel = burst.velocities[j];
          positions[j * 3 + 0] += (vel.x * deltaMs) / 1000;
          positions[j * 3 + 1] += (vel.y * deltaMs) / 1000;
          positions[j * 3 + 2] += (vel.z * deltaMs) / 1000;
          vel.y -= (9.8 * deltaMs) / 1000; // gravity
        }
        burst.points.geometry.attributes.position.needsUpdate = true;
        (burst.points.material as THREE.PointsMaterial).opacity = 1.0 - progress;
      }
    }
  }

  private triggerImpact(pos: THREE.Vector3): void {
    const particleCount = 14;
    const positions = new Float32Array(particleCount * 3);
    const velocities: THREE.Vector3[] = [];

    for (let i = 0; i < particleCount; i++) {
      positions[i * 3 + 0] = pos.x;
      positions[i * 3 + 1] = pos.y + 0.1;
      positions[i * 3 + 2] = pos.z;

      const angle = Math.random() * Math.PI * 2;
      const speed = 1.0 + Math.random() * 2.5;
      velocities.push(
        new THREE.Vector3(
          Math.cos(angle) * speed,
          1.5 + Math.random() * 2.0,
          Math.sin(angle) * speed
        )
      );
    }

    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));

    const mat = new THREE.PointsMaterial({
      color: 0xffee88,
      size: 0.12,
      transparent: true,
      opacity: 0.9,
    });

    const points = new THREE.Points(geo, mat);
    this.group.add(points);

    this.activeBursts.push({
      points,
      velocities,
      elapsedMs: 0,
      durationMs: 400,
    });
  }

  public dispose(): void {
    this.activeProjectiles.forEach((p) => {
      this.group.remove(p.mesh);
      if (p.trailLine) this.group.remove(p.trailLine);
    });
    this.activeBursts.forEach((b) => {
      this.group.remove(b.points);
      b.points.geometry.dispose();
    });
    this.activeProjectiles = [];
    this.activeBursts = [];
  }
}
