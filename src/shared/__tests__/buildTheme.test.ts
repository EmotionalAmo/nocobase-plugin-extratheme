import { describe, it, expect } from 'vitest';
import { buildThemeConfig, KEEP_OPAQUE_COMPONENTS } from '../buildTheme';
import { mergeConfig } from '../defaults';

const BASE = { colorBgHeader: '#001529', colorPrimary: '#1677ff' };
const NATIVE = {
  colorBgHeader: '#001529',
  colorTextHeaderMenu: 'rgba(255,255,255,0.65)',
  colorTextHeaderMenuHover: 'rgba(255,255,255,0.85)',
  colorTextHeaderMenuActive: '#ffffff',
};

describe('buildThemeConfig', () => {
  it('spreads base token + keeps overlays opaque', () => {
    const t = buildThemeConfig(mergeConfig({}).app, BASE);
    expect(t.token.colorPrimary).toBe('#1677ff'); // base preserved
    expect(t.token.colorBgElevated).toBe('#ffffff'); // overlays opaque
    expect(t.cssVar).toBe(true);
  });

  it('all disabled -> managed surface tokens cleared; nav tokens pass through (theme-owned)', () => {
    const t = buildThemeConfig(mergeConfig({}).app, BASE, NATIVE);
    expect(t.token.colorBgContainer).toBeUndefined();
    expect(t.token.colorBgLayout).toBeUndefined();
    // colorBgHeader is NO LONGER managed by the plugin — it passes through from base.
    expect(t.token.colorBgHeader).toBe('#001529');
  });

  it('off state reverts managed tokens; nav color/text pass through untouched (theme owns them)', () => {
    // base as it looks AFTER an "on" save fed back through setTheme():
    const polluted = {
      colorPrimary: '#ff7900', // the user's genuine customization
      colorBgContainer: 'rgba(255,255,255,0.4)',
      colorBgLayout: 'transparent',
      colorBgHeader: 'rgba(255,255,255,0.5)',
      colorTextHeaderMenu: 'rgba(0,0,0,0.65)',
    };
    const t = buildThemeConfig(mergeConfig({}).app, polluted, NATIVE);
    expect(t.token.colorPrimary).toBe('#ff7900'); // non-managed key preserved
    expect(t.token.colorBgContainer).toBeUndefined(); // managed enhancement cleared
    expect(t.token.colorBgLayout).toBeUndefined(); // managed enhancement cleared
    // nav tokens are theme-owned now → passed through, NOT reset by the plugin
    expect(t.token.colorBgHeader).toBe('rgba(255,255,255,0.5)');
    expect(t.token.colorTextHeaderMenu).toBe('rgba(0,0,0,0.65)');
  });

  it('工作区外观 on + card glass on -> translucent card + transparent layout', () => {
    const t = buildThemeConfig(mergeConfig({ app: { enabled: true, card: { glass: true, opacity: 40 } } }).app, BASE);
    expect(t.token.colorBgContainer).toBe('rgba(255,255,255,0.4)');
    expect(t.token.colorBgLayout).toBe('transparent');
  });

  it('工作区外观 on but card glass OFF -> cards stay opaque (bg still shows)', () => {
    const t = buildThemeConfig(mergeConfig({ app: { enabled: true, card: { glass: false, opacity: 40 } } }).app, BASE, NATIVE);
    expect(t.token.colorBgContainer).toBeUndefined(); // not translucent → opaque native cards
    expect(t.token.colorBgLayout).toBe('transparent'); // page background still visible
  });

  it('header on -> plugin does NOT set nav color/text tokens (theme owns them; opacity/blur are CSS)', () => {
    const t = buildThemeConfig(mergeConfig({ app: { header: { enabled: true, color: '#ffffff', opacity: 50, text: 'dark' } } }).app, BASE);
    expect(t.token.colorBgHeader).toBe('#001529'); // base passthrough, not overridden by the plugin
    expect(t.token.colorTextHeaderMenu).toBeUndefined(); // plugin never touches header text
  });

  it('sider on -> NO colorBgSider token (sider is tinted via CSS, not a token)', () => {
    const t = buildThemeConfig(mergeConfig({ app: { sider: { enabled: true, color: '#ffffff', opacity: 60 } } }).app, BASE);
    expect(t.token.colorBgSider).toBeUndefined();
  });

  it('font on -> fontFamily token set; off/empty -> not set', () => {
    const on = buildThemeConfig(mergeConfig({ app: { font: { enabled: true, family: '"Kaiti SC",serif' } } }).app, BASE, NATIVE);
    expect(on.token.fontFamily).toBe('"Kaiti SC",serif');
    const off = buildThemeConfig(mergeConfig({ app: { font: { enabled: false, family: '"Kaiti SC",serif' } } }).app, BASE, NATIVE);
    expect(off.token.fontFamily).toBeUndefined();
    const empty = buildThemeConfig(mergeConfig({ app: { font: { enabled: true, family: '' } } }).app, BASE, NATIVE);
    expect(empty.token.fontFamily).toBeUndefined();
  });

  it('upload source -> token references the quoted uploaded family name', () => {
    const t = buildThemeConfig(
      mergeConfig({ app: { font: { enabled: true, source: 'upload', upload: { url: 'http://h/f.woff2', name: 'MyBrand', format: 'woff2' } } } }).app,
      BASE,
      NATIVE,
    );
    expect(t.token.fontFamily).toBe('"MyBrand"');
  });

  it('upload source with no url -> no font override', () => {
    const t = buildThemeConfig(
      mergeConfig({ app: { font: { enabled: true, source: 'upload', upload: { url: '', name: 'X', format: '' } } } }).app,
      BASE,
      NATIVE,
    );
    expect(t.token.fontFamily).toBeUndefined();
  });

  it('sanitizes a hand-typed custom family (strips CSS-breakout chars)', () => {
    const t = buildThemeConfig(mergeConfig({ app: { font: { enabled: true, family: '"My Font";}x{' } } }).app, BASE, NATIVE);
    expect(t.token.fontFamily).toBe('"My Font"x');
  });

  it('fontFamily reverts to native when font turned off (no pollution leak)', () => {
    // base carries a prior fontFamily (as if a previous "on" save fed it back)
    const polluted = { fontFamily: '"Kaiti SC",serif', colorPrimary: '#ff7900' };
    const native = { ...NATIVE, fontFamily: 'system-ui,sans-serif' };
    const t = buildThemeConfig(mergeConfig({ app: { font: { enabled: false } } }).app, polluted, native);
    expect(t.token.fontFamily).toBe('system-ui,sans-serif'); // restored to native
    expect(t.token.colorPrimary).toBe('#ff7900'); // non-managed preserved
  });

  it('pins the leak set (Table/Input/Select/...) opaque', () => {
    const t = buildThemeConfig(mergeConfig({ app: { enabled: true } }).app, BASE);
    expect(t.components.Table.colorBgContainer).toBe('#ffffff');
    expect(t.components.Select.colorBgContainer).toBe('#ffffff');
    expect(Object.keys(KEEP_OPAQUE_COMPONENTS)).toContain('DatePicker');
  });
});
