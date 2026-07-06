import type { AppConfig } from './types';
import { hexToRgba } from './color';

/**
 * Builds the antd ThemeConfig that ExtraTheme applies through NocoBase's global
 * theme (a `themeConfig` record + `useGlobalTheme().setTheme`). Changing tokens
 * at the global source is what penetrates isolated "code-block" React roots —
 * NocoBase re-bridges the merged ConfigProvider theme into every nested root
 * (flow-engine provider.tsx -> ReactView.tsx), which raw CSS cannot reach.
 *
 * Token map (verified against @nocobase/client-v2 defaultTheme / customAlgorithm):
 *   colorBgContainer  → Card/surface bodies (make translucent)
 *   colorBgLayout     → page body (transparent so the bg image shows through)
 *   colorBgHeader     → NocoBase custom token: top nav bar
 *   colorBgSider      → NocoBase custom token: side nav bar
 *   colorBgElevated   → ALL overlays (Modal/Drawer/Dropdown/Popover/Select-panel/
 *                       DatePicker/Message/Notification) — KEEP opaque #fff.
 * The "leak set" (Input/Select/Table/... also read colorBgContainer) is pinned
 * back to #fff via components.<C>.colorBgContainer so controls stay readable.
 */

/** Components that also read colorBgContainer — pin opaque so they stay usable over a translucent theme. */
export const KEEP_OPAQUE_COMPONENTS: Record<string, any> = {
  Table: { colorBgContainer: '#ffffff' },
  Input: { colorBgContainer: '#ffffff' },
  InputNumber: { colorBgContainer: '#ffffff' },
  Select: { colorBgContainer: '#ffffff' },
  TreeSelect: { colorBgContainer: '#ffffff' },
  Cascader: { colorBgContainer: '#ffffff' },
  Mentions: { colorBgContainer: '#ffffff' },
  DatePicker: { colorBgContainer: '#ffffff' },
};

export interface ExtraThemeConfigOut {
  name: string;
  token: Record<string, any>;
  components: Record<string, any>;
  cssVar: boolean;
}

/**
 * @param app     the 工作区外观 config
 * @param baseToken the current theme's base token (pass defaultTheme.token) so we don't wash out NocoBase chrome.
 */
export function buildThemeConfig(app: AppConfig, baseToken: Record<string, any> = {}): ExtraThemeConfigOut {
  const token: Record<string, any> = { ...baseToken, colorBgElevated: '#ffffff' };

  if (app.enabled) {
    token.colorBgContainer = hexToRgba('#ffffff', app.card.opacity / 100);
    token.colorBgLayout = 'transparent';
  }

  if (app.header.enabled) {
    token.colorBgHeader = hexToRgba(app.header.color, app.header.opacity / 100);
    if (app.header.text === 'dark') {
      token.colorTextHeaderMenu = 'rgba(0,0,0,0.65)';
      token.colorTextHeaderMenuHover = 'rgba(0,0,0,0.88)';
      token.colorTextHeaderMenuActive = 'rgba(0,0,0,0.88)';
    }
    // 'light' keeps the base (white-ish) header menu text tokens.
  }

  if (app.sider.enabled) {
    token.colorBgSider = hexToRgba(app.sider.color, app.sider.opacity / 100);
  }

  return { name: 'ExtraTheme', token, components: { ...KEEP_OPAQUE_COMPONENTS }, cssVar: true };
}
