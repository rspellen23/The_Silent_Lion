import type Phaser from 'phaser';
import { drawPlaceholderTexture, type PlaceholderTextureSpec } from './PlaceholderTextureFactory';

/**
 * Registers every Phase 1 placeholder texture as a Phaser texture keyed by
 * asset ID, so the rest of the engine can reference assets purely by ID
 * (see docs/engineering/adr/0005-content-data-and-asset-ids.md). Swapping
 * in final art later means replacing this loader's data source, not
 * touching SceneManager/BackgroundManager/PortraitManager/EvidenceSystem.
 */
export function loadPlaceholderTextures(scene: Phaser.Scene, specs: PlaceholderTextureSpec[]): void {
  for (const spec of specs) {
    if (scene.textures.exists(spec.assetId)) continue;
    drawPlaceholderTexture(scene, spec);
  }
}
