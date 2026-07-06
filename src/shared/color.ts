import type { BackgroundConfig } from './types';

/** '#ffffff', 0.9 -> 'rgba(255,255,255,0.9)'. Accepts 3/6-digit hex, with or without '#'. */
export function hexToRgba(hex: string, alpha: number): string {
  let h = (hex || '').replace('#', '');
  if (h.length === 3) h = h.split('').map((c) => c + c).join('');
  const r = parseInt(h.slice(0, 2), 16);
  const g = parseInt(h.slice(2, 4), 16);
  const b = parseInt(h.slice(4, 6), 16);
  return `rgba(${r},${g},${b},${alpha})`;
}

/** Resolve a BackgroundConfig into CSS background-* values. */
export function buildBackground(bg: BackgroundConfig): {
  image: string;
  size: string;
  repeat: string;
  position: string;
} {
  const none = { image: 'transparent', size: 'auto', repeat: 'no-repeat', position: 'center' };
  if (!bg || bg.type === 'none') return none;
  if (bg.type === 'color') return { image: bg.color, size: 'auto', repeat: 'no-repeat', position: 'center' };
  if (bg.type === 'gradient') {
    const stops = (bg.gradient.colors || []).join(',');
    return {
      image: `linear-gradient(${bg.gradient.angle}deg,${stops})`,
      size: 'cover',
      repeat: 'no-repeat',
      position: bg.image?.position || 'center',
    };
  }
  // image
  const url = bg.image?.url;
  if (!url) return none;
  const repeat = bg.image.fit === 'repeat' ? 'repeat' : 'no-repeat';
  const size = bg.image.fit === 'repeat' ? 'auto' : bg.image.fit; // cover | contain
  return { image: `url("${url}")`, size, repeat, position: bg.image.position || 'center' };
}
