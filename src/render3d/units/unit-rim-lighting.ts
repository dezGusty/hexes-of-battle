import * as THREE from 'three';

export interface UnitRimLightingOptions {
  color?: number;
  intensity?: number;
  power?: number;
}

export const sharedUnitRimUniforms = {
  uGlobalRimEnabled: { value: 1.0 },
};

export function setUnitRimLightingEnabled(enabled: boolean): void {
  sharedUnitRimUniforms.uGlobalRimEnabled.value = enabled ? 1.0 : 0.0;
}

export function isUnitRimLightingEnabled(): boolean {
  return sharedUnitRimUniforms.uGlobalRimEnabled.value > 0.5;
}

/**
 * Adds a subtle Fresnel rim highlight to unit and armor MeshStandardMaterials
 * so miniature units read cleanly against matte painted terrain.
 */
export function applyUnitRimLighting(
  material: THREE.MeshStandardMaterial,
  options?: UnitRimLightingOptions
): THREE.MeshStandardMaterial {
  if (!material || material.userData?.hasUnitRimLighting) {
    return material;
  }

  const isArmoredOrMetallic = material.metalness >= 0.35;
  const rimColor = new THREE.Color(
    options?.color ?? (isArmoredOrMetallic ? 0xffe4b8 : 0xe8dcc8)
  );
  const rimIntensity = options?.intensity ?? (isArmoredOrMetallic ? 0.38 : 0.20);
  const rimPower = options?.power ?? (isArmoredOrMetallic ? 2.6 : 3.2);

  material.userData = {
    ...material.userData,
    hasUnitRimLighting: true,
    rimColor,
    rimIntensity,
    rimPower,
  };

  const prevOnBeforeCompile = material.onBeforeCompile;
  const prevCacheKey = material.customProgramCacheKey?.bind(material);

  material.customProgramCacheKey = () => {
    const baseKey = prevCacheKey ? prevCacheKey() : '';
    return `${baseKey}_UnitRim`;
  };

  material.onBeforeCompile = (shader, renderer) => {
    if (prevOnBeforeCompile) {
      prevOnBeforeCompile(shader, renderer);
    }

    shader.uniforms.uUnitRimColor = { value: rimColor };
    shader.uniforms.uUnitRimIntensity = { value: rimIntensity };
    shader.uniforms.uUnitRimPower = { value: rimPower };
    shader.uniforms.uGlobalRimEnabled = sharedUnitRimUniforms.uGlobalRimEnabled;

    shader.fragmentShader = shader.fragmentShader.replace(
      '#include <common>',
      `#include <common>
uniform vec3 uUnitRimColor;
uniform float uUnitRimIntensity;
uniform float uUnitRimPower;
uniform float uGlobalRimEnabled;`
    );

    if (shader.fragmentShader.includes('#include <emissivemap_fragment>')) {
      shader.fragmentShader = shader.fragmentShader.replace(
        '#include <emissivemap_fragment>',
        `#include <emissivemap_fragment>
if (uGlobalRimEnabled > 0.5) {
  vec3 rimViewDir = normalize(vViewPosition);
  float rimNdotV = clamp(dot(normalize(normal), rimViewDir), 0.0, 1.0);
  float rimFactor = pow(1.0 - rimNdotV, uUnitRimPower);
  totalEmissiveRadiance += uUnitRimColor * (rimFactor * uUnitRimIntensity);
}`
      );
    }
  };

  return material;
}
