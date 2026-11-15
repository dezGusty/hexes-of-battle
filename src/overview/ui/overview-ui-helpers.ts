import { Container, Graphics, Text } from 'pixi.js';
import { playUISound } from '../../battle/ui-sounds';

export interface OverviewUiButton {
  container: Container;
  bg: Graphics;
  label: Text;
  setEnabled: (enabled: boolean) => void;
  setText: (text: string) => void;
}

export function createOverviewButton(
  text: string,
  width: number,
  height: number,
  onClick: () => void,
  options?: {
    fillColor?: number;
    borderColor?: number;
    fontSize?: number;
    textColor?: string;
  }
): OverviewUiButton {
  const fillColor = options?.fillColor ?? 0x263547;
  const borderColor = options?.borderColor ?? 0xd4af37;
  const fontSize = options?.fontSize ?? 18;
  const textColor = options?.textColor ?? '#ffffff';

  const container = new Container();
  container.eventMode = 'static';
  container.cursor = 'pointer';

  const bg = new Graphics();
  const drawBg = (color: number, alpha: number) => {
    bg.clear()
      .roundRect(0, 0, width, height, 6)
      .fill({ color, alpha })
      .stroke({ width: 1.5, color: borderColor, alpha: 0.9 });
  };
  drawBg(fillColor, 0.95);

  const label = new Text({
    text,
    style: {
      fill: textColor,
      fontSize,
      fontWeight: 'bold',
      align: 'center',
    },
  });
  label.anchor.set(0.5);
  label.position.set(width / 2, height / 2);

  container.addChild(bg, label);

  let isEnabled = true;
  container.on('pointerover', () => {
    if (isEnabled) {
      playUISound('hover');
    }
  });
  container.on('pointertap', () => {
    if (isEnabled) {
      playUISound('click');
      onClick();
    }
  });

  return {
    container,
    bg,
    label,
    setEnabled: (enabled: boolean) => {
      isEnabled = enabled;
      container.alpha = enabled ? 1.0 : 0.45;
      container.cursor = enabled ? 'pointer' : 'default';
    },
    setText: (nextText: string) => {
      label.text = nextText;
    },
  };
}
