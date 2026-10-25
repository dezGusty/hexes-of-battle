import * as THREE from 'three';

export const SELECTED_HALO_TEXTURE_SIZE = 512;
export const SELECTED_HALO_TEXTURE_PATH = 'textures/ui/selected_unit_halo.png';

function clampByte(val: number): number {
  return Math.max(0, Math.min(255, Math.round(val)));
}

function angleDiff(a: number, b: number): number {
  let diff = a - b;
  while (diff < -Math.PI) diff += Math.PI * 2;
  while (diff > Math.PI) diff -= Math.PI * 2;
  return diff;
}

/**
 * Generates an RGBA pixel buffer for the stylized golden combat halo disc.
 * Features:
 * - Empty center (r < 98px) and transparent background (r > 244px)
 * - Concentric golden engraved rims with 3D metallic rivets and grooves
 * - 4 medieval heraldic shields at cardinal angles (0°, 90°, 180°, 270°) with golden rims and quartered heraldry
 * - 4 pairs of crossed steel & gold swords at diagonal angles (45°, 135°, 225°, 315°)
 * - Braided golden laurels, sunburst compass ticks, and radiant gem studs along the circular track
 */
export function generateSelectedHaloPixels(size: number = SELECTED_HALO_TEXTURE_SIZE): Uint8Array {
  const data = new Uint8Array(size * size * 4);
  const cx = size * 0.5;
  const cy = size * 0.5;
  const scale = size / 512;

  const R_INNER_EMPTY = 98 * scale;
  const R_INNER_RIM_START = 100 * scale;
  const R_INNER_RIM_END = 122 * scale;
  const R_MID = 168 * scale;
  const R_OUTER_RIM_START = 214 * scale;
  const R_OUTER_RIM_END = 238 * scale;
  const R_OUTER_TRANSPARENT = 244 * scale;

  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const idx = (y * size + x) * 4;
      const dx = x - cx;
      const dy = y - cy;
      const r = Math.hypot(dx, dy);

      // 1. Outside outer boundary or inside empty center -> 100% transparent
      if (r < R_INNER_EMPTY - 2 * scale || r > R_OUTER_TRANSPARENT + 2 * scale) {
        data[idx] = 0;
        data[idx + 1] = 0;
        data[idx + 2] = 0;
        data[idx + 3] = 0;
        continue;
      }

      // Calculate anti-aliasing alpha factor at boundaries
      let alpha = 255;
      if (r < R_INNER_RIM_START) {
        alpha = clampByte(((r - (R_INNER_EMPTY - 2 * scale)) / (R_INNER_RIM_START - (R_INNER_EMPTY - 2 * scale))) * 255);
      } else if (r > R_OUTER_RIM_END) {
        alpha = clampByte((1 - (r - R_OUTER_RIM_END) / (R_OUTER_TRANSPARENT + 2 * scale - R_OUTER_RIM_END)) * 255);
      }

      const theta = Math.atan2(dy, dx); // [-PI, PI]
      const normTheta = (theta + Math.PI * 2) % (Math.PI * 2);

      let rCol = 0;
      let gCol = 0;
      let bCol = 0;

      // -------------------------------------------------------------
      // 2. Base Disc Shading (Outer rim, mid band, inner rim)
      // -------------------------------------------------------------
      if (r >= R_INNER_RIM_START && r <= R_OUTER_RIM_END) {
        // Base antique gold gradient across the ring band
        const midDist = Math.abs(r - R_MID) / (48 * scale);
        let goldLum = 215 - midDist * 45;

        // Subtle radial engraved compass ticks (every 5° and 15°)
        const deg = (normTheta * 180) / Math.PI;
        const tick5 = Math.abs((deg % 5) - 2.5) / 2.5;
        const tick15 = Math.abs((deg % 15) - 7.5) / 7.5;
        if (tick15 < 0.25) goldLum += 25;
        else if (tick5 < 0.2) goldLum -= 18;

        // Circular tracks at r = 142 and r = 194
        if (Math.abs(r - 142 * scale) <= 1.5 * scale || Math.abs(r - 194 * scale) <= 1.5 * scale) {
          goldLum -= 35;
        }

        rCol = clampByte(goldLum * 1.05);
        gCol = clampByte(goldLum * 0.82);
        bCol = clampByte(goldLum * 0.26);

        // Subtle golden laurel braid texture along mid-track
        const laurelWave = Math.sin(normTheta * 24) * Math.cos(normTheta * 12);
        if (Math.abs(r - (R_MID + laurelWave * 8 * scale)) < 2.5 * scale) {
          rCol = clampByte(rCol + 45);
          gCol = clampByte(gCol + 35);
          bCol = clampByte(bCol + 15);
        }
      }

      // -------------------------------------------------------------
      // 3. Concentric Golden Rims with 3D Rivets
      // -------------------------------------------------------------
      // Outer Rim
      if (r >= R_OUTER_RIM_START && r <= R_OUTER_RIM_END) {
        // Outer glow edge at r ~ 235
        if (r >= 232 * scale && r <= 236 * scale) {
          const edgeDist = Math.abs(r - 234 * scale);
          if (edgeDist < 1.2 * scale) {
            rCol = 255;
            gCol = 246;
            bCol = 185;
          } else {
            rCol = 210;
            gCol = 160;
            bCol = 45;
          }
        }
        // Outer dark groove at r ~ 230
        else if (r >= 228 * scale && r < 232 * scale) {
          rCol = 85;
          gCol = 60;
          bCol = 15;
        }
        // Outer Rivet Band (48 rivets at r = 223)
        else if (r >= 218 * scale && r < 228 * scale) {
          const rivetSpacing = (Math.PI * 2) / 48;
          const nearestRivetAngle = Math.round(normTheta / rivetSpacing) * rivetSpacing;
          const dAngle = angleDiff(normTheta, nearestRivetAngle);
          const rivetDist = Math.hypot(r - 223 * scale, 223 * scale * dAngle);

          if (rivetDist <= 3.6 * scale) {
            // Metallic 3D sphere rivet shading
            const nx = (223 * scale * dAngle) / (3.6 * scale);
            const ny = (r - 223 * scale) / (3.6 * scale);
            const specular = Math.max(0, -nx * 0.7 - ny * 0.7);
            const rivetLum = 180 + specular * 75;
            rCol = clampByte(rivetLum * 1.05);
            gCol = clampByte(rivetLum * 0.88);
            bCol = clampByte(rivetLum * 0.45);
          } else if (rivetDist <= 4.6 * scale) {
            // Rivet drop shadow ring
            rCol = 60;
            gCol = 42;
            bCol = 10;
          }
        }
        // Outer ridge at r ~ 216
        else if (r >= 214 * scale && r < 218 * scale) {
          rCol = 235;
          gCol = 185;
          bCol = 65;
        }
      }

      // Inner Rim
      if (r >= R_INNER_RIM_START && r <= R_INNER_RIM_END) {
        // Inner edge at r ~ 102
        if (r >= 100 * scale && r <= 104 * scale) {
          rCol = 255;
          gCol = 240;
          bCol = 170;
        } else if (r > 104 * scale && r <= 108 * scale) {
          rCol = 75;
          gCol = 50;
          bCol = 12;
        }
        // Inner Rivet Band (32 rivets at r = 113)
        else if (r > 108 * scale && r <= 118 * scale) {
          const rivetSpacing = (Math.PI * 2) / 32;
          const nearestRivetAngle = Math.round(normTheta / rivetSpacing) * rivetSpacing;
          const dAngle = angleDiff(normTheta, nearestRivetAngle);
          const rivetDist = Math.hypot(r - 113 * scale, 113 * scale * dAngle);

          if (rivetDist <= 3.2 * scale) {
            const nx = (113 * scale * dAngle) / (3.2 * scale);
            const ny = (r - 113 * scale) / (3.2 * scale);
            const specular = Math.max(0, -nx * 0.7 - ny * 0.7);
            const rivetLum = 185 + specular * 70;
            rCol = clampByte(rivetLum * 1.05);
            gCol = clampByte(rivetLum * 0.88);
            bCol = clampByte(rivetLum * 0.45);
          } else if (rivetDist <= 4.2 * scale) {
            rCol = 60;
            gCol = 42;
            bCol = 10;
          }
        } else if (r > 118 * scale && r <= 122 * scale) {
          rCol = 230;
          gCol = 180;
          bCol = 55;
        }
      }

      // -------------------------------------------------------------
      // 4. Four Heraldic Shields at Cardinal Angles (0°, 90°, 180°, 270°)
      // -------------------------------------------------------------
      const cardinalAngles = [0, Math.PI * 0.5, Math.PI, Math.PI * 1.5];
      for (const cardAngle of cardinalAngles) {
        const dAngle = angleDiff(theta, cardAngle);
        if (Math.abs(dAngle) < 0.28) {
          // Local coordinates: u is tangential, v is radial relative to shield center
          const v = (r - R_MID); // radial offset from center
          const u = (R_MID * dAngle); // tangential offset

          // Heater shield profile:
          // Top: v <= 24, Bottom point: v = -26
          // Width: |u| <= 18 for v in [0, 24], tapering to 0 at v = -26
          let maxU = 0;
          if (v >= 0 && v <= 24 * scale) {
            maxU = 18 * scale;
          } else if (v < 0 && v >= -26 * scale) {
            const taper = 1 - Math.pow(Math.abs(v) / (26 * scale), 1.5);
            maxU = 18 * scale * taper;
          }

          if (maxU > 0 && Math.abs(u) <= maxU) {
            // Inside shield!
            const edgeDist = maxU - Math.abs(u);
            const topDist = Math.abs(v - 24 * scale);
            const bottomDist = Math.abs(v - (-26 * scale));
            const isBorder = edgeDist <= 3.2 * scale || topDist <= 3.2 * scale || bottomDist <= 3.2 * scale;

            if (isBorder) {
              // Golden Shield Rim
              const rimGlint = (u < -6 * scale && v > 0) ? 50 : 0;
              rCol = clampByte(225 + rimGlint);
              gCol = clampByte(185 + rimGlint);
              bCol = clampByte(65 + rimGlint);

              // Shield border corner rivets
              if (
                (Math.abs(Math.abs(u) - 14 * scale) < 2 * scale && Math.abs(v - 20 * scale) < 2 * scale) ||
                (Math.abs(Math.abs(u) - 15 * scale) < 2 * scale && Math.abs(v) < 2 * scale) ||
                (Math.abs(u) < 2 * scale && Math.abs(v - (-21 * scale)) < 2 * scale)
              ) {
                rCol = 255;
                gCol = 245;
                bCol = 180;
              }
            } else {
              // Shield Face Heraldry (Quartered Royal Red and Deep Steel Blue)
              const isCross = Math.abs(u) <= 2.8 * scale || Math.abs(v - 2 * scale) <= 2.8 * scale;
              if (isCross) {
                // Golden Heraldic Cross
                rCol = 245;
                gCol = 210;
                bCol = 85;
                // Center boss gem
                if (Math.hypot(u, v - 2 * scale) <= 3.0 * scale) {
                  rCol = 240;
                  gCol = 35;
                  bCol = 45; // Radiant ruby center
                }
              } else {
                // Quartered field
                const qX = u > 0;
                const qY = (v - 2 * scale) > 0;
                const isRed = (qX === qY);

                if (isRed) {
                  // Royal Crimson Red with gradient
                  const shade = (u - v) * 0.6;
                  rCol = clampByte(155 + shade);
                  gCol = clampByte(25 + shade * 0.2);
                  bCol = clampByte(35 + shade * 0.2);
                } else {
                  // Midnight Navy Steel
                  const shade = (u - v) * 0.5;
                  rCol = clampByte(28 + shade * 0.3);
                  gCol = clampByte(45 + shade * 0.4);
                  bCol = clampByte(75 + shade * 0.5);
                }
              }
            }
          }
        }
      }

      // -------------------------------------------------------------
      // 5. Four Pairs of Crossed Swords at Diagonals (45°, 135°, 225°, 315°)
      // -------------------------------------------------------------
      const diagonalAngles = [Math.PI * 0.25, Math.PI * 0.75, Math.PI * 1.25, Math.PI * 1.75];
      for (const diagAngle of diagonalAngles) {
        const dAngle = angleDiff(theta, diagAngle);
        if (Math.abs(dAngle) < 0.28) {
          const v = (r - R_MID); // radial offset
          const u = (R_MID * dAngle); // tangential offset

          // Test two crossed swords tilted at +/- 34 degrees
          const tilt = (34 * Math.PI) / 180;
          const cosT = Math.cos(tilt);
          const sinT = Math.sin(tilt);

          // Sword A (tilted +34°)
          const sA = u * cosT + v * sinT; // along blade
          const tA = -u * sinT + v * cosT; // across blade

          // Sword B (tilted -34°)
          const sB = u * cosT - v * sinT; // along blade
          const tB = u * sinT + v * cosT; // across blade

          const checkSword = (s: number, t: number): boolean => {
            // Blade: s in [-2, 27], width tapers from 3.2 down to 0
            if (s >= -2 * scale && s <= 27 * scale) {
              const maxT = 3.2 * scale * (1 - (s - (-2 * scale)) / (32 * scale));
              if (Math.abs(t) <= maxT) {
                // Central fuller groove
                if (Math.abs(t) <= 0.8 * scale && s <= 20 * scale) {
                  rCol = 65;
                  gCol = 75;
                  bCol = 90;
                } else if (t < -0.8 * scale) {
                  // Specular silver highlight side
                  rCol = 245;
                  gCol = 250;
                  bCol = 255;
                } else {
                  // Steel shaded side
                  rCol = 145;
                  gCol = 160;
                  bCol = 180;
                }
                return true;
              }
            }
            // Crossguard: s in [-4.5, -1], width |t| <= 9.5
            else if (s >= -4.5 * scale && s < -1 * scale && Math.abs(t) <= 9.5 * scale) {
              // Golden quillons with sphere ends
              rCol = 245;
              gCol = 205;
              bCol = 65;
              if (Math.abs(Math.abs(t) - 8.5 * scale) <= 1.5 * scale) {
                rCol = 255;
                gCol = 235;
                bCol = 145; // Quillon tip knob
              }
              return true;
            }
            // Grip / Hilt: s in [-13, -4.5], width |t| <= 1.8
            else if (s >= -13 * scale && s < -4.5 * scale && Math.abs(t) <= 1.8 * scale) {
              // Wrapped dark brown leather with gold wire
              const wire = Math.sin(s * 1.5) > 0.3;
              if (wire) {
                rCol = 220;
                gCol = 180;
                bCol = 60;
              } else {
                rCol = 65;
                gCol = 38;
                bCol = 18;
              }
              return true;
            }
            // Pommel: s in [-17, -13], sphere at s = -15, radius 2.6
            else if (s >= -17 * scale && s < -13 * scale) {
              const pomDist = Math.hypot(s - (-15 * scale), t);
              if (pomDist <= 2.6 * scale) {
                rCol = 245;
                gCol = 205;
                bCol = 65;
                if (pomDist <= 1.2 * scale) {
                  rCol = 45;
                  gCol = 125;
                  bCol = 225; // Inlaid sapphire gem in pommel
                }
                return true;
              }
            }
            return false;
          };

          const hitA = checkSword(sA, tA);
          if (!hitA) {
            checkSword(sB, tB);
          }

          // Central golden boss medallion at sword crossing point (u=0, v=0)
          const bossDist = Math.hypot(u, v);
          if (bossDist <= 4.8 * scale) {
            if (bossDist <= 2.2 * scale) {
              rCol = 45;
              gCol = 180;
              bCol = 95; // Emerald center jewel
            } else if (bossDist <= 4.0 * scale) {
              rCol = 255;
              gCol = 225;
              bCol = 110; // Gold boss ring
            } else {
              rCol = 80;
              gCol = 55;
              bCol = 15;
            }
          }
        }
      }

      // -------------------------------------------------------------
      // 6. Radiant Diamond Sparkle Gems at Intermediate 22.5° Angles
      // -------------------------------------------------------------
      const interAngles = [
        Math.PI * 0.125, Math.PI * 0.375, Math.PI * 0.625, Math.PI * 0.875,
        Math.PI * 1.125, Math.PI * 1.375, Math.PI * 1.625, Math.PI * 1.875,
      ];
      for (const interAngle of interAngles) {
        const dAngle = angleDiff(theta, interAngle);
        if (Math.abs(dAngle) < 0.1) {
          const u = R_MID * dAngle;
          const v = r - R_MID;
          const diamondDist = Math.abs(u) + Math.abs(v); // Manhattan distance for diamond star
          if (diamondDist <= 5.5 * scale) {
            const starGlint = (1 - diamondDist / (5.5 * scale)) * 255;
            rCol = clampByte(starGlint);
            gCol = clampByte(starGlint * 0.95);
            bCol = clampByte(starGlint * 0.65);
          }
        }
      }

      data[idx] = rCol;
      data[idx + 1] = gCol;
      data[idx + 2] = bCol;
      data[idx + 3] = alpha;
    }
  }

  return data;
}

/**
 * Creates a THREE.DataTexture containing the procedural golden halo disc.
 */
export function createSelectedHaloTexture(size: number = SELECTED_HALO_TEXTURE_SIZE): THREE.DataTexture {
  const pixels = generateSelectedHaloPixels(size);
  const texture = new THREE.DataTexture(pixels, size, size, THREE.RGBAFormat);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.minFilter = THREE.LinearMipmapLinearFilter;
  texture.magFilter = THREE.LinearFilter;
  texture.generateMipmaps = true;
  texture.needsUpdate = true;
  return texture;
}
