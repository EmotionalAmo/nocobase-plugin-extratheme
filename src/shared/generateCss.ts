import type { ExtraThemeConfig, AppConfig, Selectors, BackgroundConfig } from './types';
import { hexToRgba, buildBackground, sanitizeFontFamily } from './color';

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
  if (bg.dim > 0 && bg.type !== 'none') {
    const d = hexToRgba('#000000', bg.dim / 100);
    image = `linear-gradient(${d},${d}),${b.image}`;
  }
  return (
    `background:${image}!important;` +
    `background-size:${b.size};` +
    `background-repeat:${b.repeat};` +
    `background-position:${b.position};` +
    `background-attachment:fixed;`
  );
}

function scopedList(scope: string, list: string): string {
  return list
    .split(',')
    .map((s) => `${scope} ${s.trim()}`)
    .join(',');
}

function blur(px: number): string {
  return `backdrop-filter:blur(${px}px);-webkit-backdrop-filter:blur(${px}px);`;
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

  // Top nav blur — independent of the workspace switch (colors come from tokens).
  if (app.header.enabled && app.header.style === 'frosted' && app.header.blur > 0) {
    out.push(`${scopedList(scope, s.header)}{${blur(app.header.blur)}}`);
  }

  // Global font — the antd token (fontFamily) covers all antd text, but setting it
  // on <body> too catches non-antd/raw text: font-family INHERITS through the
  // transformed code-block boundary (unlike background), so this reaches everywhere.
  // Sanitize (custom families are hand-typed → could break out of the declaration).
  const fontFamily = sanitizeFontFamily(app.font?.family || '');
  if (app.font?.enabled && fontFamily) {
    out.push(`${scope}{font-family:${fontFamily}!important;}`);
  }

  // Side nav (CSS, not a token — it's outer chrome, CSS reaches it, and a token
  // only tints the inset menu → a seam). Tint the FULL-WIDTH sider container with
  // the exact configured value; clear the dark placeholder + the inset menu's own
  // bg + the menu/container right border (the "invisible border") so the whole
  // sider is one uniform panel; blur; tame the internal scrollbar.
  if (app.sider.enabled) {
    const siderBg = hexToRgba(app.sider.color, app.sider.opacity / 100);
    const glass = app.sider.style === 'frosted' && app.sider.blur > 0 ? blur(app.sider.blur) : '';
    const fg = app.sider.text === 'light' ? '#f8fafc' : '#1f2733';
    out.push(
      `${scope} .ant-layout-sider{background:transparent!important;}` +
        `${scope} .ant-layout-sider-children{background:${siderBg}!important;border-right:none!important;${glass}}` +
        `${scope} .ant-layout-sider .ant-menu{background:transparent!important;border-inline-end:none!important;color:${fg};}` +
        `${scope} .ant-layout-sider .ant-menu::-webkit-scrollbar{width:6px;height:6px;}` +
        `${scope} .ant-layout-sider .ant-menu::-webkit-scrollbar-thumb{background:rgba(0,0,0,0.18);border-radius:4px;}` +
        `${scope} .ant-layout-sider .ant-menu::-webkit-scrollbar-track{background:transparent;}`,
    );
  }

  return out.join('\n');
}

/** True when any app-scope section (background/card, header, sider, or font) is on. */
export function isAppActive(app: AppConfig): boolean {
  return !!(app.enabled || app.header.enabled || app.sider.enabled || app.font?.enabled);
}

/** Thin stylesheet: page background + frosted blur (surface colors are antd tokens). */
export function generateStylesheet(config: ExtraThemeConfig, sel: Selectors): string {
  return appCss(config.app, sel.app).trim();
}
