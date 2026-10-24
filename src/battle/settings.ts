
export class SoundSettings {
  public musicOn: boolean = false;
  public soundOn: boolean = true;
  public musicVolume: number = 0.15;
  public soundVolume: number = 0.75;
}

export class HexDisplaySettings {
  public showGrid: boolean = true;
  public showHealthbars: boolean = true;
  public showStats: boolean = true;
  public gridBorderThickness: number = 2.5;
  public gridBorderColor: string = '#000000';
}

export class DebugSettings {
  public showCoords: boolean = true;
  public showFps: boolean = true;
  public showSceneInspector: boolean = false;
  public fpsFontSize: number = 14;
  public fpsFontFamily: string = 'GustysSerpents';
  public fpsColor: string = '#ffffff';
  public fpsAlpha: number = 0.7;
  public fpsPosition: { x: number; y: number } = { x: 136, y: 2 };
  public coordsFontSize: number = 14;
  public coordsFontFamily: string = 'GustysSerpents, sans-serif';
  public coordsColor: string = '#ffffff';
  public coordsStrokeColor: string = '#000000';
  public coordsStrokeWidth: number = 3;
}

export class HotkeysSettings {
  public printPathPreview: string = 'p';
  public rest: string = 'r';
  public nextTurn: string = ' ';
  public nextUnit: string = 'tab';
  public resetCamera: string = 'home';
  public toggleStats: string = 'f4';
  public toggleHardwareCursor: string = 'f8';
  public skill1: string = '1';
  public skill2: string = '2';
  public skill3: string = '3';
  public skill4: string = '4';
  public skill5: string = '5';
}

export class BattleSettings {

  public sound: SoundSettings = new SoundSettings();
  public hex: HexDisplaySettings = new HexDisplaySettings();
  public debug: DebugSettings = new DebugSettings();
  public hotkeys: HotkeysSettings = new HotkeysSettings();
  public hideHardwareCursor: boolean = false;

  public load() {
    if (typeof localStorage === 'undefined') return;

    // Load the settings from the browser's local storage
    const sound = localStorage.getItem('hob.sound');
    if (sound) {
      try {
        Object.assign(this.sound, JSON.parse(sound));
      } catch {
        // Fall back to default
      }
    }

    const hex = localStorage.getItem('hob.hex');
    if (hex) {
      try {
        Object.assign(this.hex, JSON.parse(hex));
      } catch {
        // Fall back to default
      }
    }

    const debug = localStorage.getItem('hob.debug');
    if (debug) {
      try {
        Object.assign(this.debug, JSON.parse(debug));
      } catch {
        // Fall back to default
      }
    }

    const showCoords = localStorage.getItem('hob.debug.showCoords');
    if (showCoords !== null) {
      this.debug.showCoords = showCoords === 'true';
    }

    const showGrid = localStorage.getItem('hob.hex.showGrid');
    if (showGrid !== null) {
      this.hex.showGrid = showGrid === 'true';
    }

    const showFps = localStorage.getItem('hob.debug.showFps');
    if (showFps !== null) {
      this.debug.showFps = showFps === 'true';
    }

    const hideHardwareCursor = localStorage.getItem('hob.hideHardwareCursor');
    if (hideHardwareCursor !== null) {
      this.hideHardwareCursor = hideHardwareCursor === 'true';
    }

    const hotkeys = localStorage.getItem('hob.hotkeys');
    if (hotkeys) {
      try {
        Object.assign(this.hotkeys, JSON.parse(hotkeys));
      } catch {
        // Fall back to default
      }
    }
  }

  public save() {
    if (typeof localStorage === 'undefined') return;

    // Save the sound settings to the browser's local storage
    localStorage.setItem('hob.sound', JSON.stringify(this.sound));
    // Save the hex display settings to the browser's local storage
    localStorage.setItem('hob.hex', JSON.stringify(this.hex));
    localStorage.setItem('hob.hex.showGrid', String(this.hex.showGrid));
    // Save the debug settings to the browser's local storage
    localStorage.setItem('hob.debug', JSON.stringify(this.debug));
    localStorage.setItem('hob.debug.showCoords', String(this.debug.showCoords));
    localStorage.setItem('hob.debug.showFps', String(this.debug.showFps));
    // Save the hardware cursor visibility setting to local storage
    localStorage.setItem('hob.hideHardwareCursor', String(this.hideHardwareCursor));
    // Save the hotkeys settings to the browser's local storage
    localStorage.setItem('hob.hotkeys', JSON.stringify(this.hotkeys));
  }
}