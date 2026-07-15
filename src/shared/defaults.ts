import type { AppConfig, LoginConfig, ExtraThemeConfig } from './types';

/** Background gradient presets (name -> color stops). Options for the background picker, not skins. */
export const GRADIENT_PRESETS: Record<string, string[]> = {
  晴空: ['#e0f2fe', '#ede9fe'],
  暖阳: ['#fff7ed', '#ffedd5', '#fed7aa'],
  极光: ['#c7d2fe', '#a7f3d0', '#fbcfe8'],
  海洋: ['#cffafe', '#bae6fd', '#a5b4fc'],
  薄荷: ['#d1fae5', '#a7f3d0'],
  樱粉: ['#fce7f3', '#fbcfe8', '#ddd6fe'],
  深夜: ['#1e293b', '#0f172a'],
};

/**
 * Global font presets (label -> CSS font-family stack). All are SYSTEM-font stacks —
 * no web-font is loaded (CSP-safe, offline-safe, zero-latency). value '' = system
 * default (no override). CJK-first so Chinese text stays correct on macOS/Windows/Linux.
 */
export const FONT_PRESETS: { label: string; value: string }[] = [
  { label: '系统默认', value: '' },
  { label: '无衬线（苹方/雅黑）', value: '"PingFang SC","Microsoft YaHei","Hiragino Sans GB","Segoe UI",Roboto,system-ui,sans-serif' },
  { label: '思源黑体', value: '"Source Han Sans SC","Noto Sans CJK SC","PingFang SC","Microsoft YaHei",sans-serif' },
  { label: '衬线（宋体）', value: '"Songti SC","Noto Serif CJK SC","SimSun",Georgia,"Times New Roman",serif' },
  { label: '楷体', value: '"Kaiti SC","STKaiti","KaiTi","Noto Serif CJK SC",serif' },
  { label: '圆体', value: '"Yuanti SC","PingFang SC","Hiragino Sans GB","Microsoft YaHei",sans-serif' },
  { label: '等宽（代码）', value: '"SF Mono","JetBrains Mono","Fira Code",Consolas,"Courier New",monospace' },
];

/**
 * Starting values when an admin first enables the 工作区外观 group. Everything is
 * OFF by default (`enabled: false`) — these numbers only take visual effect once
 * the admin flips the switch on.
 */
export const DEFAULT_APP: AppConfig = {
  enabled: false,
  background: {
    type: 'gradient',
    color: '#eef2f7',
    gradient: { preset: '晴空', angle: 135, colors: GRADIENT_PRESETS['晴空'] },
    image: { url: '', fit: 'cover', position: 'center' },
    dim: 0,
  },
  card: { glass: true, opacity: 72, blur: 12, border: true },
  // header / sider / font are independent of the 工作区外观 (background+card) switch;
  // all default OFF so a fresh install changes nothing. font.family defaults to the
  // 无衬线 stack so flipping the switch on shows an immediate effect.
  header: { enabled: false, style: 'frosted', color: '#ffffff', opacity: 90, blur: 14, text: 'dark', texture: 85 },
  sider: { enabled: false, style: 'frosted', color: '#ffffff', opacity: 86, blur: 16, text: 'dark', texture: 85 },
  font: { enabled: false, source: 'system', family: FONT_PRESETS[1].value, upload: { url: '', name: '', format: '' } },
  // scrollbar off by default (native); when enabled, 'always' shows / 'hidden' hides.
  scrollbar: { enabled: false, mode: 'always' },
  // hide arbitrary elements by CSS selector (e.g. the global AI entry). Off by default;
  // the default selector targets the AI entry's emotion-hash class (user-editable — the
  // hash changes across NocoBase builds).
  hide: { enabled: false, selector: '.css-1hc929u' },
};

/** Starting values for the 登录页外观 group (independent of app). */
export const DEFAULT_LOGIN: LoginConfig = {
  enabled: false,
  background: {
    type: 'gradient',
    color: '#1e293b',
    gradient: { preset: '暖阳', angle: 135, colors: GRADIENT_PRESETS['暖阳'] },
    image: { url: '', fit: 'cover', position: 'center' },
    dim: 15,
  },
  card: { glass: true, opacity: 70, blur: 18, radius: 18, shadow: true },
};

function isObj(v: any): boolean {
  return v != null && typeof v === 'object' && !Array.isArray(v);
}

/** Deep-merge `over` onto a fresh copy of `base` (base is never mutated). */
function deepMerge<T>(base: T, over: any): T {
  if (!isObj(base)) return over === undefined ? base : over;
  const out: any = Array.isArray(base) ? [...(base as any)] : { ...base };
  for (const k of Object.keys(base as any)) {
    if (isObj((base as any)[k])) out[k] = deepMerge((base as any)[k], over?.[k]);
    else if (over && over[k] !== undefined) out[k] = over[k];
  }
  return out;
}

/** Merge a partial (from DB / API) onto the defaults, producing a complete config. */
export function mergeConfig(partial: any): ExtraThemeConfig {
  return {
    app: deepMerge(DEFAULT_APP, partial?.app),
    login: deepMerge(DEFAULT_LOGIN, partial?.login),
  };
}
