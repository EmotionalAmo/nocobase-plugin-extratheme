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

/** Strict allow-list for a self-contained base64 `data:` URI (image or font). The base64
 * alphabet (A–Z a–z 0–9 + / =) contains NONE of the CSS-breakout chars, so a value that
 * matches this end-to-end is safe to drop inside `url(...)` verbatim. MIME token is kept
 * loose on purpose — a font File often reports `application/octet-stream` (or empty). */
const DATA_URI_RE = /^data:[\w.+-]+\/[\w.+-]+;base64,[A-Za-z0-9+/=]+$/;

/** Make a URL safe to drop inside CSS `url("...")` — strip chars that could close the
 * string/rule. A validated base64 `data:` URI is passed through INTACT (it must not hit
 * the stripper, which would eat the `;` in `;base64,` and truncate the payload at 2000). */
export function sanitizeCssUrl(url: string): string {
  const u = url || '';
  if (DATA_URI_RE.test(u)) return u;
  return u.replace(/["')(;{}<>\\]/g, '').replace(/\s+/g, '').slice(0, 2000);
}

/** Map a filename extension to a MIME type — used to build a `data:` URI when `File.type`
 * is missing/unreliable (common for font files). '' when unknown. */
export function mimeFromFilename(name: string): string {
  const ext = ((name || '').split('?')[0].split('#')[0].match(/\.([a-z0-9]+)$/i)?.[1] || '').toLowerCase();
  return (
    {
      png: 'image/png', jpg: 'image/jpeg', jpeg: 'image/jpeg', gif: 'image/gif',
      webp: 'image/webp', avif: 'image/avif', bmp: 'image/bmp', svg: 'image/svg+xml',
      woff2: 'font/woff2', woff: 'font/woff', ttf: 'font/ttf', otf: 'font/otf', ttc: 'font/collection',
    } as Record<string, string>
  )[ext] || '';
}

/** Heuristic: does this URL look like a temporary/expiring SIGNED link (S3/MinIO/OSS/COS/
 * Azure SAS)? Such a URL must NOT be snapshotted into config — it 403s after its TTL (≈1h),
 * silently breaking the background for everyone. Used to warn in the settings UI; base64
 * `data:` URIs and relative paths are never ephemeral. */
export function isEphemeralUrl(url: string): boolean {
  const u = url || '';
  if (!/^https?:/i.test(u)) return false;
  return (
    /[?&](X-Amz-(Signature|Expires|Credential)|OSSAccessKeyId|q-signature|q-sign-time)=/i.test(u) ||
    (/[?&](Signature|sig)=/i.test(u) && /[?&](Expires|se)=/i.test(u))
  );
}

/** Sanitize a CSS SELECTOR before it's interpolated as `<selector>{…}` in the globally
 * injected stylesheet (served to every visitor incl. the anonymous sign-in page). A real
 * selector never contains rule-breakout chars, so if the value carries any of `{ } ; < \`
 * or a `/*`…`*​/` comment marker, REJECT the whole thing (→ '') rather than trying to
 * repair it. Everything a selector needs (`. # [ ] = " ' : ( ) > ~ + * , - _` + space)
 * passes through. Length-capped. Supports a comma-separated selector LIST. */
export function sanitizeCssSelector(sel: string): string {
  const s = (sel || '').replace(/[\r\n\t]+/g, ' ').trim();
  if (!s) return '';
  if (/[{};<\\]/.test(s) || s.includes('/*') || s.includes('*/')) return '';
  return s.slice(0, 500);
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

/** Parse a color (hex/rgb/rgba) to [r,g,b] ints, or null if unparseable (keyword/var). */
function parseRgb(color: string): [number, number, number] | null {
  const c = (color || '').trim();
  const m = c.match(/^rgba?\(\s*([\d.]+)[\s,]+([\d.]+)[\s,]+([\d.]+)/i);
  if (m) return [Math.round(+m[1]), Math.round(+m[2]), Math.round(+m[3])];
  let h = c.replace('#', '');
  if (h.length === 3) h = h.split('').map((x) => x + x).join('');
  if (/^[0-9a-f]{6}$/i.test(h)) return [parseInt(h.slice(0, 2), 16), parseInt(h.slice(2, 4), 16), parseInt(h.slice(4, 6), 16)];
  return null;
}

/**
 * Strict allow-list for a CSS color that gets interpolated into a declaration. Accepts
 * only #hex (3/4/6/8), rgb()/rgba()/hsl()/hsla() built from digits/%/./,//space, or a
 * bare word (named color — no breakout chars possible). ANYTHING else → 'transparent'.
 * This is the security boundary: config values are admin-writable but the compiled CSS
 * is served to every visitor incl. the anonymous sign-in page, so a value like
 * `red}body::before{...}` MUST NOT reach the stylesheet.
 */
export function safeCssColor(color: string): string {
  const c = (color || '').trim();
  if (/^#([0-9a-f]{3,4}|[0-9a-f]{6}|[0-9a-f]{8})$/i.test(c)) return c;
  if (/^(rgb|rgba|hsl|hsla)\(\s*[\d.,%\s/]+\)$/i.test(c)) return c;
  if (/^[a-z]+$/i.test(c)) return c; // bare word = named color (letters only, inert)
  return 'transparent';
}

/** Coerce to a finite number (default 0) — for numeric CSS values interpolated raw. */
export function safeNum(v: any, def = 0): number {
  const n = Number(v);
  return Number.isFinite(n) ? n : def;
}

/** Drop any alpha and return a solid 'rgb(r,g,b)'. Unparseable → safe black (never raw). */
export function toSolidRgb(color: string): string {
  const rgb = parseRgb(color);
  return rgb ? `rgb(${rgb[0]},${rgb[1]},${rgb[2]})` : 'rgb(0,0,0)';
}

/** Apply an alpha to a hex/rgb/rgba color; RGB preserved. Unparseable → 'transparent'
 * (never echo the raw value into the declaration — that was a CSS-injection sink). */
export function withAlpha(color: string, alpha: number): string {
  const rgb = parseRgb(color);
  return rgb ? `rgba(${rgb[0]},${rgb[1]},${rgb[2]},${safeNum(alpha)})` : 'transparent';
}

/** Resolve a BackgroundConfig into CSS background-* values. Every interpolated value is
 * sanitized (color → safeCssColor, angle → safeNum, url → sanitizeCssUrl) so nothing
 * can break out of the injected declaration. */
export function buildBackground(bg: BackgroundConfig): {
  image: string;
  size: string;
  repeat: string;
  position: string;
} {
  const none = { image: 'transparent', size: 'auto', repeat: 'no-repeat', position: 'center' };
  if (!bg || bg.type === 'none') return none;
  if (bg.type === 'color') return { image: safeCssColor(bg.color), size: 'auto', repeat: 'no-repeat', position: 'center' };
  if (bg.type === 'gradient') {
    const stops = (bg.gradient.colors || []).map(safeCssColor).join(',');
    return {
      image: `linear-gradient(${safeNum(bg.gradient.angle)}deg,${stops})`,
      size: 'cover',
      repeat: 'no-repeat',
      position: 'center',
    };
  }
  // image
  const url = sanitizeCssUrl(bg.image?.url || '');
  if (!url) return none;
  const fit = bg.image.fit;
  const repeat = fit === 'repeat' ? 'repeat' : 'no-repeat';
  // cover|contain are valid background-size keywords; stretch = 100% 100% (non-uniform
  // fill, distorts); repeat = natural size (auto) tiled.
  const size = fit === 'repeat' ? 'auto' : fit === 'stretch' ? '100% 100%' : fit === 'contain' ? 'contain' : 'cover';
  return { image: `url("${url}")`, size, repeat, position: 'center' };
}
