import Phaser from 'phaser';

export type PlaceholderKind = 'background' | 'portrait' | 'evidence' | 'ui';

export interface PlaceholderTextureSpec {
  assetId: string;
  kind: PlaceholderKind;
  width: number;
  height: number;
  /** CSS color string for the fill. */
  color: string;
  /** Short label baked into the texture, e.g. character/scene/evidence name. */
  label: string;
}

/**
 * Draws a plain, unmistakably-fake placeholder texture: a flat-color panel,
 * a dashed border, and a "PLACEHOLDER" banner plus the given label. This is
 * a functional stand-in only — never a generated illustration — per the
 * Phase 1 constraint that final art is supplied separately and Claude must
 * not generate art.
 */
export function drawPlaceholderTexture(scene: Phaser.Scene, spec: PlaceholderTextureSpec): void {
  const canvasTexture = scene.textures.createCanvas(spec.assetId, spec.width, spec.height);
  if (!canvasTexture) {
    throw new Error(`PlaceholderTextureFactory: failed to create canvas texture "${spec.assetId}"`);
  }
  const ctx = canvasTexture.getContext();

  const isPortrait = spec.kind === 'portrait';
  if (!isPortrait) {
    ctx.fillStyle = spec.color;
    ctx.fillRect(0, 0, spec.width, spec.height);
  } else {
    // Portraits are transparent-background half-body placeholders: draw a
    // simple silhouette shape only, leaving the rest transparent.
    ctx.clearRect(0, 0, spec.width, spec.height);
    ctx.fillStyle = spec.color;
    const cx = spec.width / 2;
    ctx.beginPath();
    ctx.arc(cx, spec.height * 0.22, spec.width * 0.18, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.moveTo(cx - spec.width * 0.32, spec.height);
    ctx.quadraticCurveTo(cx - spec.width * 0.3, spec.height * 0.4, cx, spec.height * 0.36);
    ctx.quadraticCurveTo(cx + spec.width * 0.3, spec.height * 0.4, cx + spec.width * 0.32, spec.height);
    ctx.closePath();
    ctx.fill();
  }

  ctx.strokeStyle = 'rgba(255, 0, 128, 0.9)';
  ctx.lineWidth = Math.max(2, Math.round(spec.width * 0.01));
  ctx.setLineDash([spec.width * 0.02, spec.width * 0.015]);
  ctx.strokeRect(ctx.lineWidth, ctx.lineWidth, spec.width - ctx.lineWidth * 2, spec.height - ctx.lineWidth * 2);

  const bannerHeight = Math.max(28, Math.round(spec.height * 0.08));
  ctx.fillStyle = 'rgba(0, 0, 0, 0.72)';
  ctx.fillRect(0, spec.height / 2 - bannerHeight, spec.width, bannerHeight * 2);

  ctx.fillStyle = '#ffffff';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.font = `bold ${Math.round(bannerHeight * 0.55)}px sans-serif`;
  ctx.fillText('PLACEHOLDER', spec.width / 2, spec.height / 2 - bannerHeight * 0.42);
  ctx.font = `${Math.round(bannerHeight * 0.42)}px sans-serif`;
  ctx.fillText(spec.label, spec.width / 2, spec.height / 2 + bannerHeight * 0.45);

  canvasTexture.refresh();
}

/** Exports a previously-drawn placeholder (or any canvas) texture as a data URL, for use in <img> tags in DOM UI. */
export function getTextureDataUrl(scene: Phaser.Scene, assetId: string): string | null {
  const texture = scene.textures.get(assetId);
  if (!texture || texture.key === '__MISSING') return null;
  const source = texture.getSourceImage();
  if (source instanceof HTMLCanvasElement) return source.toDataURL();
  return null;
}
