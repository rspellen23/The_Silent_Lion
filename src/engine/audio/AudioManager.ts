import type Phaser from 'phaser';
import type { EventBus } from '../EventBus';
import type { SettingsManager } from '../settings/SettingsManager';

export type AudioChannel = 'music' | 'ambient' | 'sfx';

/**
 * Thin wrapper around Phaser's sound manager. Supports the four channel
 * types required (music, ambient loops, interface SFX, scene-specific SFX)
 * with independently controllable volume plus a global mute, both driven
 * by SettingsManager. Phase 1 ships with generated placeholder tones only
 * (see placeholder/PlaceholderAudio.ts) — no final music/SFX assets.
 */
export class AudioManager {
  private musicSound: Phaser.Sound.BaseSound | null = null;
  private ambientSound: Phaser.Sound.BaseSound | null = null;

  constructor(
    private scene: Phaser.Scene,
    private settings: SettingsManager,
    private events: EventBus
  ) {
    this.events.on('settings:changed', () => this.syncVolumes());
  }

  private effectiveVolume(channel: AudioChannel): number {
    if (this.settings.get('muted')) return 0;
    switch (channel) {
      case 'music':
        return this.settings.get('musicVolume');
      case 'ambient':
        return this.settings.get('ambientVolume');
      case 'sfx':
        return this.settings.get('sfxVolume');
    }
  }

  private syncVolumes(): void {
    if (this.musicSound && 'setVolume' in this.musicSound) {
      (this.musicSound as any).setVolume(this.effectiveVolume('music'));
    }
    if (this.ambientSound && 'setVolume' in this.ambientSound) {
      (this.ambientSound as any).setVolume(this.effectiveVolume('ambient'));
    }
  }

  playMusic(assetKey: string): void {
    if (!this.scene.cache.audio.has(assetKey)) {
      console.warn(`AudioManager: music asset "${assetKey}" not loaded (placeholder audio only in Phase 1).`);
      return;
    }
    this.musicSound?.stop();
    this.musicSound = this.scene.sound.add(assetKey, { loop: true, volume: this.effectiveVolume('music') });
    this.musicSound.play();
  }

  stopMusic(): void {
    this.musicSound?.stop();
    this.musicSound = null;
  }

  playAmbient(assetKey: string): void {
    if (!this.scene.cache.audio.has(assetKey)) {
      console.warn(`AudioManager: ambient asset "${assetKey}" not loaded (placeholder audio only in Phase 1).`);
      return;
    }
    this.ambientSound?.stop();
    this.ambientSound = this.scene.sound.add(assetKey, {
      loop: true,
      volume: this.effectiveVolume('ambient')
    });
    this.ambientSound.play();
  }

  stopAmbient(): void {
    this.ambientSound?.stop();
    this.ambientSound = null;
  }

  playSfx(assetKey: string): void {
    if (!this.scene.cache.audio.has(assetKey)) {
      console.warn(`AudioManager: sfx asset "${assetKey}" not loaded (placeholder audio only in Phase 1).`);
      return;
    }
    this.scene.sound.play(assetKey, { volume: this.effectiveVolume('sfx') });
  }

  stopAll(): void {
    this.stopMusic();
    this.stopAmbient();
    this.scene.sound.stopAll();
  }
}
