import { Container, Graphics, Text, TextOptions } from "pixi.js";
import { Battle } from "../battle";
import { Creature } from "../battle/creature";
import { MoraleState } from "../battle/combat-rules";
import { getTeamColorHex } from "../render3d/units/unit-mesh-builder";
import { playUISound } from "../battle/ui-sounds";

export interface SquadPostBattleInfo {
  creature: Creature;
  name: string;
  aliveCount: number;
  maxCount: number;
  isKilled: boolean;
  isRouted: boolean;
  statusText: string;
}

export interface ArmyLossesSummary {
  armyIndex: number;
  armyName: string;
  totalInitialModels: number;
  totalRemainingModels: number;
  totalModelsLost: number;
  totalInitialSquads: number;
  squadsKilled: number;
  squadsRouted: number;
  squadsSurvived: number;
  squads: SquadPostBattleInfo[];
}

/**
 * Formats the post-battle status text for a single squad according to rules:
 * - For killed squads: "killed" (instead of 0)
 * - For routed squads: "${alive} out of ${max} routed"
 * - For normal survivors: "${alive} out of ${max}"
 */
export function formatSquadPostBattleStatus(
  creature: Creature,
  isKilled: boolean,
  isRouted: boolean
): string {
  if (isKilled || !creature.isAlive || creature.aliveModelCount === 0) {
    return "killed";
  }
  const alive = creature.aliveModelCount;
  const max = creature.maxModels;
  if (isRouted) {
    return `${alive} out of ${max} routed`;
  }
  return `${alive} out of ${max}`;
}

/**
 * Computes all unit losses and per-squad post-battle statuses for a given army.
 */
export function computeArmyLosses(
  armyIndex: number,
  battle: Battle,
  armyName?: string
): ArmyLossesSummary {
  const allSquads = battle.getInitialCreatures(armyIndex);
  const casualties = battle.casualties || [];
  const routed = battle.routedCreatures || [];

  let totalInitialModels = 0;
  let totalRemainingModels = 0;
  let squadsKilled = 0;
  let squadsRouted = 0;
  let squadsSurvived = 0;

  const squadInfos: SquadPostBattleInfo[] = allSquads.map((creature) => {
    const isKilled =
      !creature.isAlive ||
      creature.aliveModelCount === 0 ||
      casualties.some((c) => c === creature || (c.GUID && c.GUID.equals(creature.GUID)));

    const isRouted =
      !isKilled &&
      (routed.some((c) => c === creature || (c.GUID && c.GUID.equals(creature.GUID))) ||
        (creature as any).hasRetreated === true ||
        (creature as any).isRoutedFromBattle === true ||
        creature.moraleState === MoraleState.ROUTING);

    const maxCount = creature.maxModels;
    const aliveCount = isKilled ? 0 : creature.aliveModelCount;

    totalInitialModels += maxCount;
    totalRemainingModels += aliveCount;

    if (isKilled) {
      squadsKilled++;
    } else if (isRouted) {
      squadsRouted++;
    } else {
      squadsSurvived++;
    }

    const statusText = formatSquadPostBattleStatus(creature, isKilled, isRouted);

    return {
      creature,
      name: creature.name,
      aliveCount,
      maxCount,
      isKilled,
      isRouted,
      statusText,
    };
  });

  const totalModelsLost = Math.max(0, totalInitialModels - totalRemainingModels);
  const name =
    armyName ??
    ((battle as any).armyNames?.[armyIndex] || (armyIndex === 0 ? "Player 1" : "Player 2"));

  return {
    armyIndex,
    armyName: name,
    totalInitialModels,
    totalRemainingModels,
    totalModelsLost,
    totalInitialSquads: allSquads.length,
    squadsKilled,
    squadsRouted,
    squadsSurvived,
    squads: squadInfos,
  };
}

/**
 * Post-battle report modal displaying detailed unit losses, surviving squads,
 * routed squads, and casualties for each player in side-by-side columns.
 */
export class PostBattlePanel {
  static TITLE_STYLE: TextOptions = {
    style: {
      fill: { color: "#ffdf7a", alpha: 1 },
      fontSize: 22,
      fontWeight: "bold",
      align: "center",
      dropShadow: {
        alpha: 0.8,
        angle: Math.PI / 6,
        blur: 4,
        color: "#000000",
        distance: 2,
      },
    },
  };

  static VICTOR_STYLE: TextOptions = {
    style: {
      fill: { color: "#ffffff", alpha: 1 },
      fontSize: 16,
      fontWeight: "bold",
      align: "center",
    },
  };

  static SECTION_HEADER_STYLE: TextOptions = {
    style: {
      fill: { color: "#ffffff", alpha: 1 },
      fontSize: 15,
      fontWeight: "bold",
      align: "left",
    },
  };

  static LOSSES_SUMMARY_STYLE: TextOptions = {
    style: {
      fill: { color: "#dddddd", alpha: 1 },
      fontSize: 12,
      align: "left",
    },
  };

  static SQUAD_NAME_STYLE: TextOptions = {
    style: {
      fill: { color: "#ffffff", alpha: 1 },
      fontSize: 13,
      fontWeight: "bold",
      align: "left",
    },
  };

  static STATUS_KILLED_STYLE: TextOptions = {
    style: {
      fill: { color: "#ff5252", alpha: 1 },
      fontSize: 13,
      fontWeight: "bold",
      align: "right",
    },
  };

  static STATUS_ROUTED_STYLE: TextOptions = {
    style: {
      fill: { color: "#ffb74d", alpha: 1 },
      fontSize: 13,
      fontWeight: "bold",
      align: "right",
    },
  };

  static STATUS_SURVIVED_STYLE: TextOptions = {
    style: {
      fill: { color: "#a5d6a7", alpha: 1 },
      fontSize: 13,
      align: "right",
    },
  };

  public readonly window = new Container();
  public readonly dimmer = new Graphics();
  public readonly card = new Container();
  public readonly bgGraphics = new Graphics();
  public readonly contentContainer = new Container();

  public lastVictor: number = -1;
  public lastSummaries: [ArmyLossesSummary | null, ArmyLossesSummary | null] = [null, null];
  public onClose?: () => void;

  public constructor(private parentContainer?: Container) {
    this.window.label = "PostBattlePanel";
    this.window.visible = false;

    // Fullscreen semi-transparent backdrop
    this.dimmer.rect(0, 0, 3000, 3000).fill({ color: 0x000000, alpha: 0.55 });
    this.dimmer.eventMode = "static";
    this.window.addChild(this.dimmer);

    this.card.label = "PostBattleCard";
    this.card.addChild(this.bgGraphics);
    this.card.addChild(this.contentContainer);
    this.window.addChild(this.card);

    if (this.parentContainer) {
      this.parentContainer.addChild(this.window);
    }
  }

  public show(battle: Battle, victorArmyIndex?: number): void {
    const victor =
      victorArmyIndex !== undefined ? victorArmyIndex : battle.checkVictoryConditions();
    this.lastVictor = victor;

    const p1Summary = computeArmyLosses(0, battle);
    const p2Summary = computeArmyLosses(1, battle);
    this.lastSummaries = [p1Summary, p2Summary];

    this.render(battle, victor, p1Summary, p2Summary);
    this.window.visible = true;
  }

  public hide(): void {
    this.window.visible = false;
    this.onClose?.();
  }

  public isVisible(): boolean {
    return this.window.visible;
  }

  public getArmySummary(armyIndex: number, battle?: Battle): ArmyLossesSummary | null {
    if (this.lastSummaries[armyIndex]) {
      return this.lastSummaries[armyIndex];
    }
    if (battle) {
      return computeArmyLosses(armyIndex, battle);
    }
    return null;
  }

  private render(
    _battle: Battle,
    victor: number,
    p1: ArmyLossesSummary,
    p2: ArmyLossesSummary
  ): void {
    this.bgGraphics.clear();
    this.contentContainer.removeChildren();

    const panelW = 960;
    const panelH = 620;

    // Center card on a standard 1920x1080 canvas, or top-left offset if smaller
    const posX = Math.max(20, Math.round((1920 - panelW) / 2));
    const posY = Math.max(20, Math.round((1080 - panelH) / 2));
    this.card.position.set(posX, posY);

    // 1. Outer Frame: Dark semi-transparent slate with burnished gold border
    this.bgGraphics
      .roundRect(0, 0, panelW, panelH, 12)
      .fill({ color: 0x12151b, alpha: 0.93 })
      .stroke({ width: 3, color: 0xd4af37, alpha: 0.95 });

    // Inner subtle panel plate
    this.bgGraphics
      .roundRect(14, 14, panelW - 28, panelH - 28, 8)
      .fill({ color: 0x181c25, alpha: 0.6 })
      .stroke({ width: 1, color: 0x3b424f, alpha: 0.6 });

    // 2. Header Area Plate
    this.bgGraphics
      .roundRect(24, 24, panelW - 48, 76, 6)
      .fill({ color: 0x0f1218, alpha: 0.85 })
      .stroke({ width: 1.5, color: 0x9b7624, alpha: 0.8 });

    // Header Title
    const titleText = new Text({
      ...PostBattlePanel.TITLE_STYLE,
      text: "POST-BATTLE REPORT",
    });
    titleText.anchor.set(0.5, 0);
    titleText.position.set(panelW * 0.5, 34);
    this.contentContainer.addChild(titleText);

    // Victor Banner Subtitle
    let victorMessage = "DRAW — MUTUAL WITHDRAWAL";
    let victorColor = "#f4d03f";
    if (victor === 0) {
      victorMessage = `VICTORY FOR ${p1.armyName.toUpperCase()}`;
      victorColor = "#5dade2";
    } else if (victor === 1) {
      victorMessage = `VICTORY FOR ${p2.armyName.toUpperCase()}`;
      victorColor = "#ec7063";
    }

    const victorText = new Text({
      ...PostBattlePanel.VICTOR_STYLE,
      text: victorMessage,
      style: {
        ...PostBattlePanel.VICTOR_STYLE.style,
        fill: { color: victorColor, alpha: 1 },
      },
    });
    victorText.anchor.set(0.5, 0);
    victorText.position.set(panelW * 0.5, 66);
    this.contentContainer.addChild(victorText);

    // Close button (✕) in top-right corner
    const closeBtn = new Container();
    closeBtn.label = "CloseButton";
    closeBtn.eventMode = "static";
    closeBtn.cursor = "pointer";
    const closeBg = new Graphics();
    closeBg.circle(panelW - 45, 42, 16).fill({ color: 0x2c3e50, alpha: 0.8 });
    const closeText = new Text({
      style: { fill: { color: "#ffffff", alpha: 1 }, fontSize: 16, fontWeight: "bold" },
      text: "✕",
    });
    closeText.anchor.set(0.5);
    closeText.position.set(panelW - 45, 42);
    closeBtn.addChild(closeBg, closeText);
    closeBtn.on("pointerover", () => playUISound("hover"));
    closeBtn.on("pointerdown", () => {
      playUISound("click");
      this.hide();
    });
    this.contentContainer.addChild(closeBtn);

    // 3. Central Vertical Divider
    this.bgGraphics
      .moveTo(panelW * 0.5, 115)
      .lineTo(panelW * 0.5, 540)
      .stroke({ width: 2, color: 0x3b424f, alpha: 0.7 });

    // 4. Render Player 1 (Left) and Player 2 (Right) Columns
    const colWidth = 430;
    const colLeftX = 30;
    const colRightX = panelW * 0.5 + 20;

    this.renderPlayerColumn(p1, colLeftX, colWidth, 0);
    this.renderPlayerColumn(p2, colRightX, colWidth, 1);

    // 5. Bottom Continue / Close Button
    const bottomBtn = new Container();
    bottomBtn.label = "BottomCloseButton";
    bottomBtn.eventMode = "static";
    bottomBtn.cursor = "pointer";
    const btnW = 180;
    const btnH = 38;
    const btnX = (panelW - btnW) * 0.5;
    const btnY = panelH - 58;

    const btnBg = new Graphics();
    btnBg
      .roundRect(btnX, btnY, btnW, btnH, 6)
      .fill({ color: 0x2c3e50, alpha: 0.9 })
      .stroke({ width: 1.5, color: 0xd4af37, alpha: 0.85 });

    const btnText = new Text({
      style: { fill: { color: "#ffffff", alpha: 1 }, fontSize: 14, fontWeight: "bold" },
      text: "CLOSE REPORT",
    });
    btnText.anchor.set(0.5);
    btnText.position.set(btnX + btnW * 0.5, btnY + btnH * 0.5);

    bottomBtn.addChild(btnBg, btnText);
    bottomBtn.on("pointerover", () => playUISound("hover"));
    bottomBtn.on("pointerdown", () => {
      playUISound("click");
      this.hide();
    });
    this.contentContainer.addChild(bottomBtn);
  }

  private renderPlayerColumn(
    summary: ArmyLossesSummary,
    startX: number,
    width: number,
    armyIndex: number
  ): void {
    const headerY = 115;
    const headerH = 68;
    const teamHex = getTeamColorHex(armyIndex, false);
    const teamColorStr = armyIndex === 0 ? "#5dade2" : "#ec7063";
    const tintColor = armyIndex === 0 ? 0x16283c : 0x3c1818;

    // Header Plate
    this.bgGraphics
      .roundRect(startX, headerY, width, headerH, 6)
      .fill({ color: tintColor, alpha: 0.75 })
      .stroke({ width: 2, color: teamHex, alpha: 0.85 });

    // Army Name Title
    const nameText = new Text({
      ...PostBattlePanel.SECTION_HEADER_STYLE,
      text: summary.armyName,
      style: {
        ...PostBattlePanel.SECTION_HEADER_STYLE.style,
        fill: { color: teamColorStr, alpha: 1 },
      },
    });
    nameText.position.set(startX + 14, headerY + 10);
    this.contentContainer.addChild(nameText);

    // Losses Summary Line
    const lossesStr = `Unit Losses: ${summary.totalModelsLost} of ${summary.totalInitialModels} units lost (${summary.squadsKilled} killed, ${summary.squadsRouted} routed)`;
    const lossesText = new Text({
      ...PostBattlePanel.LOSSES_SUMMARY_STYLE,
      text: lossesStr,
    });
    lossesText.position.set(startX + 14, headerY + 38);
    this.contentContainer.addChild(lossesText);

    // Squad Rows Table
    const startY = headerY + headerH + 12;
    const rowHeight = 30;
    const maxVisibleRows = 11;

    if (summary.squads.length === 0) {
      const emptyText = new Text({
        style: { fill: { color: "#888888", alpha: 1 }, fontSize: 13, fontStyle: "italic" },
        text: "No squads participated.",
      });
      emptyText.position.set(startX + 14, startY + 10);
      this.contentContainer.addChild(emptyText);
      return;
    }

    summary.squads.forEach((squad, i) => {
      if (i >= maxVisibleRows) return; // Prevent overflow

      const rowY = startY + i * (rowHeight + 4);

      // Row background zebra stripe
      const rowBgColor = i % 2 === 0 ? 0x1b202a : 0x151922;
      this.bgGraphics
        .roundRect(startX, rowY, width, rowHeight, 4)
        .fill({ color: rowBgColor, alpha: 0.65 });

      // Squad Name
      const squadNameText = new Text({
        ...PostBattlePanel.SQUAD_NAME_STYLE,
        text: squad.name,
      });
      squadNameText.position.set(startX + 12, rowY + 6);
      this.contentContainer.addChild(squadNameText);

      // Squad Status (Right-aligned)
      let statusStyle = PostBattlePanel.STATUS_SURVIVED_STYLE;
      if (squad.isKilled) {
        statusStyle = PostBattlePanel.STATUS_KILLED_STYLE;
      } else if (squad.isRouted) {
        statusStyle = PostBattlePanel.STATUS_ROUTED_STYLE;
      }

      const statusText = new Text({
        ...statusStyle,
        text: squad.statusText,
      });
      statusText.anchor.set(1, 0);
      statusText.position.set(startX + width - 14, rowY + 6);
      this.contentContainer.addChild(statusText);
    });
  }

  public destroy(): void {
    this.contentContainer.destroy({ children: true });
    this.bgGraphics.destroy();
    this.dimmer.destroy();
    this.card.destroy({ children: true });
    this.window.destroy({ children: true });
  }
}
