import { sound } from '@pixi/sound';
import { BattleSettings } from './settings';

export enum SoundCategory {
  MUSIC = 'MUSIC',
  SOUND = 'SOUND',
}

export enum SoundType {
  MOVE = 'MOVE',
  DIE = 'DIE',
  SWORD = 'SWORD',
  ARROW = 'ARROW',
  BATTLE_MUSIC = 'BATTLE_MUSIC',
  // Convenience aliases
  MUSIC = 'BATTLE_MUSIC',
  ATTACK_MELEE = 'SWORD',
  ATTACK_RANGED = 'ARROW',
}

export interface PlaySoundOptions {
  volume?: number;
  speed?: number;
  loop?: boolean;
  fluctuate?: boolean;
}

/**
 * Common sound system interface. Decouples scenes and components
 * from knowledge of underlying sound library and sound asset names.
 */
export interface ISoundSystem {
  play(
    category: SoundCategory,
    type: SoundType,
    options?: PlaySoundOptions | boolean | number,
    volume?: number
  ): void;
  playWithFluctuation?(
    category: SoundCategory,
    type: SoundType,
    optionsOrVolume?: PlaySoundOptions | number
  ): void;
  stop(category: SoundCategory, type?: SoundType): void;
  setSettings?(settings: BattleSettings): void;
  registerSound?(type: SoundType, soundName: string): void;
  getSoundName?(type: SoundType): string | undefined;
}

export type SoundSystem = ISoundSystem;

/**
 * PixiJS Sound implementation of ISoundSystem.
 */
export class PixiSoundSystem implements ISoundSystem {
  private settings?: BattleSettings;
  private soundMap: Map<SoundType, string>;

  constructor(settings?: BattleSettings, customSoundMap?: Partial<Record<SoundType, string>>) {
    this.settings = settings;
    this.soundMap = new Map<SoundType, string>([
      [SoundType.MOVE, 'move'],
      [SoundType.DIE, 'die'],
      [SoundType.SWORD, 'sword'],
      [SoundType.ARROW, 'arrow'],
      [SoundType.BATTLE_MUSIC, 'track_dark_whispers'],
    ]);

    if (customSoundMap) {
      for (const [type, soundName] of Object.entries(customSoundMap)) {
        if (soundName) {
          this.soundMap.set(type as SoundType, soundName);
        }
      }
    }
  }

  public setSettings(settings: BattleSettings): void {
    this.settings = settings;
  }

  public registerSound(type: SoundType, soundName: string): void {
    this.soundMap.set(type, soundName);
  }

  public getSoundName(type: SoundType): string | undefined {
    return this.soundMap.get(type);
  }

  public play(
    category: SoundCategory,
    type: SoundType,
    optionsOrSpeedOrFluctuate?: PlaySoundOptions | boolean | number,
    optVolume?: number
  ): void {
    const soundName = this.soundMap.get(type);
    if (!soundName) {
      console.warn(`[PixiSoundSystem] No sound registered for type: ${type}`);
      return;
    }

    let speed: number | undefined;
    let volume: number | undefined;
    let loop: boolean | undefined;
    let fluctuate: boolean | undefined;

    if (typeof optionsOrSpeedOrFluctuate === 'number') {
      speed = optionsOrSpeedOrFluctuate;
      volume = optVolume;
    } else if (typeof optionsOrSpeedOrFluctuate === 'boolean') {
      fluctuate = optionsOrSpeedOrFluctuate;
      volume = optVolume;
    } else if (typeof optionsOrSpeedOrFluctuate === 'object' && optionsOrSpeedOrFluctuate !== null) {
      speed = optionsOrSpeedOrFluctuate.speed;
      volume = optionsOrSpeedOrFluctuate.volume ?? optVolume;
      loop = optionsOrSpeedOrFluctuate.loop;
      fluctuate = optionsOrSpeedOrFluctuate.fluctuate;
    }

    if (category === SoundCategory.MUSIC) {
      if (this.settings && !this.settings.sound.musicOn) {
        return;
      }
      const finalVolume = volume ?? this.settings?.sound.musicVolume ?? 0.15;
      const finalLoop = loop ?? true;
      try {
        sound.stop(soundName);
        const playOptions: { loop?: boolean; volume?: number; speed?: number } = {
          loop: finalLoop,
          volume: finalVolume,
        };
        if (speed !== undefined) {
          playOptions.speed = speed;
        }
        sound.play(soundName, playOptions);
      } catch (err) {
        console.warn(`[PixiSoundSystem] Failed to play music '${soundName}':`, err);
      }
    } else if (category === SoundCategory.SOUND) {
      if (this.settings && !this.settings.sound.soundOn) {
        return;
      }
      const finalVolume = volume ?? this.settings?.sound.soundVolume ?? 0.75;
      const finalSpeed = speed ?? (fluctuate ? (0.9 + Math.random() * 0.2) : 1.0);
      try {
        sound.play(soundName, { speed: finalSpeed, volume: finalVolume });
      } catch (err) {
        console.warn(`[PixiSoundSystem] Failed to play sound '${soundName}':`, err);
      }
    }
  }

  public playWithFluctuation(
    category: SoundCategory,
    type: SoundType,
    optionsOrVolume?: PlaySoundOptions | number
  ): void {
    if (typeof optionsOrVolume === 'number') {
      this.play(category, type, { volume: optionsOrVolume, fluctuate: true });
    } else {
      this.play(category, type, { ...optionsOrVolume, fluctuate: true });
    }
  }

  public stop(category: SoundCategory, type?: SoundType): void {
    if (type !== undefined) {
      const soundName = this.soundMap.get(type);
      if (soundName) {
        try {
          sound.stop(soundName);
        } catch {}
      }
    } else {
      if (category === SoundCategory.MUSIC) {
        const musicSound = this.soundMap.get(SoundType.BATTLE_MUSIC);
        if (musicSound) {
          try {
            sound.stop(musicSound);
          } catch {}
        }
      } else {
        for (const [st, soundName] of this.soundMap.entries()) {
          if (st !== SoundType.BATTLE_MUSIC) {
            try {
              sound.stop(soundName);
            } catch {}
          }
        }
      }
    }
  }
}

export class BattleSoundSystem extends PixiSoundSystem {}
