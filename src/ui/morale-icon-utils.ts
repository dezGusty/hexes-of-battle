import { Assets, Spritesheet, Texture } from 'pixi.js';
import { MoraleState } from '../battle/combat-rules';

export const MORALE_ICON_PATHS: Record<MoraleState, string> = {
  [MoraleState.HIGH]: 'morale/morale_high.png',
  [MoraleState.STEADY]: 'morale/morale_steady.png',
  [MoraleState.WAVERING]: 'morale/morale_wavering.png',
  [MoraleState.PANICKED]: 'morale/morale_panicked.png',
  [MoraleState.ROUTING]: 'morale/morale_routing.png',
};

const moraleCanvasTextureCache = new Map<MoraleState, Texture>();

export function drawStar(
  ctx: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  spikes: number,
  outerRadius: number,
  innerRadius: number,
  color: string
): void {
  let rot = -Math.PI / 2;
  const step = Math.PI / spikes;
  ctx.beginPath();
  ctx.moveTo(cx + Math.cos(rot) * outerRadius, cy + Math.sin(rot) * outerRadius);
  for (let i = 0; i < spikes; i++) {
    rot += step;
    ctx.lineTo(cx + Math.cos(rot) * innerRadius, cy + Math.sin(rot) * innerRadius);
    rot += step;
    ctx.lineTo(cx + Math.cos(rot) * outerRadius, cy + Math.sin(rot) * outerRadius);
  }
  ctx.closePath();
  ctx.fillStyle = color;
  ctx.fill();
}

export function drawMoraleVector(
  ctx: CanvasRenderingContext2D,
  state: MoraleState,
  x: number,
  y: number,
  size: number
): void {
  ctx.save();
  ctx.translate(x, y);
  const s = size / 48;
  ctx.scale(s, s);

  if (state === MoraleState.ROUTING) {
    // Running figure in black
    ctx.fillStyle = '#111111';
    ctx.strokeStyle = '#111111';
    ctx.lineWidth = 4.5;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    // Head
    ctx.beginPath();
    ctx.arc(30, 9, 4, 0, Math.PI * 2);
    ctx.fill();

    // Torso
    ctx.beginPath();
    ctx.moveTo(29, 14);
    ctx.lineTo(22, 26);
    ctx.stroke();

    // Back leg
    ctx.beginPath();
    ctx.moveTo(22, 26);
    ctx.lineTo(14, 28);
    ctx.lineTo(6, 36);
    ctx.stroke();

    // Front leg
    ctx.beginPath();
    ctx.moveTo(22, 26);
    ctx.lineTo(28, 33);
    ctx.lineTo(26, 43);
    ctx.stroke();

    // Arms
    ctx.beginPath();
    ctx.moveTo(28, 16);
    ctx.lineTo(18, 19);
    ctx.lineTo(16, 26);
    ctx.stroke();

    ctx.beginPath();
    ctx.moveTo(25, 20);
    ctx.lineTo(34, 24);
    ctx.lineTo(37, 30);
    ctx.stroke();
  } else {
    // Eagle variants
    let color = '#22c55e'; // Green for steady and high
    if (state === MoraleState.WAVERING) {
      color = '#eab308'; // Yellow
    } else if (state === MoraleState.PANICKED) {
      color = '#ef4444'; // Red
    }

    ctx.fillStyle = color;
    ctx.strokeStyle = color;

    // Head and beak
    ctx.beginPath();
    ctx.arc(24, 15, 4.5, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.moveTo(27, 13);
    ctx.lineTo(32, 15);
    ctx.lineTo(27, 17);
    ctx.closePath();
    ctx.fill();

    // Body
    ctx.beginPath();
    ctx.ellipse(24, 25, 4.5, 9, 0, 0, Math.PI * 2);
    ctx.fill();

    // Tail
    ctx.beginPath();
    ctx.moveTo(21, 32);
    ctx.lineTo(27, 32);
    ctx.lineTo(29, 42);
    ctx.lineTo(24, 40);
    ctx.lineTo(19, 42);
    ctx.closePath();
    ctx.fill();

    if (state === MoraleState.HIGH || state === MoraleState.STEADY) {
      const yShift = state === MoraleState.HIGH ? 2 : 0;
      // Wings raised
      ctx.beginPath();
      ctx.moveTo(21, 23 + yShift);
      ctx.lineTo(15, 18 + yShift);
      ctx.lineTo(8, 12 + yShift);
      ctx.lineTo(3, 7 + yShift);
      ctx.lineTo(6, 17 + yShift);
      ctx.lineTo(11, 18 + yShift);
      ctx.lineTo(9, 23 + yShift);
      ctx.lineTo(14, 23 + yShift);
      ctx.lineTo(12, 28 + yShift);
      ctx.lineTo(18, 27 + yShift);
      ctx.lineTo(22, 28 + yShift);
      ctx.closePath();
      ctx.fill();

      ctx.beginPath();
      ctx.moveTo(27, 23 + yShift);
      ctx.lineTo(33, 18 + yShift);
      ctx.lineTo(40, 12 + yShift);
      ctx.lineTo(45, 7 + yShift);
      ctx.lineTo(42, 17 + yShift);
      ctx.lineTo(37, 18 + yShift);
      ctx.lineTo(39, 23 + yShift);
      ctx.lineTo(34, 23 + yShift);
      ctx.lineTo(36, 28 + yShift);
      ctx.lineTo(30, 27 + yShift);
      ctx.lineTo(26, 28 + yShift);
      ctx.closePath();
      ctx.fill();

      if (state === MoraleState.HIGH) {
        drawStar(ctx, 24, 5, 5, 4.5, 2.0, color);
      }
    } else if (state === MoraleState.WAVERING) {
      // Wings straight
      ctx.beginPath();
      ctx.moveTo(21, 22);
      ctx.lineTo(14, 20);
      ctx.lineTo(8, 20);
      ctx.lineTo(2, 21);
      ctx.lineTo(7, 24);
      ctx.lineTo(4, 27);
      ctx.lineTo(10, 27);
      ctx.lineTo(8, 30);
      ctx.lineTo(15, 29);
      ctx.lineTo(13, 33);
      ctx.lineTo(19, 30);
      ctx.lineTo(21, 27);
      ctx.closePath();
      ctx.fill();

      ctx.beginPath();
      ctx.moveTo(27, 22);
      ctx.lineTo(34, 20);
      ctx.lineTo(40, 20);
      ctx.lineTo(46, 21);
      ctx.lineTo(41, 24);
      ctx.lineTo(44, 27);
      ctx.lineTo(38, 27);
      ctx.lineTo(40, 30);
      ctx.lineTo(33, 29);
      ctx.lineTo(35, 33);
      ctx.lineTo(29, 30);
      ctx.lineTo(27, 27);
      ctx.closePath();
      ctx.fill();
    } else if (state === MoraleState.PANICKED) {
      // Wings lowered
      ctx.beginPath();
      ctx.moveTo(21, 22);
      ctx.lineTo(16, 24);
      ctx.lineTo(11, 28);
      ctx.lineTo(5, 37);
      ctx.lineTo(9, 34);
      ctx.lineTo(7, 40);
      ctx.lineTo(12, 36);
      ctx.lineTo(11, 42);
      ctx.lineTo(15, 37);
      ctx.lineTo(18, 33);
      ctx.lineTo(21, 27);
      ctx.closePath();
      ctx.fill();

      ctx.beginPath();
      ctx.moveTo(27, 22);
      ctx.lineTo(32, 24);
      ctx.lineTo(37, 28);
      ctx.lineTo(43, 37);
      ctx.lineTo(39, 34);
      ctx.lineTo(41, 40);
      ctx.lineTo(36, 36);
      ctx.lineTo(37, 42);
      ctx.lineTo(33, 37);
      ctx.lineTo(30, 33);
      ctx.lineTo(27, 27);
      ctx.closePath();
      ctx.fill();
    }
  }
  ctx.restore();
}

/**
 * Retrieves or generates the Pixi Texture for a given unit morale state.
 */
export function getMoraleTexture(state: MoraleState, uiSheet?: Spritesheet): Texture {
  const path = MORALE_ICON_PATHS[state] || MORALE_ICON_PATHS[MoraleState.STEADY];

  // 1. Check Pixi Assets cache
  try {
    if (typeof Assets !== 'undefined') {
      if ((Assets as any).cache?.get) {
        const tex = (Assets as any).cache.get(path);
        if (tex && (tex instanceof Texture || (tex as any).source)) return tex as Texture;
      }
      if (Assets.get) {
        const tex = Assets.get(path);
        if (tex && (tex instanceof Texture || (tex as any).source)) return tex as Texture;
      }
    }
  } catch {
    // ignore
  }

  // 2. Check UI Spritesheet
  try {
    if (uiSheet?.textures?.[path]) {
      return uiSheet.textures[path];
    }
  } catch {
    // ignore
  }

  // 3. Fallback to Texture.from path
  try {
    if (typeof Texture !== 'undefined' && Texture.from) {
      const tex = Texture.from(path);
      if (tex && tex !== Texture.EMPTY) return tex;
    }
  } catch {
    // ignore
  }

  // 4. In browser environment: generate 48x48 vector graphic on canvas
  try {
    if (moraleCanvasTextureCache.has(state)) {
      return moraleCanvasTextureCache.get(state)!;
    }
    if (typeof document !== 'undefined' && document.createElement && typeof Texture !== 'undefined' && Texture.from) {
      const canvas = document.createElement('canvas');
      canvas.width = 48;
      canvas.height = 48;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        drawMoraleVector(ctx, state, 0, 0, 48);
        const tex = Texture.from(canvas);
        if (tex) {
          moraleCanvasTextureCache.set(state, tex);
          return tex;
        }
      }
    }
  } catch {
    // ignore
  }

  return Texture.EMPTY;
}
