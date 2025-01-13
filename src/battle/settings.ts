
export class SoundSettings {
  public musicOn: boolean = false;
  public soundOn: boolean = false;
  public musicVolume: number = 0.15;
  public soundVolume: number = 0.75;
}

export class HexDisplaySettings {
  public showGrid: boolean = true;
  public showHealthbars: boolean = true;
  public showStats: boolean = true;
}

export class DebugSettings {
  public showCoords: boolean = true;
  public showPerfStats: boolean = false;
}

export class BattleSettings {

  public sound: SoundSettings = new SoundSettings();
  public hex: HexDisplaySettings = new HexDisplaySettings();
  public debug: DebugSettings = new DebugSettings();

  public load() {

    // Load the settings from the browser's local storage
    const sound = localStorage.getItem('hob.sound');
    if (sound) {
      this.sound = JSON.parse(sound);
    }

    const hex = localStorage.getItem('hob.hex');
    if (hex) {
      this.hex = JSON.parse(hex);
    }

    const debug = localStorage.getItem('hob.debug');
    if (debug) {
      this.debug = JSON.parse(debug);
    }
  }

  public save() {
    // Save the sound settings to the browser's local storage
    localStorage.setItem('hob.sound', JSON.stringify(this.sound));
    // Save the hex display settings to the browser's local storage
    localStorage.setItem('hob.hex', JSON.stringify(this.hex));
    // Save the debug settings to the browser's local storage
    localStorage.setItem('hob.debug', JSON.stringify(this.debug));
  }
}