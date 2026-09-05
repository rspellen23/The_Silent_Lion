import Phaser from 'phaser';
import type { Hotspot } from '../types';

export const DESIGN_WIDTH = 1920;
export const DESIGN_HEIGHT = 1080;

/**
 * Renders the current scene's background image and its clickable hotspots
 * inside a fixed 1920x1080 design canvas (Phaser's ScaleManager handles
 * responsive fit/centering for tablet and mobile per the platform
 * requirements). No character walking or free movement — hotspots are the
 * only interaction surface, and they respond to both mouse and touch
 * pointers via Phaser's unified pointer events.
 */
export class BackgroundManager {
  private backgroundImage: Phaser.GameObjects.Image | null = null;
  private hotspotZones: Phaser.GameObjects.Zone[] = [];
  private hotspotGraphics: Phaser.GameObjects.Graphics | null = null;

  constructor(private scene: Phaser.Scene) {}

  render(
    backgroundAssetKey: string,
    hotspots: Hotspot[],
    isHotspotActive: (hotspot: Hotspot) => boolean,
    onHotspotActivated: (hotspotId: string) => void,
    isMemory = false
  ): void {
    this.clear();

    this.backgroundImage = this.scene.add
      .image(DESIGN_WIDTH / 2, DESIGN_HEIGHT / 2, backgroundAssetKey)
      .setDisplaySize(DESIGN_WIDTH, DESIGN_HEIGHT);

    // Pensieve/flashback scenes get a cool bluish-silver tint, per the
    // Story Bible's "silver light fills the room" description — purely
    // visual, no placeholder/final art dependency.
    if (isMemory) {
      this.backgroundImage.setTint(0x9fb8ff);
    }

    // Debug outline for hotspot regions — helpful while backgrounds are
    // placeholders and hotspot regions have no visual cue in the art yet.
    this.hotspotGraphics = this.scene.add.graphics();

    for (const hotspot of hotspots) {
      if (!isHotspotActive(hotspot)) continue;

      const x = hotspot.region.x * DESIGN_WIDTH;
      const y = hotspot.region.y * DESIGN_HEIGHT;
      const width = hotspot.region.width * DESIGN_WIDTH;
      const height = hotspot.region.height * DESIGN_HEIGHT;

      this.hotspotGraphics.lineStyle(3, 0x39d6c8, 0.85);
      this.hotspotGraphics.strokeRect(x, y, width, height);

      const zone = this.scene.add
        .zone(x, y, width, height)
        .setOrigin(0, 0)
        .setInteractive({ useHandCursor: true });

      zone.on('pointerup', () => onHotspotActivated(hotspot.id));
      this.hotspotZones.push(zone);
    }
  }

  clear(): void {
    this.backgroundImage?.destroy();
    this.backgroundImage = null;
    this.hotspotGraphics?.destroy();
    this.hotspotGraphics = null;
    for (const zone of this.hotspotZones) zone.destroy();
    this.hotspotZones = [];
  }
}
