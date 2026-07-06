import type { AppConfig } from './types';
import { hexToRgba, sanitizeFontFamily } from './color';

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
 * Every token ExtraTheme may write. On each build these are reset to native
 * FIRST, then re-applied only for the sections that are on. This makes the
 * output a pure function of (app, native) for these keys — so a prior "on"
 * state fed back through setTheme() (which makes theme.token carry them) can't
 * leak into a later "off" state and block a clean revert.
 */
const MANAGED_TOKENS = [
  'colorBgContainer',
  'colorBgLayout',
  'colorBgHeader',
  'colorTextHeaderMenu',
  'colorTextHeaderMenuHover',
  'colorTextHeaderMenuActive',
  'fontFamily',
];

/**
 * @param app       the 工作区外观 config
 * @param baseToken the current theme token (pass theme.token) — carries the user's
 *                  own non-managed customizations (colorPrimary, etc.) which pass through.
 * @param nativeToken the pristine NocoBase token (pass defaultTheme.token) — the source
 *                  of truth for chrome tokens that must stay set when a section is off
 *                  (e.g. colorBgHeader is a NocoBase custom token; losing it breaks the header).
 */
export function buildThemeConfig(
  app: AppConfig,
  baseToken: Record<string, any> = {},
  nativeToken: Record<string, any> = {},
): ExtraThemeConfigOut {
  const token: Record<string, any> = { ...baseToken };

  // Reset every managed key to native (or drop it → antd computes its default,
  // i.e. the native look). Non-managed base keys (colorPrimary, …) pass through.
  for (const k of MANAGED_TOKENS) {
    if (nativeToken[k] != null) token[k] = nativeToken[k];
    else delete token[k];
  }
  // Overlays (Modal/Drawer/Dropdown/Popover/…) always opaque.
  token.colorBgElevated = '#ffffff';

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
    // 'light' keeps the native (restored) white-ish header menu text tokens.
  }

  // NOTE: the side nav is NOT themed via a token. colorBgSider tints only the
  // (inset) menu and NocoBase's algorithm transforms the value, leaving a
  // non-uniform sider with a visible seam. The sider is OUTER chrome (not inside
  // a code-block), so CSS reaches it directly — generateStylesheet tints the
  // full-width sider container with the exact configured value instead.

  // Global font — a token so it penetrates isolated code-block roots. Independent
  // of the other sections. Empty family = keep native (already reset above).
  // Sanitize: the family may be hand-typed (custom option).
  const fontFamily = sanitizeFontFamily(app.font?.family || '');
  if (app.font?.enabled && fontFamily) {
    token.fontFamily = fontFamily;
  }

  return { name: 'ExtraTheme', token, components: { ...KEEP_OPAQUE_COMPONENTS }, cssVar: true };
}
