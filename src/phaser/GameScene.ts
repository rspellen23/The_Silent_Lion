import Phaser from 'phaser';
import { generatePlaceholderBeepDataUri } from '@engine/placeholder/PlaceholderAudioFactory';
import titleThemeUrl from '../../assets/audio/a-window-to-the-past.mp3';

export const PLACEHOLDER_CLICK_SFX_KEY = 'sfx_placeholder_click';
export const MENU_NAV_SFX_KEY = 'sfx_menu_nav';
export const TITLE_THEME_MUSIC_KEY = 'music_title_theme';

/**
 * Thin Phaser.Scene shell. All engine wiring happens in main.ts via the
 * onReady callback once the scene (and its texture/sound managers) exist —
 * this keeps Phaser-specific bootstrapping out of the framework-agnostic
 * engine code.
 */
export class GameScene extends Phaser.Scene {
  constructor(private onReady: (scene: Phaser.Scene) => void) {
    super('GameScene');
  }

  preload(): void {
    // Placeholder-only interface SFX (short synthesized tones) — see
    // docs/engineering/adr/0005 for why no final SFX ship yet. Menu
    // navigation gets its own higher-pitched, shorter tone so it reads as
    // a distinct "tick" from the deeper hotspot-click beep.
    this.load.audio(PLACEHOLDER_CLICK_SFX_KEY, generatePlaceholderBeepDataUri(0.12, 660));
    this.load.audio(MENU_NAV_SFX_KEY, generatePlaceholderBeepDataUri(0.07, 880));
    // Real, final title-screen theme (not placeholder).
    this.load.audio(TITLE_THEME_MUSIC_KEY, titleThemeUrl);
  }

  create(): void {
    this.onReady(this);
  }
}
