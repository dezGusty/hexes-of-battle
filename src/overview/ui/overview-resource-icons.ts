import { Assets, Container, Graphics, Sprite, Text, Texture } from 'pixi.js';

export type ResourceIconKey = 'money' | 'food' | 'lumber' | 'stone' | 'iron';

export interface ResourceIconMeta {
  key: ResourceIconKey;
  path: string;
  label: string;
  description: string;
}

export const RESOURCE_ICON_META: Record<ResourceIconKey, ResourceIconMeta> = {
  money: {
    key: 'money',
    path: 'ui/resources/money.png',
    label: 'Gold Coins',
    description: 'Treasury gold used for recruitment, defense upgrades, and trade.',
  },
  food: {
    key: 'food',
    path: 'ui/resources/food.png',
    label: 'Food',
    description: 'Provisions sustaining regional population growth.',
  },
  lumber: {
    key: 'lumber',
    path: 'ui/resources/lumber.png',
    label: 'Lumber',
    description: 'Cut timber used for building defenses and recruiting troops.',
  },
  stone: {
    key: 'stone',
    path: 'ui/resources/stone.png',
    label: 'Stone',
    description: 'Quarried masonry used to build and upgrade regional defenses.',
  },
  iron: {
    key: 'iron',
    path: 'ui/resources/iron.png',
    label: 'Iron',
    description: 'Forged metal used for recruiting troops and fortifying defenses.',
  },
};

const textureCache = new Map<string, Texture>();

export function bindResourceIconTexture(
  sprite: Sprite,
  key: ResourceIconKey
): void {
  const path = RESOURCE_ICON_META[key].path;
  const cached = textureCache.get(path);
  if (cached) {
    sprite.texture = cached;
    return;
  }

  if (
    typeof window !== 'undefined' &&
    typeof Assets !== 'undefined' &&
    typeof Assets.load === 'function'
  ) {
    Assets.load<Texture>(path)
      .then((tex) => {
        if (tex) {
          textureCache.set(path, tex);
          if (!sprite.destroyed) {
            sprite.texture = tex;
          }
        }
      })
      .catch(() => {
        // Ignore missing texture in non-browser/test environments
      });
  }
}

export class OverviewResourceTooltip {
  public readonly container = new Container();
  private readonly bg = new Graphics();
  private readonly labelText: Text;

  constructor(parent: Container) {
    this.container.label = 'OverviewResourceTooltip';
    this.container.visible = false;
    this.container.eventMode = 'none';

    this.labelText = new Text({
      text: '',
      style: {
        fill: '#f3f7fb',
        fontSize: 15,
        lineHeight: 21,
        wordWrap: true,
        wordWrapWidth: 280,
      },
    });
    this.labelText.position.set(12, 10);

    this.container.addChild(this.bg, this.labelText);
    parent.addChild(this.container);
  }

  public show(text: string, stageX: number, stageY: number): void {
    this.labelText.text = text;
    let textW = 240;
    let textH = 56;
    if (typeof document !== 'undefined') {
      textW = Math.max(140, Math.min(280, this.labelText.width || 200));
      textH = Math.max(24, this.labelText.height || 40);
    }
    const w = Math.ceil(textW + 24);
    const h = Math.ceil(textH + 20);

    this.bg
      .clear()
      .roundRect(0, 0, w, h, 6)
      .fill({ color: 0x0d131c, alpha: 0.96 })
      .stroke({ width: 1.5, color: 0xd4af37, alpha: 0.95 });

    const clampedX = Math.max(12, Math.min(1920 - w - 12, stageX + 14));
    const clampedY = Math.max(12, Math.min(1080 - h - 12, stageY + 18));
    this.container.position.set(clampedX, clampedY);
    this.container.visible = true;
  }

  public hide(): void {
    this.container.visible = false;
  }

  public isVisible(): boolean {
    return this.container.visible;
  }

  public getText(): string {
    return this.labelText.text;
  }

  public destroy(): void {
    this.container.destroy({ children: true });
  }
}

export interface OverviewResourceBadge {
  container: Container;
  icon: Sprite;
  valueText: Text;
  deltaText: Text;
  setValue: (value: number | string, delta?: number) => void;
  setDelta: (delta: number) => void;
  getTooltipText: () => string;
}

export const POSITIVE_DELTA_COLOR = '#f5d46f';
export const NEGATIVE_DELTA_COLOR = '#d96b1b';

export function createOverviewResourceBadge(
  key: ResourceIconKey,
  options: {
    iconSize?: number;
    fontSize?: number;
    deltaFontSize?: number;
    textColor?: string;
    showDelta?: boolean;
    tooltip?: OverviewResourceTooltip;
    getAnchorStagePos?: () => { x: number; y: number };
  } = {}
): OverviewResourceBadge {
  const iconSize = options.iconSize ?? 28;
  const fontSize = options.fontSize ?? 19;
  const deltaFontSize = options.deltaFontSize ?? 14;
  const textColor = options.textColor ?? '#f3f7fb';
  const meta = RESOURCE_ICON_META[key];

  const container = new Container();
  container.eventMode = 'static';
  container.cursor = 'help';

  const icon = new Sprite(Texture.EMPTY);
  icon.width = iconSize;
  icon.height = iconSize;
  icon.position.set(0, options.showDelta ? 4 : 0);
  bindResourceIconTexture(icon, key);

  const valueText = new Text({
    text: '0',
    style: {
      fill: textColor,
      fontSize,
      fontWeight: 'bold',
    },
  });
  valueText.position.set(
    iconSize + 6,
    options.showDelta ? 0 : Math.max(0, Math.floor((iconSize - fontSize) / 2))
  );

  const deltaText = new Text({
    text: '',
    style: {
      fill: POSITIVE_DELTA_COLOR,
      fontSize: deltaFontSize,
      fontWeight: 'bold',
    },
  });
  deltaText.position.set(iconSize + 6, fontSize + 2);
  deltaText.visible = false;

  container.addChild(icon, valueText, deltaText);

  let currentValue: number | string = 0;
  let currentDelta = 0;
  const getTooltipText = () => {
    const deltaSuffix =
      currentDelta > 0
        ? ` (+${currentDelta}/turn)`
        : currentDelta < 0
          ? ` (${currentDelta}/turn)`
          : '';
    return `${meta.label}: ${currentValue}${deltaSuffix}\n${meta.description}`;
  };

  const showTip = (e?: any) => {
    if (!options.tooltip) return;
    const gx =
      typeof e?.global?.x === 'number'
        ? e.global.x
        : (options.getAnchorStagePos?.().x ?? container.x);
    const gy =
      typeof e?.global?.y === 'number'
        ? e.global.y
        : (options.getAnchorStagePos?.().y ?? container.y + iconSize);
    options.tooltip.show(getTooltipText(), gx, gy);
  };

  container.on('pointerover', showTip);
  container.on('pointermove', showTip);
  container.on('pointerout', () => {
    options.tooltip?.hide();
  });

  const setDelta = (delta: number) => {
    currentDelta = delta;
    if (delta > 0) {
      deltaText.text = `+${delta}`;
      deltaText.style.fill = POSITIVE_DELTA_COLOR;
      deltaText.visible = true;
    } else if (delta < 0) {
      deltaText.text = `${delta}`;
      deltaText.style.fill = NEGATIVE_DELTA_COLOR;
      deltaText.visible = true;
    } else {
      deltaText.text = '';
      deltaText.visible = false;
    }
  };

  return {
    container,
    icon,
    valueText,
    deltaText,
    setValue: (value: number | string, delta?: number) => {
      currentValue = value;
      valueText.text = String(value);
      if (delta !== undefined) {
        setDelta(delta);
      }
    },
    setDelta,
    getTooltipText,
  };
}
