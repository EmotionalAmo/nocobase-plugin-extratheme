import type { BackgroundConfig } from './types';

/**
 * Sanitize a (possibly hand-typed) CSS font-family stack so it can't break out of
 * the injected declaration or corrupt the whole <style>. A font-family only needs
 * letters/digits/space/comma/quotes/hyphen. Strip:
 *   - `;{}<>\` — declaration/rule breakout chars,
 *   - `/` and `*` — CSS comment markers (a lone `/​*` would comment out the rest of
 *     the injected stylesheet, silently killing every rule after the font),
 *   - control chars (collapsed to a space),
 * then drop quotes if unbalanced (a lone quote runs a CSS string past the `}`), and
 * cap the length. Returns '' for empty.
 */
export function sanitizeFontFamily(family: string): string {
  let s = (family || '')
    .replace(/[;{}<>\\/*]/g, '')
    .replace(/[\r\n\t]+/g, ' ')
    .trim();
  if ((s.match(/"/g) || []).length % 2) s = s.replace(/"/g, '');
  if ((s.match(/'/g) || []).length % 2) s = s.replace(/'/g, '');
  return s.slice(0, 200);
}

/** Map a font file URL's extension to an @font-face src `format()` value (''=unknown). */
export function fontFormatFromUrl(url: string): string {
  const ext = ((url || '').split('?')[0].split('#')[0].match(/\.([a-z0-9]+)$/i)?.[1] || '').toLowerCase();
  return { woff2: 'woff2', woff: 'woff', ttf: 'truetype', otf: 'opentype', ttc: 'truetype' }[ext] || '';
}

/** Make a URL safe to drop inside CSS `url("...")` — strip chars that could close the string/rule. */
export function sanitizeCssUrl(url: string): string {
  return (url || '').replace(/["')(;{}<>\\]/g, '').replace(/\s+/g, '').slice(0, 2000);
}

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
  const fit = bg.image.fit;
  const repeat = fit === 'repeat' ? 'repeat' : 'no-repeat';
  // cover|contain are valid background-size keywords; stretch = 100% 100% (non-uniform
  // fill, distorts); repeat = natural size (auto) tiled.
  const size = fit === 'repeat' ? 'auto' : fit === 'stretch' ? '100% 100%' : fit;
  return { image: `url("${url}")`, size, repeat, position: bg.image.position || 'center' };
}
