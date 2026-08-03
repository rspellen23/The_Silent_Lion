/**
 * Synthesizes a short sine-wave beep as a WAV data URI. Used only as a
 * functional stand-in for interface SFX in Phase 1 — final audio (music,
 * ambient loops, SFX) will be supplied separately, same as final art.
 */
export function generatePlaceholderBeepDataUri(
  durationSeconds: number,
  frequencyHz: number,
  sampleRate = 8000
): string {
  const sampleCount = Math.floor(durationSeconds * sampleRate);
  const buffer = new ArrayBuffer(44 + sampleCount * 2);
  const view = new DataView(buffer);

  writeAsciiString(view, 0, 'RIFF');
  view.setUint32(4, 36 + sampleCount * 2, true);
  writeAsciiString(view, 8, 'WAVE');
  writeAsciiString(view, 12, 'fmt ');
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true); // PCM
  view.setUint16(22, 1, true); // mono
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, sampleRate * 2, true);
  view.setUint16(32, 2, true);
  view.setUint16(34, 16, true);
  writeAsciiString(view, 36, 'data');
  view.setUint32(40, sampleCount * 2, true);

  for (let i = 0; i < sampleCount; i++) {
    const t = i / sampleRate;
    const envelope = Math.min(1, (sampleCount - i) / (sampleRate * 0.05)) * Math.min(1, i / (sampleRate * 0.01));
    const sample = Math.sin(2 * Math.PI * frequencyHz * t) * envelope * 0.3;
    view.setInt16(44 + i * 2, Math.max(-1, Math.min(1, sample)) * 0x7fff, true);
  }

  return `data:audio/wav;base64,${arrayBufferToBase64(buffer)}`;
}

function writeAsciiString(view: DataView, offset: number, text: string): void {
  for (let i = 0; i < text.length; i++) {
    view.setUint8(offset + i, text.charCodeAt(i));
  }
}

function arrayBufferToBase64(buffer: ArrayBuffer): string {
  let binary = '';
  const bytes = new Uint8Array(buffer);
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}
