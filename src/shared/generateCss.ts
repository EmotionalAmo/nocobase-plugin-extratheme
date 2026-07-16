import type { ExtraThemeConfig, AppConfig, Selectors, BackgroundConfig } from './types';
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

/** The two liquid-glass SVG <filter> ids (one per nav). generateSvgFilters emits the matching
 * in-document <filter> defs; the nav CSS references them via backdrop-filter:url(#id). The two
 * sides MUST stay in sync — Chrome only resolves url(#id) when the filter is actually present. */
export const LIQUID_FILTER_IDS = { header: 'extra-theme-lg-header', sider: 'extra-theme-lg-sider' } as const;

/** Coerce (safeNum) then CLAMP into [min,max]. refract/aberration/blur are UI-bounded (0–100,
 * 0–40); clamping stops a direct API write of an absurd/overflowing value (e.g. 1e309 → Infinity)
 * from reaching the publicly-served CSS/SVG. Inert either way (numeric text can't break out), but
 * keeps the output sane — matching the clamp the old 'texture' path had. */
function clampNum(v: any, min: number, max: number, def: number): number {
  return Math.max(min, Math.min(max, safeNum(v, def)));
}

/** Displacement map for the liquid lens: a linear gradient with a neutral (128) centre band
 * ramping to the rim, so feDisplacementMap bends the backdrop only at the glass edges. Header =
 * vertical bend (encoded in the B channel), sider = horizontal bend (R channel). Self-contained
 * data-URI (CSP-safe — no external asset). */
function liquidDispMap(orient: 'header' | 'sider'): string {
  const grad =
    orient === 'sider'
      ? "<linearGradient id='g' x1='0' y1='0' x2='1' y2='0'><stop offset='0' stop-color='rgb(0,128,128)'/><stop offset='.42' stop-color='rgb(128,128,128)'/><stop offset='.58' stop-color='rgb(128,128,128)'/><stop offset='1' stop-color='rgb(255,128,128)'/></linearGradient>"
      : "<linearGradient id='g' x1='0' y1='0' x2='0' y2='1'><stop offset='0' stop-color='rgb(128,128,0)'/><stop offset='.42' stop-color='rgb(128,128,128)'/><stop offset='.58' stop-color='rgb(128,128,128)'/><stop offset='1' stop-color='rgb(128,128,255)'/></linearGradient>";
  const svg =
    "<svg xmlns='http://www.w3.org/2000/svg' width='120' height='120'><defs>" + grad + "</defs><rect width='120' height='120' fill='url(#g)'/></svg>";
  return 'data:image/svg+xml,' + encodeURIComponent(svg);
}

/** One liquid-glass SVG filter: an feImage displacement map + three channel-split
 * feDisplacementMap passes (R/G/B at slightly different scales) recombined with screen blends
 * → refraction + chromatic aberration (the visible "liquid glass" edge fringe). `refract`
 * (0–100) drives the displacement scale, `aberration` (0–100) the per-channel scale spread.
 * All numeric inputs are coerced (safeNum) and the map is a fixed template — safe to interpolate. */
function liquidFilter(id: string, orient: 'header' | 'sider', refract: number, aberration: number): string {
  const base = clampNum(refract, 0, 100, 60) * 1.2;
  const aber = clampNum(aberration, 0, 100, 40) * 0.1;
  const s1 = base.toFixed(1);
  const s2 = (base - aber).toFixed(1);
  const s3 = (base - aber * 2).toFixed(1);
  const map = liquidDispMap(orient);
  return (
    `<filter id="${id}" x="-30%" y="-30%" width="160%" height="160%" color-interpolation-filters="sRGB">` +
    `<feImage href="${map}" x="0" y="0" width="100%" height="100%" preserveAspectRatio="none" result="MAP"/>` +
    `<feDisplacementMap in="SourceGraphic" in2="MAP" scale="${s1}" xChannelSelector="R" yChannelSelector="B" result="RED"/>` +
    `<feColorMatrix in="RED" type="matrix" values="1 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 1 0" result="RC"/>` +
    `<feDisplacementMap in="SourceGraphic" in2="MAP" scale="${s2}" xChannelSelector="R" yChannelSelector="B" result="GRN"/>` +
    `<feColorMatrix in="GRN" type="matrix" values="0 0 0 0 0 0 1 0 0 0 0 0 0 0 0 0 0 0 1 0" result="GC"/>` +
    `<feDisplacementMap in="SourceGraphic" in2="MAP" scale="${s3}" xChannelSelector="R" yChannelSelector="B" result="BLU"/>` +
    `<feColorMatrix in="BLU" type="matrix" values="0 0 0 0 0 0 0 0 0 0 0 0 1 0 0 0 0 0 1 0" result="BC"/>` +
    `<feBlend in="GC" in2="BC" mode="screen" result="GB"/>` +
    `<feBlend in="RC" in2="GB" mode="screen"/>` +
    `</filter>`
  );
}

/** In-document SVG <filter> defs for the liquid-glass navs. Emitted per-nav, gated
 * INDEPENDENTLY (header iff header enabled+liquid, sider iff sider enabled+liquid) so it always
 * matches the CSS that references url(#id). '' when neither nav is liquid — the injector then
 * clears the <svg> so stale filters don't linger. The refraction is Chrome-only (other browsers
 * ignore url() in backdrop-filter and keep the plain blur fallback; see liquidBackdrop). */
export function generateSvgFilters(app: AppConfig): string {
  const out: string[] = [];
  if (app.header?.enabled && app.header.style === 'liquid') {
    out.push(liquidFilter(LIQUID_FILTER_IDS.header, 'header', app.header.refract, app.header.aberration));
  }
  if (app.sider?.enabled && app.sider.style === 'liquid') {
    out.push(liquidFilter(LIQUID_FILTER_IDS.sider, 'sider', app.sider.refract, app.sider.aberration));
  }
  return out.join('');
}

/** The backdrop-filter declarations for a liquid-glass nav element. Progressive enhancement:
 * a plain blur+saturate is emitted FIRST (universal fallback), then the url(#id) refraction
 * variant — being a later, equal-importance declaration it WINS in Chrome (where it parses),
 * while Firefox/Safari drop the invalid url() form and keep the frosted fallback either way.
 * Plus a specular glass edge via inset highlights. blur is coerced → safe to interpolate. */
function liquidBackdrop(nav: { blur: number }, filterId: string): string {
  const b = clampNum(nav.blur, 0, 40, 3);
  const plain = `blur(${b}px) saturate(160%)`;
  const lens = `url(#${filterId}) ${plain}`;
  return (
    `-webkit-backdrop-filter:${plain}!important;backdrop-filter:${plain}!important;` +
    `-webkit-backdrop-filter:${lens}!important;backdrop-filter:${lens}!important;` +
    `box-shadow:inset 0 1px 0 rgba(255,255,255,0.6),inset 0 -1px 0 rgba(255,255,255,0.15),0 3px 14px rgba(0,0,0,0.10);`
  );
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
    // Make content wrappers + class-less/inline-white block wrappers transparent so the
    // page background shows through the layout gaps around the (now opaque) content cards.
    // Card transparency itself is delegated to the native theme editor (colorBgContainer),
    // so the plugin no longer tints or blurs the card surface here.
    out.push(`${scopedList(scope, s.content)}{background:transparent!important;}`);
    out.push(`${scopedList(scope, s.card + ' div:not([class]):not([id])')}{background-color:transparent!important;}`);
    // The sign-in page shares <body>, so the page background carries onto it too. Neutralize
    // the one opaque wrapper that the rules above miss there: the footer brand bar (a white
    // div wrapping NocoBase's stable `.nb-brand`). Its own class is an emotion hash, so target
    // it via :has() on the stable brand element (Chrome-supported; dropped gracefully elsewhere).
    out.push(`${scope} div:has(> .nb-brand),${scope} .nb-brand{background-color:transparent!important;}`);
  }

  // Top nav — the plugin owns a tint (color × opacity) over the theme's header and, for the
  // 'liquid' style, layers liquid-glass refraction (the SVG filter) + frost + a specular edge
  // on top. Menu TEXT colour stays theme-editor-managed. Independent of the workspace switch.
  // Targets the real pro-layout header (and the outer wrapper for robustness).
  if (app.header.enabled) {
    const headerBg = withAlpha(app.header.color, app.header.opacity / 100);
    const glass = app.header.style === 'liquid' ? liquidBackdrop(app.header, LIQUID_FILTER_IDS.header) : '';
    out.push(
      `${scope} .ant-layout-header,${scope} .ant-pro-layout-header{background:${headerBg}!important;${glass}}`,
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

  // Side nav — same deal: a tint (color × opacity) over the theme's nav color, plus the
  // 'liquid' glass (refraction + frost + specular edge) when selected. Tint the FULL-WIDTH
  // sider container uniformly; clear the dark placeholder + the inset menu's own bg + the
  // menu/container right border (the "invisible border"); tame the internal scrollbar. Menu
  // TEXT color is left to the theme (not overridden).
  if (app.sider.enabled) {
    const siderBg = withAlpha(app.sider.color, app.sider.opacity / 100);
    const glass = app.sider.style === 'liquid' ? liquidBackdrop(app.sider, LIQUID_FILTER_IDS.sider) : '';
    out.push(
      `${scope} .ant-layout-sider{background:transparent!important;}` +
        `${scope} .ant-layout-sider-children{background:${siderBg}!important;border-right:none!important;${glass}}` +
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

  // Keep listed subtrees NATIVE (default: the right-side AI chat panel). The theme's
  // transparency/blur/custom-scrollbar otherwise bleed into them (the AI panel goes
  // see-through). Give them an opaque backing, drop blur, and restore a native scrollbar.
  // Scoped to the theme marker so it only acts while the theme is on. Selector sanitized.
  if (app.keepNative?.enabled && isAppActive(app)) {
    const sel = sanitizeCssSelector(app.keepNative.selector || '');
    if (sel) {
      const parts = sel.split(',').map((s) => s.trim()).filter(Boolean);
      const each = (suffix: string) => parts.map((s) => `${scope} ${s}${suffix}`).join(',');
      out.push(
        `${each('')}{background-color:#fff!important;}` +
          `${each('')},${each(' *')}{backdrop-filter:none!important;-webkit-backdrop-filter:none!important;}` +
          `${each(' ::-webkit-scrollbar')}{width:12px!important;height:12px!important;}` +
          `${each(' ::-webkit-scrollbar-thumb')}{background:rgba(0,0,0,0.25)!important;border:none!important;border-radius:6px!important;background-clip:border-box!important;}`,
      );
    }
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
