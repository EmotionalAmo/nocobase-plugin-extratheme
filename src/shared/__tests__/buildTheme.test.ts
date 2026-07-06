import { describe, it, expect } from 'vitest';
import { buildThemeConfig, KEEP_OPAQUE_COMPONENTS } from '../buildTheme';
import { mergeConfig } from '../defaults';

const BASE = { colorBgHeader: '#001529', colorPrimary: '#1677ff' };

describe('buildThemeConfig', () => {
  it('spreads base token + keeps overlays opaque', () => {
    const t = buildThemeConfig(mergeConfig({}).app, BASE);
    expect(t.token.colorPrimary).toBe('#1677ff'); // base preserved
    expect(t.token.colorBgElevated).toBe('#ffffff'); // overlays opaque
    expect(t.cssVar).toBe(true);
  });

  it('all disabled -> no surface overrides', () => {
    const t = buildThemeConfig(mergeConfig({}).app, BASE);
    expect(t.token.colorBgContainer).toBeUndefined();
    expect(t.token.colorBgLayout).toBeUndefined();
    // colorBgHeader stays base (header disabled by default)
    expect(t.token.colorBgHeader).toBe('#001529');
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

  it('sider on -> colorBgSider translucent', () => {
    const t = buildThemeConfig(mergeConfig({ app: { sider: { enabled: true, color: '#ffffff', opacity: 60 } } }).app, BASE);
    expect(t.token.colorBgSider).toBe('rgba(255,255,255,0.6)');
  });

  it('pins the leak set (Table/Input/Select/...) opaque', () => {
    const t = buildThemeConfig(mergeConfig({ app: { enabled: true } }).app, BASE);
    expect(t.components.Table.colorBgContainer).toBe('#ffffff');
    expect(t.components.Select.colorBgContainer).toBe('#ffffff');
    expect(Object.keys(KEEP_OPAQUE_COMPONENTS)).toContain('DatePicker');
  });
});
