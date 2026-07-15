import type { ExtraThemeConfig, AppConfig, Selectors, BackgroundConfig, NavStyle } from './types';
import { hexToRgba, buildBackground, sanitizeFontFamily, fontFormatFromUrl, sanitizeCssUrl, withAlpha, safeNum, sanitizeCssSelector } from './color';

/** @font-face src format() allow-list — reject anything else so a crafted value can't break out. */
const FONT_FORMATS = ['woff2', 'woff', 'truetype', 'opentype'];

/**
 * With the token-based redesign, surface COLORS come from the antd theme
 * (buildTheme.ts -> colorBgContainer/colorBgHeader/colorBgSider/colorBgLayout),
 * which penetrates isolated code-block roots where CSS could not. This stylesheet
 * now only carries the two things that are NOT antd tokens:
 *   1. the page BACKGROUND (image/gradient/color) on <body> — antd has no bg-image
 *      token; body sits above the transformed layout wrapper so it paints, and the
 *      token-translucent surfaces let it show through.
 *   2. the FROSTED-GLASS backdrop-filter blur on the frosted surfaces (token gives
 *      the alpha, CSS gives the blur).
 * Plus a belt-and-suspenders transparency pass for content wrappers and class-less
 * (often inline-white) block wrappers that no token reaches.
 */

function bgDecl(bg: BackgroundConfig): string {
  const b = buildBackground(bg);
  let image = b.image;
  const dim = safeNum(bg.dim);
  if (dim > 0 && bg.type !== 'none') {
    const d = hexToRgba('#000000', dim / 100);
    image = `linear-gradient(${d},${d}),${b.image}`;
  }
  // NOTE: the `background` shorthand (with !important) implicitly resets
  // background-size/repeat/position/attachment to their initial values AND carries
  // the !important, so a following plain `background-size:cover` loses to it (image
  // ends up auto-sized + tiled). The longhands MUST also be !important — then, equal
  // importance, the later source-order declaration wins and they take effect.
  return (
    `background:${image}!important;` +
    `background-size:${b.size}!important;` +
    `background-repeat:${b.repeat}!important;` +
    `background-position:${b.position}!important;` +
    `background-attachment:fixed!important;`
  );
}

function scopedList(scope: string, list: string): string {
  return list
    .split(',')
    .map((s) => `${scope} ${s.trim()}`)
    .join(',');
}

function blur(px: number): string {
  const n = safeNum(px); // coerce — px is interpolated raw into blur(<n>px)
  return `backdrop-filter:blur(${n}px);-webkit-backdrop-filter:blur(${n}px);`;
}

/** Extra CSS for the 水纹玻璃 ('material') style: a SEAMLESS grayscale water-caustics texture
 * as a `background-image`. It's an SVG `feTurbulence type=turbulence` + `stitchTiles=stitch`
 * (so it tiles with no visible seams), rendered 1:1 over a big tile (so it's not stretched
 * soft nor seam-repeated) — a real "water ripple" look, unlike a plain blur. Backdrop
 * displacement was tried and rejected: it refracts the BACKDROP, so over a smooth sky it's
 * invisible. The grain contrast/depth is driven by `texture` (0–100 → feFuncA slope). The
 * image is emitted AFTER the `background` shorthand so it isn't reset (repeat/size stay at the
 * shorthand's initials: repeat/auto). `texture` is coerced+clamped → safe to interpolate.
 * CSP-safe (self-contained data-URI, no external asset). '' for other styles. */
function materialExtras(style: NavStyle, texture: number): string {
  if (style !== 'material') return '';
  const a = Math.max(0, Math.min(1, safeNum(texture, 65) / 100)).toFixed(2);
  // The grain is recolored to a light BLUE-WHITE highlight (no black) so it reads as bright
  // water light, not dirty dark veins: feColorMatrix forces RGB = (0.82,0.92,1.0) and sets
  // alpha = the turbulence luminance (0.34·R+0.34·G+0.34·B); feFuncA then scales that alpha
  // by 水纹强度. So it only ever LIGHTENS the glass in wavy patches.
  const water =
    "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='1400' height='700'%3E%3Cfilter id='w'%3E%3CfeTurbulence type='turbulence' baseFrequency='0.009 0.016' numOctaves='2' seed='5' stitchTiles='stitch'/%3E%3CfeColorMatrix type='matrix' values='0 0 0 0 0.82 0 0 0 0 0.92 0 0 0 0 1 0.34 0.34 0.34 0 0'/%3E%3CfeComponentTransfer%3E%3CfeFuncA type='linear' slope='" +
    a +
    "'/%3E%3C/feComponentTransfer%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23w)'/%3E%3C/svg%3E\")";
  return `background-image:${water}!important;box-shadow:inset 0 1px 0 rgba(255,255,255,0.55),0 2px 14px rgba(15,23,42,0.06);`;
}

function appCss(app: AppConfig, s: Selectors['app']): string {
  const scope = 'body.extra-theme-app-on';
  const out: string[] = [];

  if (app.enabled) {
    // Page background on <body> (paints above the transformed layout wrapper).
    out.push(`${scope}{${bgDecl(app.background)}}`);
    // The FIXED sider (height: calc(100vh - headerH)) must sit flush under the
    // header. Its `top` can't be hardcoded: the containing block differs by layout
    // — the main workspace nests it below the header (top:46→46px gap at the top),
    // the settings layout anchors it at the viewport top (top:0→46px empty at the
    // BOTTOM). Both containing blocks END at the viewport bottom, so anchor by the
    // bottom instead: top:auto + bottom:0 lands the top at the header's bottom in
    // BOTH layouts (top must be auto so bottom+height win over the native top).
    out.push(`${scope} .ant-layout-sider-children{top:auto!important;bottom:0!important;}`);
    // Make content wrappers + class-less/inline-white block wrappers transparent so
    // the (token-translucent) surfaces and the page background show through.
    out.push(`${scopedList(scope, s.content)}{background:transparent!important;}`);
    out.push(`${scopedList(scope, s.card + ' div:not([class]):not([id])')}{background-color:transparent!important;}`);
    // Frosted blur on content cards (+ code-block roots).
    if (app.card.glass && app.card.blur > 0) {
      out.push(`${scopedList(scope, s.card)},${scope} .code-block{${blur(app.card.blur)}}`);
    }
  }

  // Top nav — the plugin only layers OPACITY + BLUR onto the theme's own header color
  // (header.color is captured from the theme's colorBgHeader at save time). The color
  // itself stays theme-editor-managed. Independent of the workspace switch. Targets the
  // real pro-layout header (and the outer wrapper for robustness).
  if (app.header.enabled) {
    const headerBg = withAlpha(app.header.color, app.header.opacity / 100);
    const frosted = app.header.style === 'frosted' || app.header.style === 'material';
    const glass = frosted && app.header.blur > 0 ? blur(app.header.blur) : '';
    out.push(
      `${scope} .ant-layout-header,${scope} .ant-pro-layout-header{background:${headerBg}!important;${glass}${materialExtras(app.header.style, app.header.texture)}}`,
    );
  }

  // Global font. The antd token (buildTheme) covers antd text; setting font-family on
  // <body> too catches non-antd/raw text (it INHERITS through the transformed
  // code-block boundary, unlike background). For an UPLOADED font, inject a
  // document-global @font-face so it loads for every viewer (no local install), then
  // apply that family. Everything is sanitized (custom/name/url are hand-typed/derived).
  const font = app.font;
  if (font?.enabled) {
    if (font.source === 'upload' && font.upload?.url) {
      const name = sanitizeFontFamily(font.upload.name || '').replace(/["']/g, '') || 'ExtraTheme Font';
      const url = sanitizeCssUrl(font.upload.url);
      // allow-list the format: use the config value only if valid, else derive from the
      // url (fontFormatFromUrl already maps to known formats) — never echo a raw value.
      const fmt = FONT_FORMATS.includes(font.upload.format) ? font.upload.format : fontFormatFromUrl(font.upload.url);
      if (url) {
        out.push(`@font-face{font-family:"${name}";src:url("${url}")${fmt ? ` format("${fmt}")` : ''};font-display:swap;}`);
        out.push(`${scope}{font-family:"${name}"!important;}`);
      }
    } else if (font.source !== 'upload') {
      const fam = sanitizeFontFamily(font.family || '');
      if (fam) out.push(`${scope}{font-family:${fam}!important;}`);
    }
  }

  // Side nav — same deal: only OPACITY + BLUR over the theme's own nav color
  // (sider.color captured from the theme at save). Tint the FULL-WIDTH sider container
  // uniformly; clear the dark placeholder + the inset menu's own bg + the menu/container
  // right border (the "invisible border"); tame the internal scrollbar. Menu TEXT color
  // is left to the theme (not overridden).
  if (app.sider.enabled) {
    const siderBg = withAlpha(app.sider.color, app.sider.opacity / 100);
    const glass = (app.sider.style === 'frosted' || app.sider.style === 'material') && app.sider.blur > 0 ? blur(app.sider.blur) : '';
    out.push(
      `${scope} .ant-layout-sider{background:transparent!important;}` +
        `${scope} .ant-layout-sider-children{background:${siderBg}!important;border-right:none!important;${glass}${materialExtras(app.sider.style, app.sider.texture)}}` +
        `${scope} .ant-layout-sider .ant-menu{background:transparent!important;border-inline-end:none!important;}` +
        `${scope} .ant-layout-sider .ant-menu::-webkit-scrollbar{width:6px;height:6px;}` +
        `${scope} .ant-layout-sider .ant-menu::-webkit-scrollbar-thumb{background:rgba(0,0,0,0.18);border-radius:4px;}` +
        `${scope} .ant-layout-sider .ant-menu::-webkit-scrollbar-track{background:transparent;}`,
    );
  }

  // Scrollbar display. When enabled: 'always' = a slim ALWAYS-visible bar (styling
  // ::-webkit-scrollbar forces the classic, non-overlay bar); 'hidden' = fully hidden
  // scrollbar (content still scrolls via wheel/trackpad). Off = native (emit nothing).
  if (app.scrollbar?.enabled) {
    if (app.scrollbar.mode === 'hidden') {
      out.push(
        `${scope} ::-webkit-scrollbar,${scope}::-webkit-scrollbar{display:none;width:0;height:0;}` +
          `${scope},${scope} *{scrollbar-width:none;-ms-overflow-style:none;}`,
      );
    } else {
      out.push(
        `${scope} ::-webkit-scrollbar,${scope}::-webkit-scrollbar{width:10px;height:10px;}` +
          `${scope} ::-webkit-scrollbar-thumb,${scope}::-webkit-scrollbar-thumb{background:rgba(0,0,0,0.22);border-radius:8px;border:2px solid transparent;background-clip:content-box;}` +
          `${scope} ::-webkit-scrollbar-thumb:hover,${scope}::-webkit-scrollbar-thumb:hover{background:rgba(0,0,0,0.4);background-clip:content-box;}` +
          `${scope} ::-webkit-scrollbar-track,${scope}::-webkit-scrollbar-track{background:transparent;}`,
      );
    }
  }

  // Hide arbitrary elements by selector (e.g. the global AI entry). GLOBAL (unscoped) so it
  // applies regardless of the workspace switch; the selector is sanitized so it can't break
  // out of the `<sel>{…}` rule.
  if (app.hide?.enabled) {
    const sel = sanitizeCssSelector(app.hide.selector || '');
    if (sel) out.push(`${sel}{display:none!important;}`);
  }

  return out.join('\n');
}

/** True when any app-scope section (bg/card, header, sider, font, scrollbar, or hide) is on. */
export function isAppActive(app: AppConfig): boolean {
  return !!(
    app.enabled ||
    app.header.enabled ||
    app.sider.enabled ||
    app.font?.enabled ||
    app.scrollbar?.enabled ||
    app.hide?.enabled
  );
}

/** Thin stylesheet: page background + frosted blur (surface colors are antd tokens). */
export function generateStylesheet(config: ExtraThemeConfig, sel: Selectors): string {
  return appCss(config.app, sel.app).trim();
}
