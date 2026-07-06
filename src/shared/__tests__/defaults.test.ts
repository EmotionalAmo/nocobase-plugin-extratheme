import { describe, it, expect } from 'vitest';
import { DEFAULT_APP, DEFAULT_LOGIN, GRADIENT_PRESETS, FONT_PRESETS, mergeConfig } from '../defaults';

describe('defaults', () => {
  it('app/login default disabled', () => {
    expect(DEFAULT_APP.enabled).toBe(false);
    expect(DEFAULT_LOGIN.enabled).toBe(false);
  });
  it('has the 7 gradient presets', () => {
    expect(Object.keys(GRADIENT_PRESETS)).toEqual(
      expect.arrayContaining(['晴空', '暖阳', '极光', '海洋', '薄荷', '樱粉', '深夜']),
    );
  });
  it('app starting values match spec', () => {
    expect(DEFAULT_APP.header).toMatchObject({ style: 'frosted', opacity: 90, blur: 14, text: 'dark' });
    expect(DEFAULT_APP.sider).toMatchObject({ style: 'frosted', opacity: 86, blur: 16 });
    expect(DEFAULT_APP.card).toMatchObject({ glass: true, opacity: 72, blur: 12 });
  });
  it('font defaults off, system source, non-empty sans family, empty upload', () => {
    expect(DEFAULT_APP.font.enabled).toBe(false);
    expect(DEFAULT_APP.font.source).toBe('system');
    expect(DEFAULT_APP.font.family).toBe(FONT_PRESETS[1].value);
    expect(DEFAULT_APP.font.family.length).toBeGreaterThan(0);
    expect(DEFAULT_APP.font.upload).toEqual({ url: '', name: '', format: '' });
  });
  it('FONT_PRESETS: first is system-default (empty), rest are non-empty stacks', () => {
    expect(FONT_PRESETS[0]).toEqual({ label: '系统默认', value: '' });
    expect(FONT_PRESETS.length).toBeGreaterThanOrEqual(5);
    FONT_PRESETS.slice(1).forEach((p) => expect(p.value).toMatch(/sans-serif|serif|monospace/));
  });
  it('mergeConfig fills app.font from defaults when missing', () => {
    const m = mergeConfig({ app: { enabled: true } });
    expect(m.app.font.enabled).toBe(false);
    expect(m.app.font.family).toBe(DEFAULT_APP.font.family);
  });
  it('login starting values match spec', () => {
    expect(DEFAULT_LOGIN.card).toMatchObject({ glass: true, opacity: 70, blur: 18, radius: 18, shadow: true });
    expect(DEFAULT_LOGIN.background.dim).toBe(15);
  });
  it('mergeConfig fills missing from defaults', () => {
    const m = mergeConfig({ app: { enabled: true, header: { opacity: 50 } } });
    expect(m.app.enabled).toBe(true);
    expect(m.app.header.opacity).toBe(50);
    expect(m.app.header.blur).toBe(14); // not given -> default
    expect(m.login.enabled).toBe(false); // whole group missing -> default
  });
  it('mergeConfig on empty returns full defaults', () => {
    const m = mergeConfig({});
    expect(m.app.enabled).toBe(false);
    expect(m.login.card.radius).toBe(18);
  });
  it('mergeConfig tolerates null/undefined', () => {
    expect(mergeConfig(null as any).app.enabled).toBe(false);
    expect(mergeConfig(undefined as any).login.enabled).toBe(false);
  });
  it('mergeConfig does not mutate DEFAULT_APP', () => {
    mergeConfig({ app: { header: { opacity: 1 } } });
    expect(DEFAULT_APP.header.opacity).toBe(90);
  });
});
