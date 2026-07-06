import type { ExtraThemeConfig, AppConfig, LoginConfig, Selectors, NavConfig, BackgroundConfig } from './types';
import { hexToRgba, buildBackground } from './color';

/** background declaration; dim>0 composites a flat black layer over the image (no overlay element -> no z-index traps). */
function bgDecl(bg: BackgroundConfig): string {
  const b = buildBackground(bg);
  let image = b.image;
  if (bg.dim > 0 && bg.type !== 'none') {
    const d = hexToRgba('#000000', bg.dim / 100);
    image = `linear-gradient(${d},${d}),${b.image}`;
  }
  return (
    `background:${image};` +
    `background-size:${b.size};` +
    `background-repeat:${b.repeat};` +
    `background-position:${b.position};` +
    `background-attachment:fixed;`
  );
}

/** Prefix every comma-separated selector in `list` with `scope` so grouped selectors stay scoped. */
function scopedList(scope: string, list: string): string {
  return list
    .split(',')
    .map((s) => `${scope} ${s.trim()}`)
    .join(',');
}

function navRule(scope: string, sel: string, nav: NavConfig): string {
  const bg = hexToRgba(nav.color, nav.opacity / 100);
  const fg = nav.text === 'light' ? '#f8fafc' : '#1f2733';
  const blur =
    nav.style === 'frosted' && nav.blur > 0
      ? `backdrop-filter:blur(${nav.blur}px);-webkit-backdrop-filter:blur(${nav.blur}px);`
      : '';
  const base = `${scopedList(scope, sel)}{background:${bg}!important;${blur}color:${fg};}`;
  // The menu (and its sub-menus) inside a nav paints its OWN opaque background,
  // which would hide the nav's translucency — clear it so the frosting shows.
  const inner = `${scopedList(scope, sel + ' .ant-menu')},${scopedList(scope, sel + ' .ant-menu-sub')}{background:transparent!important;color:${fg};}`;
  return `${base}\n${inner}`;
}

function appCss(app: AppConfig, s: Selectors['app']): string {
  const scope = 'body.extra-theme-app-on';
  const out: string[] = [];
  // 工作区外观 = background + content cards (independent of header/sider).
  if (app.enabled) {
    out.push(`${scopedList(scope, s.appRoot)}{${bgDecl(app.background)}}`);
    out.push(`${scopedList(scope, s.content)}{background:transparent!important;}`);
    const cardBg = hexToRgba('#ffffff', app.card.opacity / 100);
    const cardBlur =
      app.card.glass && app.card.blur > 0
        ? `backdrop-filter:blur(${app.card.blur}px);-webkit-backdrop-filter:blur(${app.card.blur}px);`
        : '';
    const cardBorder = app.card.border ? 'border:1px solid rgba(255,255,255,0.5);' : '';
    out.push(`${scopedList(scope, s.card)}{background:${cardBg}!important;${cardBlur}${cardBorder}}`);
    // Custom code-blocks render nested wrapper divs that carry their OWN opaque
    // white background (no stable class) — clear class-less/id-less divs inside
    // a card so the card's translucency + the page background show through.
    // Interactive controls all carry classes, so they are untouched.
    out.push(`${scopedList(scope, s.card + ' div:not([class]):not([id])')}{background-color:transparent!important;}`);
  }
  // Top / side nav — each independently toggleable, no dependency on the above.
  if (app.header.enabled) out.push(navRule(scope, s.header, app.header));
  if (app.sider.enabled) out.push(navRule(scope, s.sider, app.sider));
  return out.join('\n');
}

/** True when any app-scope section (background/card, header, or sider) is on. */
export function isAppActive(app: AppConfig): boolean {
  return !!(app.enabled || app.header.enabled || app.sider.enabled);
}

function loginCss(login: LoginConfig, s: Selectors['login']): string {
  if (!login.enabled) return '';
  const scope = 'body.extra-theme-login-on';
  const out: string[] = [];
  out.push(`${scopedList(scope, s.loginRoot)}{${bgDecl(login.background)}}`);
  const c = login.card;
  const bg = hexToRgba('#ffffff', c.opacity / 100);
  const blur =
    c.glass && c.blur > 0 ? `backdrop-filter:blur(${c.blur}px);-webkit-backdrop-filter:blur(${c.blur}px);` : '';
  const shadow = c.shadow ? 'box-shadow:0 24px 70px rgba(15,23,42,0.28);' : 'box-shadow:none;';
  out.push(
    `${scopedList(scope, s.loginCard)}{background:${bg}!important;${blur}border-radius:${c.radius}px;${shadow}position:relative;z-index:1;}`,
  );
  return out.join('\n');
}

/**
 * Compile a full config + this lane's DOM selectors into a stylesheet.
 * Disabled scopes emit nothing; each scope's rules are gated behind a body
 * marker class so removing the class (or the whole <style>) restores native.
 */
export function generateStylesheet(config: ExtraThemeConfig, sel: Selectors): string {
  return [appCss(config.app, sel.app), loginCss(config.login, sel.login)].filter(Boolean).join('\n').trim();
}
