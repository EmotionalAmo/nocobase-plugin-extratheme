import { describe, it, expect } from 'vitest';
import { generateStylesheet } from '../generateCss';
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

  it('app enabled -> header frosted rgba + blur, scoped by body class', () => {
    const css = generateStylesheet(mergeConfig({ app: { enabled: true } }), SEL);
    expect(css).toContain('body.extra-theme-app-on .ant-layout-header');
    expect(css).toContain('rgba(255,255,255,0.9)');
    expect(css).toContain('backdrop-filter:blur(14px)');
    expect(css).toContain('-webkit-backdrop-filter:blur(14px)');
  });

  it('header solid -> no blur', () => {
    const css = generateStylesheet(mergeConfig({ app: { enabled: true, header: { style: 'solid' } } }), SEL);
    expect(css).toContain('.ant-layout-header');
    expect(css).not.toContain('backdrop-filter:blur(14px)');
  });

  it('card glass false -> no card blur', () => {
    const css = generateStylesheet(mergeConfig({ app: { enabled: true, card: { glass: false } } }), SEL);
    expect(css).not.toMatch(/\.ant-card\{[^}]*backdrop-filter/);
  });

  it('app background gradient applied to appRoot', () => {
    const css = generateStylesheet(mergeConfig({ app: { enabled: true } }), SEL);
    expect(css).toContain('body.extra-theme-app-on .ant-layout{');
    expect(css).toContain('linear-gradient(135deg,#e0f2fe,#ede9fe)');
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

  it('only app enabled -> no login rules', () => {
    const css = generateStylesheet(mergeConfig({ app: { enabled: true } }), SEL);
    expect(css).not.toContain('signin-card');
  });
});
