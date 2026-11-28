import * as THREE from 'three';

export type OverviewHoverTarget =
  | { kind: 'army'; armyId: string; ownerPlayerId: string | null }
  | { kind: 'settlement'; regionId: string; ownerPlayerId: string | null };

const outlineMaterialCache = new Map<string, THREE.MeshBasicMaterial>();

/**
 * Creates a cached inverted-hull outline material using BackSide rendering and
 * vertex-normal extrusion via `onBeforeCompile`. Because it extends
 * `MeshBasicMaterial`, Three.js automatically applies skinning and instancing
 * transforms so outlines animate cleanly on both rigged `SkinnedMesh` armies
 * and static settlement models.
 */
export function getHoverOutlineMaterial(
  colorHex: number = 0xffdf6b,
  thickness: number = 0.035
): THREE.MeshBasicMaterial {
  const key = `${colorHex.toString(16)}_${thickness.toFixed(4)}`;
  const cached = outlineMaterialCache.get(key);
  if (cached) return cached;

  const mat = new THREE.MeshBasicMaterial({
    color: colorHex,
    side: THREE.BackSide,
    transparent: true,
    opacity: 0.92,
    depthWrite: false,
    toneMapped: false,
  });

  mat.userData = {
    ...mat.userData,
    isHoverOutlineMaterial: true,
    outlineThickness: thickness,
    outlineColorHex: colorHex,
  };

  mat.customProgramCacheKey = () => `overview_hover_outline_v1_${thickness.toFixed(4)}`;
  mat.onBeforeCompile = (shader) => {
    shader.uniforms.uOutlineThickness = { value: thickness };
    shader.vertexShader = shader.vertexShader
      .replace(
        '#include <common>',
        `#include <common>
        uniform float uOutlineThickness;`
      )
      .replace(
        '#include <begin_vertex>',
        `#include <begin_vertex>
        #ifdef USE_NORMAL
          transformed += normalize(objectNormal) * uOutlineThickness;
        #else
          transformed += normalize(normal) * uOutlineThickness;
        #endif`
      );
  };

  outlineMaterialCache.set(key, mat);
  return mat;
}

/**
 * Attaches inverted-hull outline overlay meshes to all visible solid meshes
 * inside `rootGroup` (supporting both static `Mesh` and rigged `SkinnedMesh`).
 * Returns the created overlay meshes so they can be cleanly detached on unhover.
 */
export function attachHoverOutlineToGroup(
  rootGroup: THREE.Object3D,
  colorHex: number = 0xffdf6b,
  thickness: number = 0.035
): THREE.Object3D[] {
  const created: THREE.Object3D[] = [];
  const outlineMat = getHoverOutlineMaterial(colorHex, thickness);
  const sources: THREE.Mesh[] = [];

  rootGroup.traverse((child) => {
    if (!child.visible) return;
    if (child.userData?.isHoverOutline) return;
    if (child.userData?.isGroundShadow || child.userData?.skipHoverOutline) return;
    if ((child as THREE.Sprite).isSprite) return;
    if ((child as THREE.InstancedMesh).isInstancedMesh) return;
    if ((child as THREE.Mesh).isMesh) {
      const mesh = child as THREE.Mesh;
      if (!mesh.geometry) return;
      // Skip flat ground decals/rings that have no volume
      const nameLower = (mesh.name || '').toLowerCase();
      if (nameLower.includes('shadow') || nameLower.includes('ring') || nameLower.includes('halo')) {
        return;
      }
      sources.push(mesh);
    }
  });

  for (const src of sources) {
    let outlineObj: THREE.Mesh;
    if ((src as THREE.SkinnedMesh).isSkinnedMesh) {
      const skinnedSrc = src as THREE.SkinnedMesh;
      const skinnedOutline = new THREE.SkinnedMesh(skinnedSrc.geometry, outlineMat);
      skinnedOutline.bind(skinnedSrc.skeleton, skinnedSrc.bindMatrix);
      outlineObj = skinnedOutline;
    } else {
      outlineObj = new THREE.Mesh(src.geometry, outlineMat);
    }

    outlineObj.name = `HoverOutline_${src.name || 'mesh'}`;
    outlineObj.userData = { isHoverOutline: true, isSharedAsset: true };
    outlineObj.castShadow = false;
    outlineObj.receiveShadow = false;
    outlineObj.raycast = () => {};
    outlineObj.renderOrder = 2;

    if (src.parent) {
      outlineObj.position.copy(src.position);
      outlineObj.quaternion.copy(src.quaternion);
      outlineObj.scale.copy(src.scale);
      src.parent.add(outlineObj);
      created.push(outlineObj);
    }
  }

  return created;
}

/**
 * Detaches previously attached hover outline overlays without disposing the
 * shared source geometries or cached outline materials.
 */
export function detachHoverOutlines(outlines: THREE.Object3D[]): void {
  for (const obj of outlines) {
    obj.removeFromParent();
  }
  outlines.length = 0;
}

export function getHoverOutlineColorForOwner(
  kind: 'army' | 'settlement',
  ownerPlayerId: string | null
): number {
  if (ownerPlayerId === 'player') {
    return kind === 'army' ? 0x7ee8ff : 0xffdf6b;
  }
  if (ownerPlayerId === null) {
    return 0xdce4ee;
  }
  return 0xff7b6b;
}
