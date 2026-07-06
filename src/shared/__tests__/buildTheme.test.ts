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

  it('all disabled -> no surface overrides + native chrome restored', () => {
    const t = buildThemeConfig(mergeConfig({}).app, BASE, NATIVE);
    expect(t.token.colorBgContainer).toBeUndefined();
    expect(t.token.colorBgLayout).toBeUndefined();
    // colorBgHeader restored from native (header disabled by default)
    expect(t.token.colorBgHeader).toBe('#001529');
  });

  it('off state cleanly reverts even when base is polluted by a prior on-state', () => {
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
    expect(t.token.colorBgContainer).toBeUndefined(); // enhancement cleared
    expect(t.token.colorBgLayout).toBeUndefined(); // enhancement cleared
    expect(t.token.colorBgHeader).toBe('#001529'); // native chrome restored
    expect(t.token.colorTextHeaderMenu).toBe('rgba(255,255,255,0.65)'); // native restored
  });

  it('工作区外观 on -> translucent card + transparent layout', () => {
    const t = buildThemeConfig(mergeConfig({ app: { enabled: true, card: { opacity: 40 } } }).app, BASE);
    expect(t.token.colorBgContainer).toBe('rgba(255,255,255,0.4)');
    expect(t.token.colorBgLayout).toBe('transparent');
  });

  it('header on -> colorBgHeader translucent + dark text tokens', () => {
    const t = buildThemeConfig(mergeConfig({ app: { header: { enabled: true, color: '#ffffff', opacity: 50, text: 'dark' } } }).app, BASE);
    expect(t.token.colorBgHeader).toBe('rgba(255,255,255,0.5)');
    expect(t.token.colorTextHeaderMenu).toBe('rgba(0,0,0,0.65)');
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
