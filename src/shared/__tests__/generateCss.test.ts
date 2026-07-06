import { describe, it, expect } from 'vitest';
import { generateStylesheet, isAppActive } from '../generateCss';
import { mergeConfig } from '../defaults';
import type { Selectors } from '../types';

const SEL: Selectors = {
  app: { appRoot: '.ant-layout', header: '.ant-layout-header', sider: '.ant-layout-sider', card: '.ant-card', content: '.ant-pro-layout-content' },
  login: { loginRoot: '.signin-page', loginCard: '.signin-card' },
};

describe('generateStylesheet (thin: bg + blur only; colors are tokens)', () => {
  it('all disabled -> empty', () => {
    expect(generateStylesheet(mergeConfig({}), SEL).trim()).toBe('');
  });

  it('工作区外观 on -> body background + content transparent + class-less clear', () => {
    const css = generateStylesheet(mergeConfig({ app: { enabled: true } }), SEL);
    expect(css).toContain('body.extra-theme-app-on{background:linear-gradient(135deg,#e0f2fe,#ede9fe)');
    expect(css).toContain('background-attachment:fixed');
    expect(css).toContain('body.extra-theme-app-on .ant-pro-layout-content{background:transparent!important;}');
    expect(css).toContain('.ant-card div:not([class]):not([id])');
    expect(css).toContain('.ant-layout-sider-children{top:0!important;}');
  });

  it('does NOT emit surface color rules (those are antd tokens now)', () => {
    const css = generateStylesheet(mergeConfig({ app: { enabled: true, header: { enabled: true } } }), SEL);
    expect(css).not.toContain('rgba(255,255,255'); // no colorBgContainer/header color in CSS
    expect(css).not.toMatch(/\.ant-layout-header\{background:/);
  });

  it('card glass+blur -> backdrop-filter on .ant-card and .code-block', () => {
    const css = generateStylesheet(mergeConfig({ app: { enabled: true, card: { glass: true, blur: 12 } } }), SEL);
    expect(css).toContain('body.extra-theme-app-on .ant-card,body.extra-theme-app-on .code-block{backdrop-filter:blur(12px);');
    expect(css).toContain('-webkit-backdrop-filter:blur(12px)');
  });

  it('card glass false -> no card blur', () => {
    const css = generateStylesheet(mergeConfig({ app: { enabled: true, card: { glass: false } } }), SEL);
    expect(css).not.toContain('backdrop-filter');
  });

  it('header frosted+blur -> backdrop-filter on header, independent of workspace switch', () => {
    const css = generateStylesheet(mergeConfig({ app: { enabled: false, header: { enabled: true, style: 'frosted', blur: 16 } } }), SEL);
    expect(css).toContain('body.extra-theme-app-on .ant-layout-header{backdrop-filter:blur(16px);');
    expect(css).not.toContain('background:linear-gradient'); // workspace bg off
  });

  it('header solid -> no header blur', () => {
    const css = generateStylesheet(mergeConfig({ app: { header: { enabled: true, style: 'solid', blur: 16 } } }), SEL);
    expect(css).not.toContain('.ant-layout-header{backdrop-filter');
  });

  it('sider on -> uniform full-width tint on sider-children + cleared menu bg + no border', () => {
    const css = generateStylesheet(mergeConfig({ app: { sider: { enabled: true, color: '#ffffff', opacity: 50 } } }), SEL);
    // placeholder transparent, tint the FULL-WIDTH container (not the inset menu)
    expect(css).toContain('body.extra-theme-app-on .ant-layout-sider{background:transparent!important;}');
    expect(css).toContain('.ant-layout-sider-children{background:rgba(255,255,255,0.5)!important;border-right:none!important;');
    // menu itself cleared + its "invisible" right border removed
    expect(css).toContain('.ant-layout-sider .ant-menu{background:transparent!important;border-inline-end:none!important;');
    expect(css).toContain('.ant-layout-sider .ant-menu::-webkit-scrollbar{width:6px');
    expect(css).toContain('::-webkit-scrollbar-thumb{background:rgba(0,0,0,0.18)');
  });

  it('sider frosted -> blur lands on the sider-children container', () => {
    const css = generateStylesheet(mergeConfig({ app: { sider: { enabled: true, style: 'frosted', blur: 18 } } }), SEL);
    expect(css).toMatch(/\.ant-layout-sider-children\{background:[^}]*backdrop-filter:blur\(18px\);/);
  });

  it('dim>0 composites a black layer into the body background', () => {
    const css = generateStylesheet(mergeConfig({ app: { enabled: true, background: { dim: 40 } as any } }), SEL);
    expect(css).toContain('linear-gradient(rgba(0,0,0,0.4),rgba(0,0,0,0.4))');
  });

  it('font on -> font-family on body scope; off/empty -> none', () => {
    const on = generateStylesheet(mergeConfig({ app: { font: { enabled: true, family: '"Kaiti SC",serif' } } }), SEL);
    expect(on).toContain('body.extra-theme-app-on{font-family:"Kaiti SC",serif!important;}');
    const off = generateStylesheet(mergeConfig({ app: { font: { enabled: false, family: '"Kaiti SC",serif' } } }), SEL);
    expect(off).not.toContain('font-family');
    const empty = generateStylesheet(mergeConfig({ app: { font: { enabled: true, family: '' } } }), SEL);
    expect(empty).not.toContain('font-family');
  });
});

describe('isAppActive', () => {
  it('false when all off', () => expect(isAppActive(mergeConfig({}).app)).toBe(false));
  it('true when only header on', () => expect(isAppActive(mergeConfig({ app: { header: { enabled: true } } }).app)).toBe(true));
  it('true when only 工作区外观 on', () => expect(isAppActive(mergeConfig({ app: { enabled: true } }).app)).toBe(true));
  it('true when only font on', () => expect(isAppActive(mergeConfig({ app: { font: { enabled: true } } }).app)).toBe(true));
});
