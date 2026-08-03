import Phaser from 'phaser';
import { generatePlaceholderBeepDataUri } from '@engine/placeholder/PlaceholderAudioFactory';

export const PLACEHOLDER_CLICK_SFX_KEY = 'sfx_placeholder_click';

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
    // Placeholder-only interface SFX (a short synthesized beep) — see
    // docs/engineering/adr/0005 for why no real audio ships in Phase 1.
    this.load.audio(PLACEHOLDER_CLICK_SFX_KEY, generatePlaceholderBeepDataUri(0.12, 660));
  }

  create(): void {
    this.onReady(this);
  }
}
