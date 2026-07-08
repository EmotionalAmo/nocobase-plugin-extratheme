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
    expect(css).toContain('background-attachment:fixed!important');
    expect(css).toContain('body.extra-theme-app-on .ant-pro-layout-content{background:transparent!important;}');
    expect(css).toContain('.ant-card div:not([class]):not([id])');
    expect(css).toContain('.ant-layout-sider-children{top:auto!important;bottom:0!important;}');
  });

  it('workspace card/container color stays a token (not a CSS rule)', () => {
    const css = generateStylesheet(mergeConfig({ app: { enabled: true } }), SEL); // no nav
    expect(css).not.toContain('colorBgContainer');
    expect(css).not.toMatch(/\.ant-card\{background:rgba/); // card color is a token, not CSS
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

  it('header on -> theme color at opacity + blur when frosted (independent of workspace switch)', () => {
    const css = generateStylesheet(mergeConfig({ app: { enabled: false, header: { enabled: true, color: 'rgb(0, 21, 41)', opacity: 50, style: 'frosted', blur: 16 } } }), SEL);
    expect(css).toContain('.ant-pro-layout-header{background:rgba(0,21,41,0.5)!important;backdrop-filter:blur(16px);');
    expect(css).not.toContain('background:linear-gradient'); // workspace bg off
  });

  it('header solid -> opacity applied but no blur', () => {
    const css = generateStylesheet(mergeConfig({ app: { header: { enabled: true, color: 'rgb(0, 21, 41)', opacity: 80, style: 'solid', blur: 16 } } }), SEL);
    expect(css).toContain('background:rgba(0,21,41,0.8)!important;}'); // no blur suffix
    expect(css).not.toContain('backdrop-filter');
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

  it('image fit=cover -> size:cover + no-repeat, all !important so it fills (no tiling)', () => {
    const css = generateStylesheet(
      mergeConfig({ app: { enabled: true, background: { type: 'image', image: { url: 'http://h/p.jpg', fit: 'cover', position: 'center' } } as any } }),
      SEL,
    );
    expect(css).toContain('background-size:cover!important;');
    expect(css).toContain('background-repeat:no-repeat!important;');
    expect(css).toContain('background-position:center!important;');
    expect(css).toContain('background-attachment:fixed!important;');
  });

  it('image fit=stretch -> background-size:100% 100% !important (non-uniform fill)', () => {
    const css = generateStylesheet(
      mergeConfig({ app: { enabled: true, background: { type: 'image', image: { url: 'http://h/p.jpg', fit: 'stretch', position: 'center' } } as any } }),
      SEL,
    );
    expect(css).toContain('background-size:100% 100%!important;');
    expect(css).toContain('background-repeat:no-repeat!important;');
  });

  it('image fit=repeat -> tiles at natural size (size:auto + repeat)', () => {
    const css = generateStylesheet(
      mergeConfig({ app: { enabled: true, background: { type: 'image', image: { url: 'http://h/p.jpg', fit: 'repeat', position: 'center' } } as any } }),
      SEL,
    );
    expect(css).toContain('background-size:auto!important;');
    expect(css).toContain('background-repeat:repeat!important;');
  });

  it('dim>0 composites a black layer into the body background', () => {
    const css = generateStylesheet(mergeConfig({ app: { enabled: true, background: { dim: 40 } as any } }), SEL);
    expect(css).toContain('linear-gradient(rgba(0,0,0,0.4),rgba(0,0,0,0.4))');
  });

  it('scrollbar enabled+always -> always-visible bar; enabled+hidden -> hidden; disabled -> none', () => {
    const always = generateStylesheet(mergeConfig({ app: { scrollbar: { enabled: true, mode: 'always' } } }), SEL);
    expect(always).toContain('::-webkit-scrollbar,body.extra-theme-app-on::-webkit-scrollbar{width:10px');
    expect(always).toContain('::-webkit-scrollbar-thumb');

    const hidden = generateStylesheet(mergeConfig({ app: { scrollbar: { enabled: true, mode: 'hidden' } } }), SEL);
    expect(hidden).toContain('::-webkit-scrollbar,body.extra-theme-app-on::-webkit-scrollbar{display:none');
    expect(hidden).toContain('scrollbar-width:none');
    expect(hidden).not.toContain('width:10px');

    const off = generateStylesheet(mergeConfig({ app: { scrollbar: { enabled: false, mode: 'always' } } }), SEL);
    expect(off).not.toContain('::-webkit-scrollbar,body.extra-theme-app-on::-webkit-scrollbar');
  });

  it('font on -> font-family on body scope; off/empty -> none', () => {
    const on = generateStylesheet(mergeConfig({ app: { font: { enabled: true, family: '"Kaiti SC",serif' } } }), SEL);
    expect(on).toContain('body.extra-theme-app-on{font-family:"Kaiti SC",serif!important;}');
    const off = generateStylesheet(mergeConfig({ app: { font: { enabled: false, family: '"Kaiti SC",serif' } } }), SEL);
    expect(off).not.toContain('font-family');
    const empty = generateStylesheet(mergeConfig({ app: { font: { enabled: true, family: '' } } }), SEL);
    expect(empty).not.toContain('font-family');
  });

  it('sanitizes a hand-typed custom family in the CSS rule (no breakout)', () => {
    const css = generateStylesheet(mergeConfig({ app: { font: { enabled: true, family: 'Arial;}html{x:1}' } } }), SEL);
    expect(css).toContain('font-family:Arialhtmlx:1!important;');
    expect(css).not.toContain('}html{');
  });

  it('upload source -> injects @font-face + applies the uploaded family', () => {
    const css = generateStylesheet(
      mergeConfig({ app: { font: { enabled: true, source: 'upload', upload: { url: 'http://h/brand.woff2', name: 'Brand', format: 'woff2' } } } }),
      SEL,
    );
    expect(css).toContain('@font-face{font-family:"Brand";src:url("http://h/brand.woff2") format("woff2");font-display:swap;}');
    expect(css).toContain('body.extra-theme-app-on{font-family:"Brand"!important;}');
  });

  it('upload source -> format derived from the url extension when missing', () => {
    const css = generateStylesheet(
      mergeConfig({ app: { font: { enabled: true, source: 'upload', upload: { url: 'http://h/brand.ttf', name: 'Brand', format: '' } } } }),
      SEL,
    );
    expect(css).toContain('format("truetype")');
  });

  it('upload source with no url -> no @font-face and no font-family', () => {
    const css = generateStylesheet(
      mergeConfig({ app: { font: { enabled: true, source: 'upload', upload: { url: '', name: 'X', format: '' } } } }),
      SEL,
    );
    expect(css).not.toContain('@font-face');
    expect(css).not.toContain('font-family');
  });
});

describe('SECURITY: no config value breaks out of the injected stylesheet', () => {
  const breakout = 'red;} body::before{position:fixed;inset:0;background:url(//attacker.example/beacon)} .x{color:red';
  it('nav header color breakout -> neutralized (transparent), no injected rule', () => {
    const css = generateStylesheet(mergeConfig({ app: { header: { enabled: true, color: breakout, opacity: 50, style: 'solid', blur: 0 } } }), SEL);
    expect(css).not.toContain('body::before');
    expect(css).not.toContain('attacker.example');
    expect(css).toContain('background:transparent!important;');
  });
  it('sider color breakout -> neutralized', () => {
    const css = generateStylesheet(mergeConfig({ app: { sider: { enabled: true, color: breakout, opacity: 50 } } }), SEL);
    expect(css).not.toContain('body::before');
    expect(css).not.toContain('attacker.example');
  });
  it('background color / gradient / image-url breakouts -> no injected rules', () => {
    const c1 = generateStylesheet(mergeConfig({ app: { enabled: true, background: { type: 'color', color: breakout } as any } }), SEL);
    const c2 = generateStylesheet(mergeConfig({ app: { enabled: true, background: { type: 'gradient', gradient: { angle: '9);}html{}x{' as any, colors: ['red)} body::after{content:"X"', '#00f'] } } as any } }), SEL);
    const c3 = generateStylesheet(mergeConfig({ app: { enabled: true, background: { type: 'image', image: { url: 'x");}html{}body{background:url(//evil', fit: 'cover' } } as any } }), SEL);
    [c1, c2, c3].forEach((css) => {
      expect(css).not.toContain('attacker.example');
      expect(css).not.toContain('body::after');
      expect(css).not.toContain('");}');
      expect(css).not.toContain('html{}');
    });
  });
  it('blur breakout string -> no injection (numeric gate + safeNum coercion)', () => {
    const css = generateStylesheet(mergeConfig({ app: { header: { enabled: true, color: '#001529', opacity: 50, style: 'frosted', blur: '5);}body{x:1' as any } } }), SEL);
    expect(css).not.toContain('body{x:1'); // never reaches the stylesheet
    expect(css).not.toContain('backdrop-filter'); // non-numeric blur fails the >0 gate → not emitted
  });
  it('uploaded font format breakout -> dropped (allow-list)', () => {
    const css = generateStylesheet(mergeConfig({ app: { font: { enabled: true, source: 'upload', upload: { url: 'http://h/f.woff2', name: 'X', format: 'woff2") ;} body{x:1} @font-face{src:url(//evil' as any } } } }), SEL);
    expect(css).not.toContain('body{x:1');
    expect(css).not.toContain('//evil');
    expect(css).toContain('format("woff2")'); // derived from the url, not the raw format
  });
});

describe('isAppActive', () => {
  it('false when all off', () => expect(isAppActive(mergeConfig({}).app)).toBe(false));
  it('true when only header on', () => expect(isAppActive(mergeConfig({ app: { header: { enabled: true } } }).app)).toBe(true));
  it('true when only 工作区外观 on', () => expect(isAppActive(mergeConfig({ app: { enabled: true } }).app)).toBe(true));
  it('true when only font on', () => expect(isAppActive(mergeConfig({ app: { font: { enabled: true } } }).app)).toBe(true));
  it('true when scrollbar enabled', () => expect(isAppActive(mergeConfig({ app: { scrollbar: { enabled: true, mode: 'hidden' } } }).app)).toBe(true));
  it('false when scrollbar disabled and rest off', () => expect(isAppActive(mergeConfig({ app: { scrollbar: { enabled: false, mode: 'always' } } }).app)).toBe(false));
});
