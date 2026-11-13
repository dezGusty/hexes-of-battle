import { Container, Graphics, NineSliceSprite, Spritesheet, Text, TextOptions } from "pixi.js";
import { DamagePreviewResult } from "../battle";

export class DamagePreviewTooltip {
  static TITLE_FONT_STYLE: TextOptions = {
    style: {
      fontFamily: "GustysSerpents, Georgia, serif",
      fontSize: 13,
      fontWeight: "bold",
      fill: { color: "#ffe285", alpha: 1 },
      align: "left",
    },
  };

  static DAMAGE_FONT_STYLE: TextOptions = {
    style: {
      fontFamily: "GustysSerpents, Georgia, serif",
      fontSize: 19,
      fontWeight: "bold",
      fill: { color: "#ffffff", alpha: 1 },
      align: "left",
    },
  };

  static BODY_FONT_STYLE: TextOptions = {
    style: {
      fontSize: 11,
      fill: { color: "#d0d8e0", alpha: 1 },
      align: "left",
    },
  };

  static WARNING_FONT_STYLE: TextOptions = {
    style: {
      fontSize: 11,
      fontWeight: "bold",
      fill: { color: "#ff7777", alpha: 1 },
      align: "left",
    },
  };

  public readonly container: Container = new Container();

  private bg?: NineSliceSprite;
  private frame: Graphics = new Graphics();
  private titleText: Text;
  private badgeText: Text;
  private damageText: Text;
  private casualtiesText: Text;
  private attackerModText: Text;
  private defenderModText: Text;
  private warningText: Text;

  public minDamage: number = 0;
  public maxDamage: number = 0;
  public previewData: DamagePreviewResult | null = null;

  public readonly panelWidth: number = 320;
  public panelHeight: number = 175;

  constructor(parent?: Container, private uiSheet?: Spritesheet) {
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

    this.titleText = new Text({ ...DamagePreviewTooltip.TITLE_FONT_STYLE, text: "COMBAT PREVIEW" });
    this.badgeText = new Text({
      style: { fontSize: 11, fontWeight: "bold", fill: { color: "#ffaa44", alpha: 1 }, align: "right" },
      text: "[MELEE]",
    });
    this.damageText = new Text({ ...DamagePreviewTooltip.DAMAGE_FONT_STYLE, text: "0 - 0 DMG" });
    this.casualtiesText = new Text({
      style: { fontSize: 11, fill: { color: "#a5d6a7", alpha: 1 } },
      text: "Casualties: ~0 models",
    });
    this.attackerModText = new Text({ ...DamagePreviewTooltip.BODY_FONT_STYLE, text: "" });
    this.attackerModText.style.wordWrap = true;
    this.attackerModText.style.wordWrapWidth = this.panelWidth - 24;

    this.defenderModText = new Text({ ...DamagePreviewTooltip.BODY_FONT_STYLE, text: "" });
    this.defenderModText.style.wordWrap = true;
    this.defenderModText.style.wordWrapWidth = this.panelWidth - 24;

    this.warningText = new Text({ ...DamagePreviewTooltip.WARNING_FONT_STYLE, text: "" });
    this.warningText.style.wordWrap = true;
    this.warningText.style.wordWrapWidth = this.panelWidth - 24;

    this.container.addChild(this.titleText);
    this.container.addChild(this.badgeText);
    this.container.addChild(this.damageText);
    this.container.addChild(this.casualtiesText);
    this.container.addChild(this.attackerModText);
    this.container.addChild(this.defenderModText);
    this.container.addChild(this.warningText);

    this.container.visible = false;
    if (parent) {
      parent.addChild(this.container);
    }
  }

  public show(
    preview: DamagePreviewResult,
    anchorX: number,
    anchorY: number,
    screenWidth: number = 1920,
    screenHeight: number = 1080
  ): void {
    this.previewData = preview;
    this.minDamage = preview.minDamage;
    this.maxDamage = preview.maxDamage;

    if (preview.skillName) {
      this.titleText.text = `${preview.skillName.toUpperCase()} PREVIEW`;
    } else {
      this.titleText.text = "COMBAT PREVIEW";
    }

    if (preview.badgeText) {
      this.badgeText.text = preview.badgeText;
      this.badgeText.style.fill = { color: "#ffdd44", alpha: 1 };
    } else {
      const isRanged = preview.isRanged;
      this.badgeText.text = isRanged ? "[RANGED]" : "[MELEE]";
      this.badgeText.style.fill = { color: isRanged ? "#55ccff" : "#ffaa44", alpha: 1 };
    }

    this.damageText.text = `${preview.minDamage} - ${preview.maxDamage} DMG`;
    this.casualtiesText.text = `Casualties: ~${preview.minCasualties} - ${preview.maxCasualties} models  (HP: ${preview.defenderHpBefore} → ${preview.defenderHpAfterMin}..${preview.defenderHpAfterMax})`;

    this.attackerModText.text = `Attacker: ${preview.attackerModifiers.join(" · ")}`;
    this.defenderModText.text = `Defender: ${preview.defenderModifiers.join(" · ")}`;

    if (!preview.canAttack && preview.reasonCannotAttack) {
      this.warningText.text = `⚠️ ${preview.reasonCannotAttack}`;
      this.warningText.visible = true;
    } else {
      this.warningText.text = "";
      this.warningText.visible = false;
    }

    // Dynamic layout
    let badgeW = Math.max(60, this.badgeText.text.length * 8);
    let attackerH = 16;
    let defenderH = 16;
    let warningH = 16;
    try {
      if (typeof document !== "undefined") {
        badgeW = this.badgeText.width || 60;
        attackerH = this.attackerModText.height || 16;
        defenderH = this.defenderModText.height || 16;
        if (this.warningText.visible) {
          warningH = this.warningText.height || 16;
        }
      }
    } catch {
      // headless test environment fallback
    }

    let curY = 10;
    this.titleText.position.set(14, curY);
    this.badgeText.position.set(this.panelWidth - 14 - badgeW, curY);
    curY += 24;

    this.damageText.position.set(14, curY);
    curY += 28;

    this.casualtiesText.position.set(14, curY);
    curY += 20;

    this.attackerModText.position.set(14, curY);
    curY += Math.max(16, attackerH) + 4;

    this.defenderModText.position.set(14, curY);
    curY += Math.max(16, defenderH) + 4;

    if (this.warningText.visible) {
      this.warningText.position.set(14, curY);
      curY += Math.max(16, warningH) + 4;
    }

    this.panelHeight = curY + 8;
    if (this.bg) {
      this.bg.height = this.panelHeight;
    }

    this.redrawFrame();
    this.setPosition(anchorX, anchorY, screenWidth, screenHeight);
    this.container.visible = true;
  }

  public hide(): void {
    this.container.visible = false;
    this.previewData = null;
    this.minDamage = 0;
    this.maxDamage = 0;
  }

  public isVisible(): boolean {
    return this.container.visible;
  }

  public setPosition(
    anchorX: number,
    anchorY: number,
    screenWidth: number = 1920,
    screenHeight: number = 1080
  ): void {
    let posX = anchorX + 20;
    let posY = anchorY - Math.floor(this.panelHeight / 2);

    if (posX + this.panelWidth > screenWidth - 12) {
      posX = anchorX - this.panelWidth - 20;
    }
    if (posX < 12) {
      posX = 12;
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
      .fill({ color: 0x12151b, alpha: 0.94 })
      .stroke({ color: 0xd4af37, width: 2, alpha: 0.92 });

    // Subtle inner accent line under header
    this.frame
      .moveTo(10, 32)
      .lineTo(this.panelWidth - 10, 32)
      .stroke({ color: 0x9b7624, width: 1, alpha: 0.5 });
  }
}
