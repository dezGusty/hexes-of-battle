import { Container, Graphics, Text } from "pixi.js";

export type MedievalMotifType =
  | "falcon"
  | "eagle"
  | "raven"
  | "songbird"
  | "wolf"
  | "lion"
  | "stag"
  | "boar";

export const BESTIARY_MOTIFS: readonly MedievalMotifType[] = [
  "falcon",
  "eagle",
  "raven",
  "songbird",
  "wolf",
  "lion",
  "stag",
  "boar",
];

export interface MedievalPanelStyleOptions {
  baseColor?: number;
  innerPlateColor?: number;
  stoneColor?: number;
  ironColor?: number;
  bronzeColor?: number;
  goldColor?: number;
  highlightGoldColor?: number;
  cornerRadius?: number;
  rivetSpacing?: number;
}

export const MEDIEVAL_PALETTE = {
  ironDark: 0x12151b,
  ironMid: 0x3b424f,
  bronzeMid: 0x9b7624,
  bronzeLight: 0xd4aa3a,
  goldBright: 0xffdf7a,
};

const DEFAULT_MEDIEVAL_COLORS: Required<MedievalPanelStyleOptions> = {
  baseColor: 0x12151b,
  innerPlateColor: 0x1b2029,
  stoneColor: 0x232832,
  ironColor: 0x3b424f,
  bronzeColor: 0x9b7624,
  goldColor: 0xd4af37,
  highlightGoldColor: 0xffe285,
  cornerRadius: 6,
  rivetSpacing: 64,
};

/**
 * Draws a metallic rivet with shadow, dome, and specular glint.
 */
export function drawMetallicRivet(
  g: Graphics,
  cx: number,
  cy: number,
  radius: number = 3,
  metalColor: number = 0xd4af37,
  shadowColor: number = 0x0d0f13,
  glintColor: number = 0xfff0b3
): void {
  g.circle(cx + 0.8, cy + 0.8, radius + 0.6).fill({ color: shadowColor, alpha: 0.85 });
  g.circle(cx, cy, radius).fill({ color: metalColor, alpha: 1 });
  g.circle(cx - radius * 0.3, cy - radius * 0.3, Math.max(0.8, radius * 0.38)).fill({
    color: glintColor,
    alpha: 0.9,
  });
}

/**
 * Draws interlaced medieval knotwork/scrollwork along a horizontal bar.
 */
export function drawMedievalScrollworkBand(
  g: Graphics,
  startX: number,
  y: number,
  width: number,
  color: number = 0x9b7624,
  alpha: number = 0.65
): void {
  const step = 24;
  const count = Math.floor(width / step);
  for (let i = 0; i < count; i++) {
    const x = startX + i * step;
    // Interlaced wave & diamond knot
    g.moveTo(x, y)
      .lineTo(x + step * 0.25, y - 3)
      .lineTo(x + step * 0.5, y)
      .lineTo(x + step * 0.75, y + 3)
      .lineTo(x + step, y)
      .stroke({ width: 1.2, color, alpha });

    g.moveTo(x, y)
      .lineTo(x + step * 0.25, y + 3)
      .lineTo(x + step * 0.5, y)
      .lineTo(x + step * 0.75, y - 3)
      .lineTo(x + step, y)
      .stroke({ width: 1.2, color, alpha: alpha * 0.8 });

    g.circle(x + step * 0.5, y, 1.3).fill({ color: 0xe6c35c, alpha: alpha * 0.9 });
  }
}

/**
 * Draws a stylized medieval metalwork relief of a bird or wild animal.
 * Supports birds (falcon, eagle, raven, songbird) and wild animals (wolf, lion, stag, boar).
 */
export function drawMedievalBestiaryMotif(
  g: Graphics,
  motif: MedievalMotifType,
  cx: number,
  cy: number,
  size: number = 24,
  flipX: boolean = false,
  primaryColor: number = 0xd4af37,
  accentColor: number = 0xffe285,
  shadowColor: number = 0x0e1015
): void {
  const s = size / 24;
  const dir = flipX ? -1 : 1;
  const tx = (dx: number) => cx + dx * s * dir;
  const ty = (dy: number) => cy + dy * s;

  // Subtle embossed dark iron shadow behind relief
  g.circle(cx, cy, 11 * s).fill({ color: shadowColor, alpha: 0.7 });
  g.circle(cx, cy, 10.5 * s).stroke({ width: 1.4 * s, color: primaryColor, alpha: 0.85 });

  switch (motif) {
    case "falcon":
    case "eagle": {
      // Spread-winged heraldic bird of prey
      // Left & right raised wings with feather pinions
      g.poly([
        tx(0), ty(2),
        tx(-3), ty(-2),
        tx(-9), ty(-6),
        tx(-7), ty(-1),
        tx(-9), ty(1),
        tx(-6), ty(3),
        tx(-7), ty(5),
        tx(-2), ty(4),
        tx(0), ty(8),
        tx(2), ty(4),
        tx(7), ty(5),
        tx(6), ty(3),
        tx(9), ty(1),
        tx(7), ty(-1),
        tx(9), ty(-6),
        tx(3), ty(-2),
      ]).fill({ color: primaryColor, alpha: 0.95 });

      // Head and hooked raptor beak
      g.circle(tx(0), ty(-4.5), 2.4 * s).fill({ color: accentColor, alpha: 1 });
      g.poly([
        tx(1.5), ty(-5.5),
        tx(4.8), ty(-4.0),
        tx(2.2), ty(-2.8),
      ]).fill({ color: accentColor, alpha: 1 });

      // Fanned tail feathers
      g.poly([
        tx(-2), ty(5),
        tx(-4), ty(9),
        tx(0), ty(8),
        tx(4), ty(9),
        tx(2), ty(5),
      ]).fill({ color: primaryColor, alpha: 0.9 });
      break;
    }

    case "raven":
    case "songbird": {
      // Perched medieval bird in profile with foliate tail flourish
      // Body & folded wing
      g.poly([
        tx(-5), ty(3),
        tx(-2), ty(-3),
        tx(3), ty(-2),
        tx(5), ty(2),
        tx(1), ty(5),
        tx(-3), ty(5),
      ]).fill({ color: primaryColor, alpha: 0.95 });

      // Head & pointed beak
      g.circle(tx(3.5), ty(-4.5), 2.5 * s).fill({ color: primaryColor, alpha: 1 });
      g.poly([
        tx(5.5), ty(-5.2),
        tx(9.2), ty(-4.0),
        tx(5.5), ty(-3.0),
      ]).fill({ color: accentColor, alpha: 1 });

      // Wing feather highlight
      g.moveTo(tx(-3), ty(1))
        .lineTo(tx(2), ty(0))
        .lineTo(tx(0), ty(3.5))
        .stroke({ width: 1.2 * s, color: accentColor, alpha: 0.9 });

      // Tail feathers
      g.poly([
        tx(-4), ty(2.5),
        tx(-9), ty(5.5),
        tx(-8), ty(8.0),
        tx(-3), ty(4.5),
      ]).fill({ color: primaryColor, alpha: 0.9 });
      break;
    }

    case "wolf": {
      // Courant (leaping) medieval wolf / hunting hound in profile
      // Snout, head, pointed ears, arched back, forelegs, hindlegs, curled tail
      g.poly([
        tx(9), ty(-2),   // snout tip
        tx(5), ty(-4.5), // forehead
        tx(4), ty(-8),   // ear 1
        tx(2), ty(-5),   // neck
        tx(-4), ty(-3),  // back
        tx(-8), ty(-6),  // curled tail tip
        tx(-9), ty(-2),  // tail curve
        tx(-6), ty(1),   // rump
        tx(-8), ty(7),   // hind leg
        tx(-5), ty(7),
        tx(-3), ty(2),   // belly
        tx(3), ty(2),    // chest
        tx(6), ty(7),    // foreleg
        tx(8), ty(6),
        tx(5), ty(0),    // throat
        tx(8), ty(0),    // lower jaw
      ]).fill({ color: primaryColor, alpha: 0.95 });

      // Collar & eye glint
      g.moveTo(tx(1.5), ty(-4.5))
        .lineTo(tx(4.5), ty(0.5))
        .stroke({ width: 1.5 * s, color: accentColor, alpha: 1 });
      g.circle(tx(5.5), ty(-3), 0.9 * s).fill({ color: shadowColor, alpha: 1 });
      break;
    }

    case "lion": {
      // Heraldic passant/rampant lion crest with mane and raised paw
      // Mane & head
      g.circle(tx(3.5), ty(-3.5), 4.2 * s).fill({ color: primaryColor, alpha: 0.95 });
      // Snout
      g.poly([
        tx(6), ty(-5),
        tx(9), ty(-3.5),
        tx(6), ty(-1.5),
      ]).fill({ color: accentColor, alpha: 1 });
      // Muscular torso & hindquarter
      g.poly([
        tx(2), ty(-1),
        tx(-6), ty(0),
        tx(-7), ty(6),
        tx(-4), ty(6),
        tx(-3), ty(3),
        tx(2), ty(3),
        tx(4), ty(7),
        tx(6), ty(6),
      ]).fill({ color: primaryColor, alpha: 0.95 });
      // Raised forepaw
      g.moveTo(tx(5), ty(0))
        .lineTo(tx(9), ty(2))
        .stroke({ width: 2.0 * s, color: accentColor, alpha: 1 });
      // S-curved heraldic tail over back
      g.moveTo(tx(-5.5), ty(0.5))
        .lineTo(tx(-8), ty(-4))
        .lineTo(tx(-4), ty(-7))
        .stroke({ width: 1.6 * s, color: accentColor, alpha: 0.95 });
      break;
    }

    case "stag": {
      // Royal medieval stag with branching antlers
      // Neck & head
      g.poly([
        tx(-2), ty(7),
        tx(-1), ty(-1),
        tx(3), ty(-3),
        tx(7), ty(-1.5),
        tx(6), ty(0.5),
        tx(2.5), ty(0.5),
        tx(3), ty(7),
      ]).fill({ color: primaryColor, alpha: 0.95 });

      // Branching antlers
      g.moveTo(tx(1.5), ty(-2.5))
        .lineTo(tx(-2), ty(-8))
        .lineTo(tx(-6), ty(-9))
        .stroke({ width: 1.5 * s, color: accentColor, alpha: 1 });
      g.moveTo(tx(-1), ty(-6))
        .lineTo(tx(2), ty(-9))
        .stroke({ width: 1.3 * s, color: accentColor, alpha: 1 });
      g.moveTo(tx(-3.5), ty(-7.5))
        .lineTo(tx(-2), ty(-10))
        .stroke({ width: 1.3 * s, color: accentColor, alpha: 1 });
      break;
    }

    case "boar": {
      // Fierce medieval wild boar with tusk and dorsal bristles
      g.poly([
        tx(-7), ty(2),
        tx(-4), ty(-4),
        tx(2), ty(-4.5),
        tx(8), ty(-1),
        tx(8), ty(2),
        tx(4), ty(4),
        tx(4), ty(7),
        tx(1), ty(7),
        tx(1), ty(4),
        tx(-3), ty(4),
        tx(-4), ty(7),
        tx(-6), ty(7),
      ]).fill({ color: primaryColor, alpha: 0.95 });

      // Curved white/gold tusk
      g.poly([
        tx(6), ty(1.5),
        tx(9.5), ty(-2.5),
        tx(7.5), ty(2.2),
      ]).fill({ color: accentColor, alpha: 1 });

      // Bristled spine ridge
      g.moveTo(tx(-4), ty(-4.2))
        .lineTo(tx(-2), ty(-6.5))
        .lineTo(tx(0), ty(-4.5))
        .lineTo(tx(2), ty(-6.5))
        .lineTo(tx(4), ty(-3.5))
        .stroke({ width: 1.3 * s, color: accentColor, alpha: 0.9 });
      break;
    }
  }
}

/**
 * Creates a standalone Container with a medieval bestiary metalwork ornament.
 */
export function createMedievalBestiaryOrnament(
  motif: MedievalMotifType,
  size: number = 24,
  flipX: boolean = false
): Container {
  const container = new Container();
  container.label = `decoration-${motif}`;
  const g = new Graphics();
  drawMedievalBestiaryMotif(g, motif, 0, 0, size, flipX);
  container.addChild(g);
  return container;
}

/**
 * Creates a wrought-iron and burnished-bronze section header plaque
 * flanked by stylized metalwork birds or wild animals.
 */
export function createMedievalSectionHeader(
  titleText: string,
  width: number,
  leftMotif: MedievalMotifType,
  rightMotif: MedievalMotifType
): Container {
  const container = new Container();
  container.label = `header-${titleText.toLowerCase().replace(/[^a-z0-9]+/g, "-")}`;

  const height = 22;
  const g = new Graphics();

  // Dark forged iron ribbon plate
  g.roundRect(0, 0, width, height, 4)
    .fill({ color: 0x141820, alpha: 0.95 })
    .stroke({ width: 1.5, color: 0x9b7624, alpha: 0.9 });

  // Inner gold hairline
  g.roundRect(2, 2, width - 4, height - 4, 3).stroke({
    width: 0.8,
    color: 0xd4af37,
    alpha: 0.45,
  });

  // Left and right bestiary metalwork medallions
  drawMedievalBestiaryMotif(g, leftMotif, 14, height / 2, 18, false);
  drawMedievalBestiaryMotif(g, rightMotif, width - 14, height / 2, 18, true);

  // Rivets flanking the title
  drawMetallicRivet(g, 30, height / 2, 2, 0xd4af37);
  drawMetallicRivet(g, width - 30, height / 2, 2, 0xd4af37);

  container.addChild(g);

  const label = new Text({
    text: titleText,
    style: {
      fontFamily: "GustysSerpents, Georgia, serif",
      fontSize: 11,
      fontWeight: "bold",
      letterSpacing: 1.5,
      fill: { color: "#f0d27a", alpha: 1 },
      stroke: { color: "#0b0d12", width: 2 },
      align: "center",
    },
  });
  if (label.anchor && typeof label.anchor.set === "function") {
    label.anchor.set(0.5, 0.5);
  }
  label.position = { x: width / 2, y: height / 2 };
  container.addChild(label);

  return container;
}

/**
 * Creates a vertical medieval metalwork divider column with an embossed animal/bird medallion.
 */
export function createMedievalVerticalDivider(
  height: number,
  motif: MedievalMotifType
): Container {
  const container = new Container();
  container.label = `divider-${motif}`;
  const g = new Graphics();

  // Forged iron & bronze pillar
  g.roundRect(-3, 0, 6, height, 2)
    .fill({ color: 0x262b36, alpha: 0.95 })
    .stroke({ width: 1.2, color: 0x9b7624, alpha: 0.85 });

  // Center highlight line
  g.moveTo(0, 4)
    .lineTo(0, height - 4)
    .stroke({ width: 1, color: 0xd4af37, alpha: 0.5 });

  // Top and bottom finial rivets
  drawMetallicRivet(g, 0, 6, 3.2, 0xd4af37);
  drawMetallicRivet(g, 0, height - 6, 3.2, 0xd4af37);

  // Center bestiary medallion
  drawMedievalBestiaryMotif(g, motif, 0, height * 0.5, 22, false);

  container.addChild(g);
  return container;
}

/**
 * Creates the main forged-metal & carved-stone background frame for the combined Battle UI.
 */
export function createMedievalMasterFrame(
  width: number,
  height: number,
  options?: MedievalPanelStyleOptions
): Container {
  const cfg = { ...DEFAULT_MEDIEVAL_COLORS, ...options };
  const container = new Container();
  container.label = "medieval-metalwork-frame";

  const g = new Graphics();

  // Outer drop shadow & heavy wrought-iron base plate
  g.roundRect(0, 0, width, height, cfg.cornerRadius + 2)
    .fill({ color: cfg.baseColor, alpha: 0.97 })
    .stroke({ width: 3, color: cfg.ironColor, alpha: 1 });

  // Recessed stone/slate body plate
  g.roundRect(4, 4, width - 8, height - 8, cfg.cornerRadius)
    .fill({ color: cfg.innerPlateColor, alpha: 0.96 })
    .stroke({ width: 2, color: cfg.bronzeColor, alpha: 0.95 });

  // Inner burnished gold bevel trim
  g.roundRect(7, 7, width - 14, height - 14, Math.max(2, cfg.cornerRadius - 2)).stroke({
    width: 1,
    color: cfg.goldColor,
    alpha: 0.65,
  });

  // Top & bottom medieval knotwork bands
  drawMedievalScrollworkBand(g, 28, 5.5, width - 56, cfg.goldColor, 0.55);
  drawMedievalScrollworkBand(g, 28, height - 5.5, width - 56, cfg.goldColor, 0.45);

  // Corner forged-bronze gusset plates with rivets
  const cornerSize = 22;
  const corners = [
    { x: 3, y: 3, dx: 1, dy: 1 },
    { x: width - 3, y: 3, dx: -1, dy: 1 },
    { x: 3, y: height - 3, dx: 1, dy: -1 },
    { x: width - 3, y: height - 3, dx: -1, dy: -1 },
  ];
  for (const c of corners) {
    g.poly([
      c.x, c.y,
      c.x + c.dx * cornerSize, c.y,
      c.x + c.dx * (cornerSize * 0.45), c.y + c.dy * (cornerSize * 0.45),
      c.x, c.y + c.dy * cornerSize,
    ])
      .fill({ color: cfg.bronzeColor, alpha: 0.95 })
      .stroke({ width: 1, color: cfg.highlightGoldColor, alpha: 0.8 });

    drawMetallicRivet(g, c.x + c.dx * 7, c.y + c.dy * 7, 2.8, cfg.highlightGoldColor);
  }

  // Perimeter rivets along top and bottom rails
  for (let rx = cfg.rivetSpacing; rx < width - 40; rx += cfg.rivetSpacing) {
    drawMetallicRivet(g, rx, 5.5, 2.2, cfg.goldColor);
    drawMetallicRivet(g, rx, height - 5.5, 2.2, cfg.bronzeColor);
  }

  container.addChild(g);
  return container;
}

/**
 * Draws a stylized recessed stone & metalwork circular socket placeholder for unit abilities.
 */
export function drawAbilityPlaceholderSocket(
  g: Graphics,
  x: number,
  y: number,
  size: number = 48,
  slotNumber?: number,
  isOccupied: boolean = false
): void {
  const cx = x + size / 2;
  const cy = y + size / 2;
  const outerR = size / 2 + 3;
  const innerR = size / 2 - 2;

  // Outer carved stone & iron bezel shadow
  g.circle(cx, cy, outerR + 1.5).fill({ color: 0x0c0e12, alpha: 0.9 });

  // Forged bronze/iron circular ring
  g.circle(cx, cy, outerR)
    .fill({ color: isOccupied ? 0x3a321e : 0x2a2f3a, alpha: 0.95 })
    .stroke({
      width: 2,
      color: isOccupied ? 0xd4af37 : 0x7a6328,
      alpha: 0.95,
    });

  // Deep recessed stone circle (the empty area where the action button is placed)
  g.circle(cx, cy, innerR)
    .fill({ color: 0x12151c, alpha: 0.96 })
    .stroke({ width: 1.2, color: 0x454d5e, alpha: 0.8 });

  // 8 compass-point rivets on the metal ring
  for (let a = 0; a < 8; a++) {
    const angle = (a * Math.PI) / 4;
    const rx = cx + Math.cos(angle) * (outerR - 1.5);
    const ry = cy + Math.sin(angle) * (outerR - 1.5);
    g.circle(rx, ry, 1.3).fill({ color: 0xd4af37, alpha: 0.85 });
  }

  if (!isOccupied) {
    // Stylized medieval inner stone engraving (concentric rune ring + 4-point iron cross rosette)
    g.circle(cx, cy, innerR * 0.62).stroke({
      width: 1,
      color: 0x353c4b,
      alpha: 0.75,
    });
    g.poly([
      cx, cy - innerR * 0.45,
      cx + innerR * 0.14, cy - innerR * 0.14,
      cx + innerR * 0.45, cy,
      cx + innerR * 0.14, cy + innerR * 0.14,
      cx, cy + innerR * 0.45,
      cx - innerR * 0.14, cy + innerR * 0.14,
      cx - innerR * 0.45, cy,
      cx - innerR * 0.14, cy - innerR * 0.14,
    ]).stroke({ width: 1, color: 0x4c5568, alpha: 0.65 });
    g.circle(cx, cy, 2.5).fill({ color: 0x353c4b, alpha: 0.8 });
  }

  // Subtle top-left hotkey socket tab if slotNumber is provided
  if (slotNumber !== undefined) {
    g.roundRect(x - 1, y - 1, 14, 14, 3)
      .fill({ color: 0x181c24, alpha: 0.92 })
      .stroke({ width: 1, color: 0x9b7624, alpha: 0.85 });
  }
}

/**
 * Draws a stylized square metalwork socket placeholder for unit perks.
 */
export function drawPerkPlaceholderSocket(
  g: Graphics,
  x: number,
  y: number,
  size: number = 48,
  isOccupied: boolean = false
): void {
  // Beveled dark iron & brass square reliquary recess
  g.roundRect(x - 1, y - 1, size + 2, size + 2, 4)
    .fill({ color: 0x12151c, alpha: 0.94 })
    .stroke({
      width: 1.5,
      color: isOccupied ? 0xc59b27 : 0x554722,
      alpha: 0.85,
    });

  g.roundRect(x + 2, y + 2, size - 4, size - 4, 2).stroke({
    width: 0.8,
    color: 0x323846,
    alpha: 0.7,
  });

  // 4 corner micro-rivets
  drawMetallicRivet(g, x + 3, y + 3, 1.2, 0x9b7624);
  drawMetallicRivet(g, x + size - 3, y + 3, 1.2, 0x9b7624);
  drawMetallicRivet(g, x + 3, y + size - 3, 1.2, 0x9b7624);
  drawMetallicRivet(g, x + size - 3, y + size - 3, 1.2, 0x9b7624);

  if (!isOccupied) {
    const cx = x + size / 2;
    const cy = y + size / 2;
    g.poly([cx, cy - 8, cx + 8, cy, cx, cy + 8, cx - 8, cy]).stroke({
      width: 1,
      color: 0x2f3542,
      alpha: 0.7,
    });
  }
}

export const drawBestiaryRelief = drawMedievalBestiaryMotif;

