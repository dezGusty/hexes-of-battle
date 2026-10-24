export type DamageIndicatorType = 'health' | 'stamina' | 'morale';

export interface DamageIndicatorStyle {
  color: string;
  sign: string;
  text: string;
}

export const INDICATOR_ICON_PATHS: Record<DamageIndicatorType, string> = {
  health: 'indicators/health.png',
  stamina: 'indicators/stamina.png',
  morale: 'indicators/morale.png',
};

const indicatorImageCache = new Map<DamageIndicatorType, HTMLImageElement>();

export function getIndicatorImage(type: DamageIndicatorType): HTMLImageElement | undefined {
  if (typeof document === 'undefined' || typeof Image === 'undefined') return undefined;
  let img = indicatorImageCache.get(type);
  if (!img) {
    img = new Image();
    img.src = INDICATOR_ICON_PATHS[type];
    indicatorImageCache.set(type, img);
  }
  return img;
}

/**
 * Draws a crisp flat health heart silhouette inside a given bounding box.
 */
export function drawHealthVector(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  size: number,
  isGain: boolean = false
): void {
  ctx.save();
  ctx.translate(x, y);
  const s = size / 48;
  ctx.scale(s, s);

  ctx.fillStyle = isGain ? '#2ecc71' : '#e74c3c';

  ctx.beginPath();
  // Left lobe
  ctx.arc(17, 18, 11, Math.PI, 0, false);
  // Right lobe
  ctx.arc(31, 18, 11, Math.PI, 0, false);
  // Bottom point
  ctx.lineTo(24, 43);
  ctx.closePath();
  ctx.fill();

  ctx.restore();
}

/**
 * Draws a crisp flat stamina lightning bolt silhouette inside a given bounding box.
 */
export function drawStaminaVector(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  size: number,
  isGain: boolean = false
): void {
  ctx.save();
  ctx.translate(x, y);
  const s = size / 48;
  ctx.scale(s, s);

  ctx.fillStyle = isGain ? '#00e5ff' : '#3498db';

  ctx.beginPath();
  ctx.moveTo(27, 4);   // top tip
  ctx.lineTo(13, 25);  // left middle
  ctx.lineTo(23, 25);  // center notch
  ctx.lineTo(17, 44);  // bottom tip
  ctx.lineTo(35, 20);  // right middle
  ctx.lineTo(25, 20);  // center notch top
  ctx.closePath();
  ctx.fill();

  ctx.restore();
}

/**
 * Draws a crisp flat morale eagle/falcon silhouette inside a given bounding box.
 */
export function drawMoraleIndicatorVector(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  size: number,
  isGain: boolean = false
): void {
  ctx.save();
  ctx.translate(x, y);
  const s = size / 48;
  ctx.scale(s, s);

  ctx.fillStyle = isGain ? '#ffd700' : '#e67e22';

  // Body
  ctx.beginPath();
  ctx.moveTo(24, 18);
  ctx.lineTo(29, 24);
  ctx.lineTo(27, 33);
  ctx.lineTo(24, 37);
  ctx.lineTo(21, 33);
  ctx.lineTo(19, 24);
  ctx.closePath();
  ctx.fill();

  // Tail
  ctx.beginPath();
  ctx.moveTo(20, 34);
  ctx.lineTo(24, 43);
  ctx.lineTo(28, 34);
  ctx.closePath();
  ctx.fill();

  // Head & Beak
  ctx.beginPath();
  ctx.arc(24, 15, 4.5, 0, Math.PI * 2);
  ctx.fill();

  ctx.beginPath();
  ctx.moveTo(25, 13.5);
  ctx.lineTo(31, 15.5);
  ctx.lineTo(25, 17.5);
  ctx.closePath();
  ctx.fill();

  // Left wing
  ctx.beginPath();
  ctx.moveTo(22, 23);
  ctx.lineTo(16, 20);
  ctx.lineTo(9, 13);
  ctx.lineTo(4, 7);
  ctx.lineTo(8, 12);
  ctx.lineTo(6, 17);
  ctx.lineTo(11, 18);
  ctx.lineTo(9, 23);
  ctx.lineTo(14, 23);
  ctx.lineTo(12, 28);
  ctx.lineTo(18, 27);
  ctx.lineTo(22, 28);
  ctx.closePath();
  ctx.fill();

  // Right wing
  ctx.beginPath();
  ctx.moveTo(26, 23);
  ctx.lineTo(32, 20);
  ctx.lineTo(39, 13);
  ctx.lineTo(44, 7);
  ctx.lineTo(40, 12);
  ctx.lineTo(42, 17);
  ctx.lineTo(37, 18);
  ctx.lineTo(39, 23);
  ctx.lineTo(34, 23);
  ctx.lineTo(36, 28);
  ctx.lineTo(30, 27);
  ctx.lineTo(26, 28);
  ctx.closePath();
  ctx.fill();

  ctx.restore();
}

/**
 * Draws the appropriate indicator icon based on type and gain/loss.
 */
export function drawIndicatorIcon(
  ctx: CanvasRenderingContext2D,
  type: DamageIndicatorType,
  x: number,
  y: number,
  size: number,
  isGain: boolean
): void {
  const cachedImg = getIndicatorImage(type);
  if (cachedImg && cachedImg.complete && cachedImg.naturalWidth > 0 && !isGain) {
    ctx.drawImage(cachedImg, x, y, size, size);
    return;
  }

  switch (type) {
    case 'health':
      drawHealthVector(ctx, x, y, size, isGain);
      break;
    case 'stamina':
      drawStaminaVector(ctx, x, y, size, isGain);
      break;
    case 'morale':
      drawMoraleIndicatorVector(ctx, x, y, size, isGain);
      break;
  }
}

/**
 * Creates a high-DPI canvas texture for a damage/gain indicator.
 */
export function createDamageIndicatorCanvas(
  type: DamageIndicatorType,
  delta: number
): HTMLCanvasElement | null {
  if (typeof document === 'undefined') return null;

  const canvas = document.createElement('canvas');
  canvas.width = 160;
  canvas.height = 48;
  const ctx = canvas.getContext('2d');
  if (!ctx) return null;

  ctx.clearRect(0, 0, canvas.width, canvas.height);

  const isGain = delta > 0;
  const sign = isGain ? '+' : '-';
  const absVal = Math.abs(delta);
  const valStr = Number.isInteger(absVal) ? String(absVal) : absVal.toFixed(1);
  const textStr = `${sign}${valStr}`;

  // Color selection
  let textColor = '#ff4444';
  if (type === 'health') {
    textColor = isGain ? '#33ee55' : '#ff3b30';
  } else if (type === 'stamina') {
    textColor = isGain ? '#00e5ff' : '#4ba3e3';
  } else if (type === 'morale') {
    textColor = isGain ? '#ffd700' : '#ff9500';
  }

  const iconSize = 26;
  const iconY = Math.round((48 - iconSize) / 2);

  // Measure text
  ctx.font = 'bold 26px sans-serif';
  ctx.textBaseline = 'middle';
  const metrics = ctx.measureText(textStr);
  const textWidth = metrics.width;

  const gap = 6;
  const totalW = iconSize + gap + textWidth;
  const startX = Math.max(4, Math.round((160 - totalW) / 2));

  // Draw icon
  drawIndicatorIcon(ctx, type, startX, iconY, iconSize, isGain);

  // Draw text with prominent dark stroke for maximum readability
  const textX = startX + iconSize + gap;
  const textY = 24;

  ctx.fillStyle = textColor;
  ctx.strokeStyle = '#000000';
  ctx.lineWidth = 4;
  ctx.lineJoin = 'round';
  ctx.strokeText(textStr, textX, textY);
  ctx.fillText(textStr, textX, textY);

  return canvas;
}
