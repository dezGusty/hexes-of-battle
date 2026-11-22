import { Container, Graphics, NineSliceSprite, Spritesheet, Text, TextOptions } from "pixi.js";
import { CombatConfig } from "../battle/combat-rules";
import { TerrainType } from "../battle/terrain-types";

export interface TerrainTooltipInfo {
  terrainType: TerrainType | number;
  name: string;
  moveCost: number;
  staminaCost: number;
  modifiers: Array<{ text: string; isDebuff: boolean }>;
}

const TERRAIN_NAMES: Record<number, string> = {
  [TerrainType.PLAIN]: "PLAIN",
  [TerrainType.FOREST]: "FOREST",
  [TerrainType.HILL]: "HILL",
  [TerrainType.SWAMP]: "SWAMP",
  [TerrainType.WATER]: "WATER",
};

export function buildTerrainTooltipInfo(
  terrainType: TerrainType | number,
  combatConfig: CombatConfig
): TerrainTooltipInfo {
  const name = TERRAIN_NAMES[terrainType] ?? "TERRAIN";
  const moveCost = combatConfig.terrain?.moveCosts?.[terrainType] ?? 1;
  const staminaCost = combatConfig.terrain?.staminaCosts?.[terrainType] ?? 1;
  const buff = combatConfig.terrain?.buffs?.[terrainType];

  const modifiers: Array<{ text: string; isDebuff: boolean }> = [];
  if (buff) {
    if (buff.defense_melee) {
      modifiers.push({
        text: `${buff.defense_melee > 0 ? "+" : ""}${buff.defense_melee} Melee Def`,
        isDebuff: buff.defense_melee < 0,
      });
    }
    if (buff.defense_ranged) {
      modifiers.push({
        text: `${buff.defense_ranged > 0 ? "+" : ""}${buff.defense_ranged} Ranged Def`,
        isDebuff: buff.defense_ranged < 0,
      });
    }
    const mLow = buff.attack_melee_low ?? 0;
    const mHigh = buff.attack_melee_high ?? 0;
    if (mLow !== 0 || mHigh !== 0) {
      const val = mLow === mHigh ? `${mLow > 0 ? "+" : ""}${mLow}` : `${mLow > 0 ? "+" : ""}${mLow}..${mHigh}`;
      modifiers.push({
        text: `${val} Melee Atk`,
        isDebuff: mLow + mHigh < 0,
      });
    }
    const rLow = buff.attack_ranged_low ?? 0;
    const rHigh = buff.attack_ranged_high ?? 0;
    if (rLow !== 0 || rHigh !== 0) {
      const val = rLow === rHigh ? `${rLow > 0 ? "+" : ""}${rLow}` : `${rLow > 0 ? "+" : ""}${rLow}..${rHigh}`;
      modifiers.push({
        text: `${val} Ranged Atk`,
        isDebuff: rLow + rHigh < 0,
      });
    }
    if (buff.range) {
      modifiers.push({
        text: `${buff.range > 0 ? "+" : ""}${buff.range} Range`,
        isDebuff: buff.range < 0,
      });
    }
  }

  return {
    terrainType,
    name,
    moveCost,
    staminaCost,
    modifiers,
  };
}

export class TerrainTooltip {
  static TITLE_FONT_STYLE: TextOptions = {
    style: {
      fontFamily: "GustysSerpents, Georgia, serif",
      fontSize: 13,
      fontWeight: "bold",
      fill: { color: "#ffe285", alpha: 1 },
      align: "left",
    },
  };

  static SUBTITLE_FONT_STYLE: TextOptions = {
    style: {
      fontSize: 11,
      fill: { color: "#b8c4d0", alpha: 1 },
      align: "left",
    },
  };

  static MOD_FONT_STYLE: TextOptions = {
    style: {
      fontSize: 11,
      fontWeight: "bold",
      fill: { color: "#a5d6a7", alpha: 1 },
      align: "left",
    },
  };

  public readonly container: Container = new Container();

  private bg?: NineSliceSprite;
  private frame: Graphics = new Graphics();
  private titleText: Text;
  private costText: Text;
  private modTexts: Text[] = [];
  private emptyText: Text;

  public readonly panelWidth: number = 240;
  public panelHeight: number = 76;
  public currentInfo: TerrainTooltipInfo | null = null;

  constructor(parent?: Container, private uiSheet?: Spritesheet) {
    this.container.alpha = 0.84;

    if (this.uiSheet?.textures?.["thin_panel_semitransparent.png"]) {
      this.bg = new NineSliceSprite({
        texture: this.uiSheet.textures["thin_panel_semitransparent.png"],
        leftWidth: 4,
        topHeight: 4,
        rightWidth: 4,
        bottomHeight: 4,
      });
      this.bg.width = this.panelWidth;
      this.bg.height = this.panelHeight;
      this.container.addChild(this.bg);
    }

    this.container.addChild(this.frame);

    this.titleText = new Text({ ...TerrainTooltip.TITLE_FONT_STYLE, text: "PLAIN" });
    this.costText = new Text({ ...TerrainTooltip.SUBTITLE_FONT_STYLE, text: "Move: 1 · Stamina: 1" });
    this.emptyText = new Text({
      style: { fontSize: 11, fill: { color: "#9aa4b0", alpha: 1 } },
      text: "No combat modifiers",
    });

    this.container.addChild(this.titleText);
    this.container.addChild(this.costText);
    this.container.addChild(this.emptyText);

    this.container.visible = false;
    if (parent) {
      parent.addChild(this.container);
    }
  }

  public show(
    info: TerrainTooltipInfo,
    anchorX: number,
    anchorY: number,
    screenWidth: number = 1920,
    screenHeight: number = 1080,
    minTopY?: number
  ): void {
    this.currentInfo = info;
    this.titleText.text = info.name;
    this.costText.text =
      info.terrainType === TerrainType.WATER
        ? "Impassable (ground)"
        : `Move: ${info.moveCost} · Stamina: ${info.staminaCost}`;

    // Clear old modifier texts
    for (const t of this.modTexts) {
      this.container.removeChild(t);
      t.destroy();
    }
    this.modTexts = [];

    let curY = 10;
    this.titleText.position.set(12, curY);
    curY += 20;

    this.costText.position.set(12, curY);
    curY += 20;

    if (info.modifiers.length === 0) {
      this.emptyText.visible = true;
      this.emptyText.position.set(12, curY);
      curY += 18;
    } else {
      this.emptyText.visible = false;
      for (const mod of info.modifiers) {
        const modText = new Text({
          ...TerrainTooltip.MOD_FONT_STYLE,
          style: {
            ...(TerrainTooltip.MOD_FONT_STYLE.style as object),
            fill: { color: mod.isDebuff ? "#ff8888" : "#a5d6a7", alpha: 1 },
          },
          text: mod.text,
        });
        modText.position.set(12, curY);
        this.container.addChild(modText);
        this.modTexts.push(modText);
        curY += 16;
      }
    }

    this.panelHeight = curY + 8;
    if (this.bg) {
      this.bg.height = this.panelHeight;
    }

    this.redrawFrame();
    this.setPosition(anchorX, anchorY, screenWidth, screenHeight, minTopY);
    this.container.visible = true;
  }

  public hide(): void {
    this.container.visible = false;
    this.currentInfo = null;
  }

  public isVisible(): boolean {
    return this.container.visible;
  }

  public setPosition(
    anchorX: number,
    anchorY: number,
    screenWidth: number = 1920,
    screenHeight: number = 1080,
    minTopY?: number
  ): void {
    let posX = anchorX + 20;
    let posY = anchorY - Math.floor(this.panelHeight / 2);

    if (posX + this.panelWidth > screenWidth - 12) {
      posX = anchorX - this.panelWidth - 20;
    }
    if (posX < 12) {
      posX = 12;
    }

    if (minTopY !== undefined && posY < minTopY) {
      posY = minTopY;
    }

    if (posY + this.panelHeight > screenHeight - 12) {
      posY = screenHeight - this.panelHeight - 12;
    }
    if (posY < 12) {
      posY = 12;
    }

    this.container.position.set(Math.round(posX), Math.round(posY));
  }

  private redrawFrame(): void {
    this.frame.clear();
    this.frame
      .roundRect(0, 0, this.panelWidth, this.panelHeight, 6)
      .fill({ color: 0x12151b, alpha: 0.78 })
      .stroke({ color: 0xd4af37, width: 2, alpha: 0.88 });
  }
}
