import type { ExtraThemeConfig, AppConfig, Selectors, BackgroundConfig } from './types';
import { hexToRgba, buildBackground } from './color';

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
    // Make content wrappers + class-less/inline-white block wrappers transparent so
    // the (token-translucent) surfaces and the page background show through.
    out.push(`${scopedList(scope, s.content)}{background:transparent!important;}`);
    out.push(`${scopedList(scope, s.card + ' div:not([class]):not([id])')}{background-color:transparent!important;}`);
    // Frosted blur on content cards (+ code-block roots).
    if (app.card.glass && app.card.blur > 0) {
      out.push(`${scopedList(scope, s.card)},${scope} .code-block{${blur(app.card.blur)}}`);
    }
  }

  // Nav blur — independent of the workspace switch (colors come from tokens).
  if (app.header.enabled && app.header.style === 'frosted' && app.header.blur > 0) {
    out.push(`${scopedList(scope, s.header)}{${blur(app.header.blur)}}`);
  }
  if (app.sider.enabled && app.sider.style === 'frosted' && app.sider.blur > 0) {
    out.push(`${scopedList(scope, s.sider)}{${blur(app.sider.blur)}}`);
  }

  return out.join('\n');
}

/** True when any app-scope section (background/card, header, or sider) is on. */
export function isAppActive(app: AppConfig): boolean {
  return !!(app.enabled || app.header.enabled || app.sider.enabled);
}

/** Thin stylesheet: page background + frosted blur (surface colors are antd tokens). */
export function generateStylesheet(config: ExtraThemeConfig, sel: Selectors): string {
  return appCss(config.app, sel.app).trim();
}
