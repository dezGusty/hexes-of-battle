import * as THREE from 'three';

export type OverviewPathSegmentKind =
  | 'start'
  | 'straight'
  | 'curve60_left'
  | 'curve60_right'
  | 'curve120_left'
  | 'curve120_right'
  | 'end';

export function classifyOverviewPathTurn(
  inDir: THREE.Vector2,
  outDir: THREE.Vector2
): Exclude<OverviewPathSegmentKind, 'start' | 'end'> {
  const dot = Math.max(-1, Math.min(1, inDir.x * outDir.x + inDir.y * outDir.y));
  const cross = inDir.x * outDir.y - inDir.y * outDir.x;
  const angle = Math.atan2(cross, dot);
  const absAngle = Math.abs(angle);

  // Hex grid turns are 0, +-60 deg (pi/3), or +-120 deg (2*pi/3)
  if (absAngle < Math.PI / 6) {
    return 'straight';
  }
  if (absAngle < Math.PI / 2) {
    return angle > 0 ? 'curve60_right' : 'curve60_left';
  }
  return angle > 0 ? 'curve120_right' : 'curve120_left';
}

interface SamplePoint {
  x: number;
  z: number;
  tx: number;
  tz: number;
}

function buildRibbonArrowGeometry(
  samples: SamplePoint[],
  shaftHalfWidth: number,
  headHalfWidth: number,
  headStartIndex: number
): THREE.BufferGeometry {
  const positions: number[] = [];
  const indices: number[] = [];

  const pushPair = (x: number, z: number, tx: number, tz: number, halfWidth: number) => {
    const nx = -tz;
    const nz = tx;
    positions.push(x + nx * halfWidth, 0, z + nz * halfWidth);
    positions.push(x - nx * halfWidth, 0, z - nz * halfWidth);
  };

  // Shaft segments up to headStartIndex
  for (let i = 0; i <= headStartIndex; i++) {
    const p = samples[i];
    pushPair(p.x, p.z, p.tx, p.tz, shaftHalfWidth);
  }
  for (let i = 0; i < headStartIndex; i++) {
    const a = i * 2;
    const b = a + 1;
    const c = a + 2;
    const d = a + 3;
    indices.push(a, b, c, b, d, c);
  }

  // Arrowhead shoulder at headStartIndex -> tip at last sample
  const headBaseStartVertex = positions.length / 3;
  const headCount = samples.length - 1 - headStartIndex;
  for (let i = headStartIndex; i < samples.length; i++) {
    const p = samples[i];
    const s = headCount > 0 ? (i - headStartIndex) / headCount : 1;
    const hw = headHalfWidth * (1 - s);
    pushPair(p.x, p.z, p.tx, p.tz, hw);
  }
  for (let i = 0; i < headCount; i++) {
    const a = headBaseStartVertex + i * 2;
    const b = a + 1;
    const c = a + 2;
    const d = a + 3;
    indices.push(a, b, c, b, d, c);
  }

  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geo.setIndex(indices);
  geo.computeVertexNormals();
  return geo;
}

function sampleStraight(
  startX: number,
  endX: number,
  segments: number
): SamplePoint[] {
  const pts: SamplePoint[] = [];
  for (let i = 0; i <= segments; i++) {
    const t = i / segments;
    pts.push({
      x: startX + (endX - startX) * t,
      z: 0,
      tx: 1,
      tz: 0,
    });
  }
  return pts;
}

function sampleCircularTurn(
  edgeDist: number,
  alpha: number,
  sign: 1 | -1,
  uStart: number,
  uEnd: number,
  segments: number
): SamplePoint[] {
  const arcRadius = edgeDist / Math.tan(alpha * 0.5);
  const pts: SamplePoint[] = [];
  for (let i = 0; i <= segments; i++) {
    const t = i / segments;
    const u = uStart + (uEnd - uStart) * t;
    const angle = u * alpha;
    pts.push({
      x: -edgeDist + arcRadius * Math.sin(angle),
      z: sign * arcRadius * (1 - Math.cos(angle)),
      tx: Math.cos(angle),
      tz: sign * Math.sin(angle),
    });
  }
  return pts;
}

export function createOverviewPathArrowGeometry(
  kind: OverviewPathSegmentKind,
  hexRadius: number
): THREE.BufferGeometry {
  const d = hexRadius * Math.sqrt(3) * 0.5;
  const shaftHW = hexRadius * 0.085;
  const headHW = hexRadius * 0.21;

  switch (kind) {
    case 'start': {
      const samples = sampleStraight(d * 0.25, d * 0.94, 8);
      return buildRibbonArrowGeometry(samples, shaftHW, headHW * 0.85, 5);
    }
    case 'end': {
      const samples = sampleStraight(-d * 0.94, d * 0.22, 10);
      return buildRibbonArrowGeometry(samples, shaftHW, headHW * 1.1, 6);
    }
    case 'straight': {
      const samples = sampleStraight(-d * 0.94, d * 0.94, 10);
      return buildRibbonArrowGeometry(samples, shaftHW, headHW, 6);
    }
    case 'curve60_right': {
      const samples = sampleCircularTurn(d, Math.PI / 3, 1, 0.04, 0.96, 14);
      return buildRibbonArrowGeometry(samples, shaftHW, headHW, 9);
    }
    case 'curve60_left': {
      const samples = sampleCircularTurn(d, Math.PI / 3, -1, 0.04, 0.96, 14);
      return buildRibbonArrowGeometry(samples, shaftHW, headHW, 9);
    }
    case 'curve120_right': {
      const samples = sampleCircularTurn(d, (Math.PI * 2) / 3, 1, 0.04, 0.96, 16);
      return buildRibbonArrowGeometry(samples, shaftHW, headHW, 10);
    }
    case 'curve120_left': {
      const samples = sampleCircularTurn(d, (Math.PI * 2) / 3, -1, 0.04, 0.96, 16);
      return buildRibbonArrowGeometry(samples, shaftHW, headHW, 10);
    }
  }
}
