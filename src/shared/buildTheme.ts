import type { AppConfig } from './types';
import { sanitizeFontFamily } from './color';

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
// The nav bar colors/text (colorBgHeader, colorTextHeaderMenu*) are DELIBERATELY not
// here anymore: ExtraTheme hands the nav COLOR back to the theme editor and only layers
// opacity + blur on top (via CSS in generateStylesheet). buildTheme owns only the
// workspace surface + layout + font tokens.
const MANAGED_TOKENS = ['colorBgContainer', 'colorBgLayout', 'fontFamily'];

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

  // Clear every managed key so antd computes its true default when we don't re-set it
  // below. We DELETE rather than restore from nativeToken: the live/default theme object
  // can itself be polluted by a prior setTheme (e.g. colorBgContainer left translucent),
  // so copying "native" would silently re-apply that pollution — which is exactly what
  // kept cards see-through after the 内容区卡片 switch was turned off. Non-managed base
  // keys (colorPrimary, colorBgHeader, …) pass through untouched.
  for (const k of MANAGED_TOKENS) delete token[k];
  void nativeToken; // kept for signature stability; no longer used for restore
  // Overlays (Modal/Drawer/Dropdown/Popover/…) always opaque.
  token.colorBgElevated = '#ffffff';

  if (app.enabled) {
    // colorBgLayout transparent so the page background shows through. Cards themselves stay
    // OPAQUE: colorBgContainer is a managed key, always cleared (reset-to-native) above and
    // never re-set here — content-card transparency is delegated to the NATIVE theme editor
    // now. Keeping colorBgContainer managed also cleanly reverts any translucent value an
    // existing user had persisted from the old 内容卡片 switch.
    token.colorBgLayout = 'transparent';
  }

  // NOTE: the top + side nav are NOT themed via tokens here. Their COLOR is owned by
  // the theme editor (colorBgHeader + menu text tokens pass through untouched); the
  // plugin only layers opacity + blur onto the actual nav elements via CSS
  // (generateStylesheet), using the theme's own color as the base.

  // Global font — a token so it penetrates isolated code-block roots. Independent
  // of the other sections. For an uploaded font the token references the quoted
  // family name; generateCss injects the matching @font-face (document-global, so
  // the token's font resolves everywhere including code-block roots).
  const font = app.font;
  if (font?.enabled) {
    if (font.source === 'upload' && font.upload?.url) {
      const name = sanitizeFontFamily(font.upload.name || '').replace(/["']/g, '');
      if (name) token.fontFamily = `"${name}"`;
    } else if (font.source !== 'upload') {
      const fam = sanitizeFontFamily(font.family || '');
      if (fam) token.fontFamily = fam;
    }
  }

  // 'Modern' is only the DEFAULT display name for a fresh record; applyTheme preserves
  // an admin's theme-editor rename on subsequent saves (never clobbers it back).
  return { name: 'Modern', token, components: { ...KEEP_OPAQUE_COMPONENTS }, cssVar: true };
}
