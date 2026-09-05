import type Phaser from 'phaser';
import { DESIGN_HEIGHT, DESIGN_WIDTH } from '../background/BackgroundManager';

/**
 * Renders the currently-speaking character's portrait as a Phaser sprite
 * layered above the background (portraits are "sprite placement", which
 * per the approved stack belongs to Phaser, not the DOM). DialogueBoxUI
 * (DOM) drives this by asset ID only — it never touches Phaser directly.
 */
export class PortraitRenderer {
  private sprite: Phaser.GameObjects.Image | null = null;

  constructor(private scene: Phaser.Scene) {}

  show(assetKey: string | null): void {
    if (!assetKey) {
      this.hide();
      return;
    }
    if (!this.scene.textures.exists(assetKey)) {
      console.warn(`PortraitRenderer: texture "${assetKey}" not loaded.`);
      return;
    }
    if (!this.sprite) {
      this.sprite = this.scene.add.image(DESIGN_WIDTH * 0.22, DESIGN_HEIGHT * 0.98, assetKey);
      this.sprite.setOrigin(0.5, 1);
      // BackgroundManager recreates its background image object on every
      // render() call (e.g. after a non-repeatable hotspot's post-effect
      // refresh) — Phaser's default draw order is insertion order, so
      // without an explicit depth a later background re-render would
      // silently paint over an already-visible portrait.
      this.sprite.setDepth(10);
    } else {
      this.sprite.setTexture(assetKey);
    }
    const targetHeight = DESIGN_HEIGHT * 0.62;
    const scale = targetHeight / this.sprite.height;
    this.sprite.setScale(scale);
    this.sprite.setVisible(true);
  }

  hide(): void {
    this.sprite?.setVisible(false);
  }

  destroy(): void {
    this.sprite?.destroy();
    this.sprite = null;
  }
}
