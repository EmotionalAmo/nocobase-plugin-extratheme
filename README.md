**English** | [简体中文](./README.zh-CN.md)

# ExtraTheme · 主题增强

> `@emotionalamo/plugin-extratheme` — a global theme-enhancement plugin for NocoBase 2.x.

Extends theming **beyond the native theme editor** (which only exposes antd tokens):
custom page **background** (image upload / URL / gradient presets / solid color, with
cover / contain / stretch / tile fit), surface **transparency**, **frosted-glass**
(`backdrop-filter`), **top / side navigation** opacity + blur, a **global font** (curated
system-font preset, custom font-family stack, or an **uploaded font file** that works for
every viewer with no local install), and a macOS-style **scrollbar** mode (always-show /
always-hide). Configured globally by an admin in one settings page and applied across
both clients.

**Disabled by default** — enabling the plugin changes nothing until an admin turns a
section on and saves. Turning every section off cleanly restores the native look.

---

## Install

Published on npm as
[`@emotionalamo/plugin-extratheme`](https://www.npmjs.com/package/@emotionalamo/plugin-extratheme).
Requires NocoBase **2.x** (and the bundled **theme-editor** plugin for cross-reload
persistence).

Add it from the NocoBase **Plugin manager** (`Add new` → npm package name
`@emotionalamo/plugin-extratheme`), or from the CLI:

```bash
yarn pm add @emotionalamo/plugin-extratheme
yarn pm enable @emotionalamo/plugin-extratheme
```

---

## Scope

| Surface | Themed | Notes |
|---|---|---|
| `/admin` (legacy client) | ✅ | Primary workspace. Settings UI lives here. |
| `/v` (modern client) | ✅ | Same theme, bridged via the shared theme record. |
| Sign-in page | ⏸ Deferred | Plumbing is dormant (default-off); no stable selectors yet. |

Settings page: **`/admin/settings/extra-theme`** → three columns —
**工作区外观** (background + content-card transparency + scrollbar) · **顶部导航栏 / 侧边导航栏**
(base color + opacity + blur) · **全局字体** — each an **independent** on/off switch, with a
live preview and a whole-config reset.

---

## How it works (the important part)

NocoBase renders each custom "code-block" business page inside an **isolated nested React
root** wrapped in a `transform`ed container. Raw CSS injected at `<body>` / `.ant-layout`
**cannot** paint through that boundary — so surface colors are done with **antd design
tokens**, which NocoBase re-bridges into every nested root, so they penetrate everywhere.
Outer chrome (nav, background) is done with CSS.

| What | Mechanism | Key |
|---|---|---|
| Card / surface color | antd token | `colorBgContainer` (rgba, gated on the content-card switch) |
| Page body | antd token | `colorBgLayout: transparent` (lets the background show) |
| Overlays stay opaque | antd token | `colorBgElevated: #fff` (Modal/Drawer/Dropdown/…) |
| Controls stay readable | `components.<C>.colorBgContainer: #fff` | Input/Select/Table/DatePicker/… |
| Global font | antd token (+ body CSS) | `fontFamily` (uploaded fonts add a document-global `@font-face`) |
| Top / side nav | **CSS** | base color + opacity + frosted blur on the real header/sider; **menu text color stays theme-owned** |
| Page background (image / gradient / color) | **CSS** on `<body>` | antd has no bg-image token; supports fit modes + dim |
| Frosted blur | CSS | `backdrop-filter` (token gives the alpha, CSS gives the blur) |
| Scrollbar | CSS | always-visible slim bar / fully hidden |

Apply path (Provider-free): the settings page upserts **one `themeConfig` record**
(from the theme-editor plugin, default display name **"Modern"**) marked `default: true`,
pins the current user to it, and calls `useGlobalTheme().setTheme()` for an immediate
in-session result. Reloads and other clients pick it up via the theme-editor's
`InitializeTheme`. Every build deletes the plugin's managed tokens first, so an "off"
state never inherits a prior "on" state, and a theme-editor rename is preserved.

The raw settings are stored server-side in the **`extraThemeSettings`** collection and
served by the anonymous `extraTheme:getPublic` action, which drives the injected
`<style>`. `ThemeInjector` caches the config in `localStorage` and paints from cache
first to avoid a flash.

**Uploaded background images and fonts are inlined** as base64 `data:` URIs in the
config — never stored as a NocoBase attachment URL. Attachment URLs are per-storage: a
private S3/MinIO/OSS bucket hands back a short-lived **presigned** link that 403s after
its TTL (≈1h), which would silently break the background for every visitor. Inlining is
immune to storage type, bucket privacy, domain changes, and migration, so the plugin
works on any installer's setup. Each asset is capped at **1 MB** — optimize large images
(WebP) and subset CJK fonts (woff2). The settings page also flags a legacy config whose
background URL still looks like an expiring signed link, prompting a re-upload.

---

## Security

The `extraTheme:getPublic` action is public but exposes **appearance config only**; every
write requires the **`pm.extra-theme` admin snippet** (`extraTheme:set` and the
`extraThemeSettings` collection are auth-gated). Because the compiled stylesheet is served
to every visitor including the anonymous sign-in page, **all config values that reach the
CSS are sanitized at the generation sink**: a strict color allow-list (`safeCssColor`),
URL sanitizer (`sanitizeCssUrl`), numeric coercion (`safeNum`), font-family sanitizer, and
an `@font-face format()` allow-list — so a config value can never break out of the
injected declaration.

---

## Architecture

```
src/
  shared/            pure, unit-tested core (framework-agnostic)
    types.ts         config shapes
    defaults.ts      DEFAULT_APP, gradient/font presets, mergeConfig (deep, non-mutating)
    color.ts         color/url/number sanitizers, hexToRgba, buildBackground
    buildTheme.ts    AppConfig -> antd ThemeConfig (the token map above)
    generateCss.ts   AppConfig -> the injected <style> (bg + nav + blur + scrollbar + font)
    injector.ts      ThemeInjector: fetch -> cache -> inject, shared by both clients
    selectors.ts     DOM selectors
  server/
    collections/extraThemeSettings.ts
    resources/extraTheme.ts          getPublic (public) + set (snippet-gated)
    plugin.ts                        ACL + install seed (disabled by default)
  client/            legacy /admin — injector + the settings UI (primary)
  client-v2/         modern /v — injector mirror
  locale/            zh-CN + en-US
```

Shared logic is TDD'd with vitest under `src/shared/__tests__/` (100+ cases, incl. security).

---

## Develop

The framework-agnostic core lives in `src/shared/` and is unit-tested with vitest.
Build with the NocoBase toolchain and run the shared tests:

```bash
yarn build @emotionalamo/plugin-extratheme
yarn vitest run src/shared/__tests__
```

Register + enable it in your NocoBase app (a non-`@nocobase` scope isn't auto-discovered
by prefix, and the new collection needs a one-time DB sync):

```bash
yarn pm add @emotionalamo/plugin-extratheme
yarn pm enable @emotionalamo/plugin-extratheme
yarn nocobase db:sync
```

---

## Known limits

- **Author-written inline styles** in a JS-block's HTML (e.g. a hardcoded
  `style="background:#fff"`) can't be overridden by tokens or CSS — that's the block
  author's markup, not chrome.
- The **sign-in page** is not yet themable (no stable structural selectors). The
  config/injector path exists but is default-off.
- The **nav bar color** is set in the plugin (NocoBase's theme editor does not expose the
  `colorBgHeader` token); the plugin only layers opacity + blur on top of it.
- Requires the **theme-editor** plugin for cross-reload persistence (the `themeConfig`
  record). Without it, `setTheme` still gives an immediate in-session result.

---

## License

AGPL-3.0
