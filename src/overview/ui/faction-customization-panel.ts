import { Assets, Container, Graphics, Sprite, Spritesheet, Text } from 'pixi.js';
import { OverviewCampaign } from '../overview-campaign';
import { createOverviewButton, OverviewUiButton } from './overview-ui-helpers';

export const FACTION_NAME_MAX_LENGTH = 32;

export const FACTION_COLOR_OPTIONS: ReadonlyArray<{ label: string; hex: string }> = [
  { label: 'Royal Blue', hex: '#3498bb' },
  { label: 'Crimson', hex: '#c0392b' },
  { label: 'Forest', hex: '#2e7d32' },
  { label: 'Gold', hex: '#d4af37' },
  { label: 'Purple', hex: '#7d3c98' },
  { label: 'Amber', hex: '#d35400' },
  { label: 'Teal', hex: '#16a085' },
  { label: 'Slate', hex: '#34495e' },
  { label: 'Burgundy', hex: '#ad1457' },
  { label: 'Bronze', hex: '#795548' },
];

export const FACTION_BANNER_OPTIONS: readonly string[] = Array.from(
  { length: 64 },
  (_, idx) => `banner${idx + 1}.png`
);

function parseHexColor(hex: string, fallback = 0x3498bb): number {
  const cleaned = hex.trim().replace(/^#/, '');
  const parsed = Number.parseInt(cleaned, 16);
  return Number.isFinite(parsed) ? parsed : fallback;
}

/**
 * Modal panel on the global map allowing the player to customize their faction's
 * name (max 32 chars), heraldic color, and banner emblem.
 *
 * Uses pure-Pixi rendering and keyboard input (no DOM <input> overlay) so the
 * custom software cursor always renders in front of the text box.
 */
export class FactionCustomizationPanel {
  public readonly container = new Container();
  private readonly backdrop = new Graphics();
  private readonly panelBg = new Graphics();
  private readonly titleText: Text;
  private readonly nameBox = new Graphics();
  private readonly nameValueText: Text;
  private readonly placeholderText: Text;
  private readonly charCountText: Text;
  private readonly swatchesContainer = new Container();
  public readonly bannersContainer = new Container();
  private readonly saveButton: OverviewUiButton;
  private readonly cancelButton: OverviewUiButton;

  private campaign?: OverviewCampaign;
  private onSaved?: () => void;
  private bannersSheet?: Spritesheet;
  private draftName: string = 'The Count of Ekkina';
  private draftColor: string = '#3498bb';
  private draftBanner: string = 'banner11.png';
  private inputFocused = true;
  private caretVisible = true;
  private caretTimer?: ReturnType<typeof setInterval>;
  private boundKeyHandler?: (e: KeyboardEvent) => void;

  private static readonly PANEL_W = 1040;
  private static readonly PANEL_H = 626;
  private static readonly PANEL_X = (1920 - 1040) * 0.5;
  private static readonly PANEL_Y = (1080 - 626) * 0.5;

  constructor(parent: Container, onSaved?: () => void, bannersSheet?: Spritesheet) {
    this.onSaved = onSaved;
    this.bannersSheet = bannersSheet;
    this.container.label = 'FactionCustomizationPanel';
    this.container.visible = false;

    this.backdrop
      .rect(0, 0, 1920, 1080)
      .fill({ color: 0x05080d, alpha: 0.65 });
    this.backdrop.eventMode = 'static';
    this.container.addChild(this.backdrop);

    const px = FactionCustomizationPanel.PANEL_X;
    const py = FactionCustomizationPanel.PANEL_Y;
    const pw = FactionCustomizationPanel.PANEL_W;
    const ph = FactionCustomizationPanel.PANEL_H;

    this.panelBg
      .roundRect(px, py, pw, ph, 12)
      .fill({ color: 0x121923, alpha: 0.97 })
      .stroke({ width: 2, color: 0xd4af37, alpha: 0.92 });
    this.panelBg.eventMode = 'static';
    this.container.addChild(this.panelBg);

    this.titleText = new Text({
      text: 'CUSTOMIZE FACTION',
      style: { fill: '#f4d37a', fontFamily: 'Georgia, serif', fontSize: 26, fontWeight: 'bold' },
    });
    this.titleText.anchor.set(0.5, 0);
    this.titleText.position.set(px + pw * 0.5, py + 22);
    this.container.addChild(this.titleText);

    const nameLabel = new Text({
      text: `Faction Name (max ${FACTION_NAME_MAX_LENGTH} characters):`,
      style: { fill: '#c8d6e5', fontSize: 16, fontWeight: 'bold' },
    });
    nameLabel.position.set(px + 34, py + 72);
    this.container.addChild(nameLabel);

    this.nameBox.eventMode = 'static';
    this.nameBox.cursor = 'text';
    this.nameBox.on('pointerdown', () => {
      this.inputFocused = true;
      this.caretVisible = true;
      this.redrawNameBox();
      this.updateNameDisplay();
    });
    this.container.addChild(this.nameBox);
    this.redrawNameBox();

    this.placeholderText = new Text({
      text: 'Type faction name...',
      style: { fill: '#5f738a', fontFamily: 'Georgia, serif', fontSize: 19, fontStyle: 'italic' },
    });
    this.placeholderText.position.set(px + 48, py + 108);
    this.placeholderText.eventMode = 'none';
    this.container.addChild(this.placeholderText);

    this.nameValueText = new Text({
      text: this.draftName,
      style: { fill: '#f8f2e2', fontFamily: 'Georgia, serif', fontSize: 19, fontWeight: 'bold' },
    });
    this.nameValueText.position.set(px + 48, py + 108);
    this.nameValueText.eventMode = 'none';
    this.container.addChild(this.nameValueText);

    const clearBtn = new Container();
    clearBtn.position.set(px + pw - 68, py + 105);
    clearBtn.eventMode = 'static';
    clearBtn.cursor = 'pointer';
    const clearBg = new Graphics()
      .roundRect(0, 0, 26, 28, 4)
      .fill({ color: 0x222f3e, alpha: 0.9 })
      .stroke({ width: 1, color: 0x5c7089, alpha: 0.7 });
    const clearTxt = new Text({
      text: '×',
      style: { fill: '#c8d6e5', fontSize: 18, fontWeight: 'bold' },
    });
    clearTxt.anchor.set(0.5);
    clearTxt.position.set(13, 13);
    clearBtn.addChild(clearBg, clearTxt);
    clearBtn.on('pointerdown', (e) => {
      e.stopPropagation();
      this.inputFocused = true;
      this.caretVisible = true;
      this.setDraftName('');
      this.redrawNameBox();
    });
    this.container.addChild(clearBtn);

    this.charCountText = new Text({
      text: `${this.draftName.length}/${FACTION_NAME_MAX_LENGTH}`,
      style: { fill: '#8fa3b8', fontSize: 13 },
    });
    this.charCountText.anchor.set(1, 0);
    this.charCountText.position.set(px + pw - 36, py + 74);
    this.container.addChild(this.charCountText);

    const colorLabel = new Text({
      text: 'Faction Color:',
      style: { fill: '#c8d6e5', fontSize: 16, fontWeight: 'bold' },
    });
    colorLabel.position.set(px + 34, py + 160);
    this.container.addChild(colorLabel);

    this.swatchesContainer.position.set(px + 34, py + 190);
    this.container.addChild(this.swatchesContainer);

    const bannerLabel = new Text({
      text: 'Faction Banner:',
      style: { fill: '#c8d6e5', fontSize: 16, fontWeight: 'bold' },
    });
    bannerLabel.position.set(px + 34, py + 258);
    this.container.addChild(bannerLabel);

    this.bannersContainer.position.set(px + 34, py + 288);
    this.container.addChild(this.bannersContainer);

    this.saveButton = createOverviewButton(
      'Save Faction',
      170,
      44,
      () => this.applyAndClose(),
      { fillColor: 0x244a32, fontSize: 17 }
    );
    this.saveButton.container.position.set(px + pw - 370, py + ph - 64);

    this.cancelButton = createOverviewButton(
      'Cancel',
      150,
      44,
      () => this.hide(),
      { fillColor: 0x3a2a2a, fontSize: 17 }
    );
    this.cancelButton.container.position.set(px + pw - 184, py + ph - 64);

    this.container.addChild(this.saveButton.container, this.cancelButton.container);
    parent.addChild(this.container);
  }

  public setBannersSheet(sheet?: Spritesheet): void {
    this.bannersSheet = sheet;
    if (this.container.visible) {
      this.rebuildBanners();
    }
  }

  public setDraftName(name: string): void {
    this.draftName = name.slice(0, FACTION_NAME_MAX_LENGTH);
    this.updateNameDisplay();
  }

  public setDraftColor(color: string): void {
    this.draftColor = color;
    this.rebuildSwatches();
  }

  public setDraftBanner(banner: string): void {
    this.draftBanner = banner;
    this.rebuildBanners();
  }

  public show(campaign: OverviewCampaign): void {
    this.campaign = campaign;
    const player = campaign.getPlayer('player');
    this.draftName = (player?.name ?? 'The Count of Ekkina').slice(0, FACTION_NAME_MAX_LENGTH);
    this.draftColor = player?.color ?? '#3498bb';
    this.draftBanner = player?.banner ?? 'banner11.png';
    this.inputFocused = true;
    this.caretVisible = true;

    this.redrawNameBox();
    this.updateNameDisplay();
    this.rebuildSwatches();
    this.rebuildBanners();
    this.container.visible = true;
    this.attachKeyListener();
    this.startCaretBlink();
  }

  public hide(): void {
    this.container.visible = false;
    this.detachKeyListener();
    this.stopCaretBlink();
  }

  public isVisible(): boolean {
    return this.container.visible;
  }

  public applyAndClose(): void {
    if (this.campaign) {
      this.campaign.customizePlayerFaction({
        name: this.draftName,
        color: this.draftColor,
        banner: this.draftBanner,
      });
    }
    this.hide();
    this.onSaved?.();
  }

  private redrawNameBox(): void {
    const px = FactionCustomizationPanel.PANEL_X;
    const py = FactionCustomizationPanel.PANEL_Y;
    const pw = FactionCustomizationPanel.PANEL_W;
    this.nameBox.clear();
    this.nameBox
      .roundRect(px + 34, py + 98, pw - 68, 42, 6)
      .fill({ color: 0x0b1017, alpha: 0.96 })
      .stroke({
        width: this.inputFocused ? 2 : 1.5,
        color: this.inputFocused ? 0xd4af37 : 0x5c7089,
        alpha: 0.95,
      });
  }

  private updateNameDisplay(): void {
    const caret = this.inputFocused && this.caretVisible ? '|' : '';
    this.nameValueText.text = `${this.draftName}${caret}`;
    this.placeholderText.visible = this.draftName.length === 0 && !this.inputFocused;
    this.charCountText.text = `${this.draftName.length}/${FACTION_NAME_MAX_LENGTH}`;
  }

  private resolveBannersSheet(): Spritesheet | undefined {
    if (this.bannersSheet?.textures) {
      return this.bannersSheet;
    }
    try {
      const cached = Assets.get('bannersspritesheet.json') as Spritesheet | undefined;
      if (cached?.textures) {
        this.bannersSheet = cached;
        return cached;
      }
    } catch {
      // Headless / uncached fallback
    }
    return undefined;
  }

  private rebuildSwatches(): void {
    this.swatchesContainer.removeChildren();
    const totalW = FactionCustomizationPanel.PANEL_W - 68;
    const count = FACTION_COLOR_OPTIONS.length;
    const gap = 14;
    const swW = Math.floor((totalW - gap * (count - 1)) / count);
    FACTION_COLOR_OPTIONS.forEach((opt, idx) => {
      const selected = opt.hex.toLowerCase() === this.draftColor.toLowerCase();
      const sw = new Graphics();
      const x = idx * (swW + gap);
      sw.roundRect(0, 0, swW, 42, 6)
        .fill({ color: parseHexColor(opt.hex), alpha: 1 })
        .stroke({
          width: selected ? 3 : 1.5,
          color: selected ? 0xffdf73 : 0x556478,
          alpha: 1,
        });
      sw.position.set(x, 0);
      sw.eventMode = 'static';
      sw.cursor = 'pointer';
      sw.on('pointerdown', () => this.setDraftColor(opt.hex));
      this.swatchesContainer.addChild(sw);
    });
  }

  private rebuildBanners(): void {
    this.bannersContainer.removeChildren();
    const sheet = this.resolveBannersSheet();
    const cols = 16;
    const cellW = 61;
    const cellH = 62;
    const boxW = 56;
    const boxH = 56;

    FACTION_BANNER_OPTIONS.forEach((bannerName, idx) => {
      const col = idx % cols;
      const row = Math.floor(idx / cols);
      const selected = bannerName === this.draftBanner;

      const cell = new Container();
      cell.label = `banner_option_${bannerName}`;
      cell.position.set(col * cellW, row * cellH);
      cell.eventMode = 'static';
      cell.cursor = 'pointer';

      const bg = new Graphics()
        .roundRect(0, 0, boxW, boxH, 5)
        .fill({ color: selected ? 0x26384d : 0x18212d, alpha: 0.95 })
        .stroke({
          width: selected ? 2.5 : 1,
          color: selected ? 0xffdf73 : 0x4b5c70,
          alpha: 1,
        });
      cell.addChild(bg);

      const tex = sheet?.textures?.[bannerName];
      if (tex) {
        const sp = new Sprite(tex);
        sp.label = `banner_sprite_${bannerName}`;
        sp.anchor.set(0.5);
        const texW = Math.max(1, sp.width || tex.width || 64);
        const texH = Math.max(1, sp.height || tex.height || 64);
        const scale = Math.min(48 / texW, 48 / texH);
        sp.scale.set(scale);
        sp.position.set(boxW * 0.5, boxH * 0.5);
        cell.addChild(sp);
      } else {
        const num = bannerName.replace(/\D/g, '') || String(idx + 1);
        const lbl = new Text({
          text: `#${num}`,
          style: { fill: selected ? '#ffdf73' : '#cfd8e3', fontSize: 14, fontWeight: 'bold' },
        });
        lbl.anchor.set(0.5);
        lbl.position.set(boxW * 0.5, boxH * 0.5);
        cell.addChild(lbl);
      }

      cell.on('pointerdown', () => this.setDraftBanner(bannerName));
      this.bannersContainer.addChild(cell);
    });
  }

  private attachKeyListener(): void {
    this.detachKeyListener();
    if (typeof window === 'undefined' || typeof window.addEventListener !== 'function') return;

    this.boundKeyHandler = (e: KeyboardEvent) => {
      if (!this.container.visible) return;

      if (e.key === 'Escape') {
        e.preventDefault();
        e.stopPropagation();
        this.hide();
        return;
      }

      if (e.key === 'Enter') {
        e.preventDefault();
        e.stopPropagation();
        this.applyAndClose();
        return;
      }

      if (!this.inputFocused) return;

      if (e.key === 'Backspace') {
        e.preventDefault();
        e.stopPropagation();
        this.caretVisible = true;
        if (e.ctrlKey || e.metaKey) {
          this.setDraftName('');
        } else {
          this.setDraftName(this.draftName.slice(0, -1));
        }
        return;
      }

      if (e.key.length === 1 && !e.ctrlKey && !e.altKey && !e.metaKey) {
        e.preventDefault();
        e.stopPropagation();
        this.caretVisible = true;
        if (this.draftName.length < FACTION_NAME_MAX_LENGTH) {
          this.setDraftName(this.draftName + e.key);
        }
      }
    };

    window.addEventListener('keydown', this.boundKeyHandler, true);
  }

  private detachKeyListener(): void {
    if (
      this.boundKeyHandler &&
      typeof window !== 'undefined' &&
      typeof window.removeEventListener === 'function'
    ) {
      window.removeEventListener('keydown', this.boundKeyHandler, true);
      this.boundKeyHandler = undefined;
    }
  }

  private startCaretBlink(): void {
    this.stopCaretBlink();
    this.caretTimer = setInterval(() => {
      if (!this.container.visible || !this.inputFocused) return;
      this.caretVisible = !this.caretVisible;
      this.updateNameDisplay();
    }, 530);
  }

  private stopCaretBlink(): void {
    if (this.caretTimer !== undefined) {
      clearInterval(this.caretTimer);
      this.caretTimer = undefined;
    }
  }

  public destroy(): void {
    this.detachKeyListener();
    this.stopCaretBlink();
    this.container.removeFromParent();
    this.container.destroy({ children: true });
  }
}
