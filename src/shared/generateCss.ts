import type { ExtraThemeConfig, AppConfig, LoginConfig, Selectors, NavConfig } from './types';
import { hexToRgba, buildBackground } from './color';

function bgDecl(bg: ReturnType<typeof buildBackground>): string {
  return (
    `background:${bg.image};` +
    `background-size:${bg.size};` +
    `background-repeat:${bg.repeat};` +
    `background-position:${bg.position};` +
    `background-attachment:fixed;`
  );
}

function navRule(scope: string, sel: string, nav: NavConfig): string {
  const bg = hexToRgba(nav.color, nav.opacity / 100);
  const fg = nav.text === 'light' ? '#f8fafc' : '#1f2733';
  const blur =
    nav.style === 'frosted' && nav.blur > 0
      ? `backdrop-filter:blur(${nav.blur}px);-webkit-backdrop-filter:blur(${nav.blur}px);`
      : '';
  return `${scope} ${sel}{background:${bg}!important;${blur}color:${fg};}`;
}

function appCss(app: AppConfig, s: Selectors['app']): string {
  if (!app.enabled) return '';
  const scope = 'body.extra-theme-app-on';
  const out: string[] = [];
  // Background on the layout root; content layer transparent so it shows through.
  out.push(`${scope} ${s.appRoot}{${bgDecl(buildBackground(app.background))}}`);
  out.push(`${scope} ${s.content}{background:transparent!important;}`);
  if (app.background.dim > 0) {
    out.push(
      `${scope} ${s.appRoot}::before{content:"";position:fixed;inset:0;pointer-events:none;z-index:0;` +
        `background:${hexToRgba('#000000', app.background.dim / 100)};}`,
    );
  }
  // Top / side nav.
  out.push(navRule(scope, s.header, app.header));
  out.push(navRule(scope, s.sider, app.sider));
  // Content cards.
  const cardBg = hexToRgba('#ffffff', app.card.opacity / 100);
  const cardBlur =
    app.card.glass && app.card.blur > 0
      ? `backdrop-filter:blur(${app.card.blur}px);-webkit-backdrop-filter:blur(${app.card.blur}px);`
      : '';
  const cardBorder = app.card.border ? 'border:1px solid rgba(255,255,255,0.5);' : '';
  out.push(`${scope} ${s.card}{background:${cardBg}!important;${cardBlur}${cardBorder}}`);
  return out.join('\n');
}

function loginCss(login: LoginConfig, s: Selectors['login']): string {
  if (!login.enabled) return '';
  const scope = 'body.extra-theme-login-on';
  const out: string[] = [];
  out.push(`${scope} ${s.loginRoot}{${bgDecl(buildBackground(login.background))}}`);
  if (login.background.dim > 0) {
    out.push(
      `${scope} ${s.loginRoot}::before{content:"";position:fixed;inset:0;pointer-events:none;z-index:0;` +
        `background:${hexToRgba('#000000', login.background.dim / 100)};}`,
    );
  }
  const c = login.card;
  const bg = hexToRgba('#ffffff', c.opacity / 100);
  const blur =
    c.glass && c.blur > 0 ? `backdrop-filter:blur(${c.blur}px);-webkit-backdrop-filter:blur(${c.blur}px);` : '';
  const shadow = c.shadow ? 'box-shadow:0 24px 70px rgba(15,23,42,0.28);' : 'box-shadow:none;';
  out.push(
    `${scope} ${s.loginCard}{background:${bg}!important;${blur}border-radius:${c.radius}px;${shadow}position:relative;z-index:1;}`,
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
