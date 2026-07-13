/**
 * ExtraTheme config types — shared by server (defaults/seed), legacy client and
 * modern client-v2. Two logical config groups: `app` (工作区外观, applies to
 * /admin + /v) and `login` (登录页外观, independent). Everything is a plain
 * JSON-serialisable object so it round-trips through the `extraThemeSettings`
 * collection and the public `extraTheme:getPublic` action.
 */

export type BgType = 'none' | 'color' | 'gradient' | 'image';
export type NavStyle = 'solid' | 'frosted';
export type TextTone = 'dark' | 'light';
export type BgFit = 'cover' | 'contain' | 'stretch' | 'repeat';

export interface BackgroundConfig {
  type: BgType;
  color: string;
  gradient: { preset: string; angle: number; colors: string[] };
  image: { url: string; fit: BgFit; position: string };
  dim: number; // 暗化遮罩 0–80 (%)
}

export interface CardConfig {
  glass: boolean;
  opacity: number; // 10–100 (%)
  blur: number; // 0–40 (px)
  border: boolean;
}

export interface NavConfig {
  enabled: boolean; // this nav's styling on/off, independent of the other nav
  style: NavStyle;
  color: string;
  opacity: number; // 0–100 (%)
  blur: number; // 0–40 (px)
  text: TextTone;
}

export interface FontUpload {
  url: string; // uploaded font file URL ('' = none)
  name: string; // family name (derived from filename) used in @font-face + font-family
  format: string; // @font-face src format: woff2 | woff | truetype | opentype ('' = omit)
}

export interface FontConfig {
  enabled: boolean; // global font override on/off, independent of the other sections
  source: 'system' | 'upload'; // system font stack vs. an uploaded font file
  family: string; // CSS font-family stack (system source); '' = system default (no override)
  upload: FontUpload; // uploaded font (upload source)
}

export type ScrollbarMode = 'always' | 'hidden';
export interface ScrollbarConfig {
  enabled: boolean; // off = leave scrollbars native (independent of the other sections)
  mode: ScrollbarMode; // 'always' = slim always-visible bar; 'hidden' = no scrollbar (content still scrolls)
}

export interface HideConfig {
  enabled: boolean; // hide matching elements on/off (independent of the other sections)
  // A CSS selector LIST (comma-separated) whose matches get `display:none`. Used to hide
  // e.g. the global AI entry. Kept user-editable on purpose: the AI entry's class is an
  // emotion hash (`.css-…`) that changes across NocoBase builds, so it must be fixable
  // without a plugin release.
  selector: string;
}

export interface AppConfig {
  enabled: boolean;
  background: BackgroundConfig;
  card: CardConfig;
  header: NavConfig;
  sider: NavConfig;
  font: FontConfig;
  scrollbar: ScrollbarConfig;
  hide: HideConfig;
}

export interface LoginCard {
  glass: boolean;
  opacity: number; // 10–100 (%)
  blur: number; // 0–40 (px)
  radius: number; // 0–32 (px)
  shadow: boolean;
}

export interface LoginConfig {
  enabled: boolean;
  background: BackgroundConfig;
  card: LoginCard;
}

export interface ExtraThemeConfig {
  app: AppConfig;
  login: LoginConfig;
}

/** DOM anchors — each client lane passes its own (pinned against the live DOM). */
export interface AppSelectors {
  appRoot: string;
  header: string;
  sider: string;
  card: string;
  content: string;
}
export interface LoginSelectors {
  loginRoot: string;
  loginCard: string;
}
export interface Selectors {
  app: AppSelectors;
  login: LoginSelectors;
}
