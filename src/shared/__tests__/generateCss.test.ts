import { describe, it, expect } from 'vitest';
import { generateStylesheet, isAppActive } from '../generateCss';
import { mergeConfig } from '../defaults';
import type { Selectors } from '../types';

const SEL: Selectors = {
  app: { appRoot: '.ant-layout', header: '.ant-layout-header', sider: '.ant-layout-sider', card: '.ant-card', content: '.ant-layout-content' },
  login: { loginRoot: '.signin-page', loginCard: '.signin-card' },
};

describe('generateStylesheet', () => {
  it('all disabled -> empty', () => {
    expect(generateStylesheet(mergeConfig({}), SEL).trim()).toBe('');
  });

  it('header enabled -> frosted rgba + blur, scoped by body class', () => {
    const css = generateStylesheet(mergeConfig({ app: { header: { enabled: true } } }), SEL);
    expect(css).toContain('body.extra-theme-app-on .ant-layout-header');
    expect(css).toContain('rgba(255,255,255,0.9)');
    expect(css).toContain('backdrop-filter:blur(14px)');
    expect(css).toContain('-webkit-backdrop-filter:blur(14px)');
  });

  it('header independent of the 工作区外观 switch (app.enabled=false)', () => {
    const css = generateStylesheet(mergeConfig({ app: { enabled: false, header: { enabled: true } } }), SEL);
    expect(css).toContain('.ant-layout-header'); // header still styled
    expect(css).not.toContain('linear-gradient'); // no background (工作区外观 off)
  });

  it('header enabled, sider disabled -> only header', () => {
    const css = generateStylesheet(mergeConfig({ app: { header: { enabled: true }, sider: { enabled: false } } }), SEL);
    expect(css).toContain('.ant-layout-header');
    expect(css).not.toContain('.ant-layout-sider');
  });

  it('sider enabled, header disabled -> only sider', () => {
    const css = generateStylesheet(mergeConfig({ app: { sider: { enabled: true }, header: { enabled: false } } }), SEL);
    expect(css).toContain('.ant-layout-sider');
    expect(css).not.toContain('.ant-layout-header');
  });

  it('header solid -> no blur', () => {
    const css = generateStylesheet(mergeConfig({ app: { header: { enabled: true, style: 'solid' } } }), SEL);
    expect(css).toContain('.ant-layout-header');
    expect(css).not.toContain('backdrop-filter:blur(14px)');
  });

  it('工作区外观 (app.enabled) drives background + cards, not nav', () => {
    const css = generateStylesheet(mergeConfig({ app: { enabled: true } }), SEL);
    expect(css).toContain('body.extra-theme-app-on .ant-layout{');
    expect(css).toContain('linear-gradient(135deg,#e0f2fe,#ede9fe)');
    expect(css).toContain('.ant-card{');
    expect(css).toContain('.ant-card div:not([class]):not([id])'); // clears nested custom white wrappers
    expect(css).not.toContain('.ant-layout-header'); // header off by default
  });

  it('card glass false -> no card blur', () => {
    const css = generateStylesheet(mergeConfig({ app: { enabled: true, card: { glass: false } } }), SEL);
    expect(css).not.toMatch(/\.ant-card\{[^}]*backdrop-filter/);
  });

  it('login enabled -> card radius + shadow + login bg on loginRoot', () => {
    const css = generateStylesheet(mergeConfig({ login: { enabled: true } }), SEL);
    expect(css).toContain('body.extra-theme-login-on .signin-card');
    expect(css).toContain('border-radius:18px');
    expect(css).toContain('body.extra-theme-login-on .signin-page');
  });

  it('dim>0 composites a black layer over the background', () => {
    const css = generateStylesheet(mergeConfig({ app: { enabled: true, background: { dim: 40 } as any } }), SEL);
    expect(css).toContain('linear-gradient(rgba(0,0,0,0.4),rgba(0,0,0,0.4))');
  });

  it('dim=0 -> no black layer', () => {
    const css = generateStylesheet(mergeConfig({ app: { enabled: true } }), SEL);
    expect(css).not.toContain('rgba(0,0,0');
  });

  it('content selectors are each scoped (comma list)', () => {
    const sel2 = { ...SEL, app: { ...SEL.app, content: '.a,.b' } };
    const css = generateStylesheet(mergeConfig({ app: { enabled: true } }), sel2);
    expect(css).toContain('body.extra-theme-app-on .a,body.extra-theme-app-on .b{background:transparent!important;}');
  });
});

describe('isAppActive', () => {
  it('false when all off', () => expect(isAppActive(mergeConfig({}).app)).toBe(false));
  it('true when only header on', () => expect(isAppActive(mergeConfig({ app: { header: { enabled: true } } }).app)).toBe(true));
  it('true when only sider on', () => expect(isAppActive(mergeConfig({ app: { sider: { enabled: true } } }).app)).toBe(true));
  it('true when only 工作区外观 on', () => expect(isAppActive(mergeConfig({ app: { enabled: true } }).app)).toBe(true));
});
