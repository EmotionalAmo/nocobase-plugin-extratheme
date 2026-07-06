# ExtraTheme · 主题增强

> `@amo/plugin-extratheme` — a global theme-enhancement plugin for NocoBase 2.x.

Extends theming **beyond the native theme editor** (which only exposes antd tokens):
custom page **background** (image upload / URL / gradient presets / solid color),
surface **transparency**, **frosted-glass** (`backdrop-filter`), **top / side
navigation** tint + blur, and a **global font** — a curated system-font preset, a
custom font-family stack, or an **uploaded font file** (works for every viewer, no
local install). Configured globally by an admin in one settings page and applied across
both clients.

**Disabled by default** — enabling the plugin changes nothing until an admin turns a
section on and saves. Turning every section off cleanly restores the native look.

---

## Scope

| Surface | Themed | Notes |
|---|---|---|
| `/admin` (legacy client) | ✅ | Primary workspace. Settings UI lives here. |
| `/v` (modern client) | ✅ | Same theme, bridged via the shared theme record. |
| Sign-in page | ⏸ Deferred | Plumbing is dormant (default-off); no stable selectors yet. |

Settings page: **`/admin/settings/extra-theme`** → four sections
(工作区外观 · 顶部导航栏 · 侧边导航栏 · 全局字体), each with an **independent** on/off
switch, plus a live preview and a whole-config reset.

---

## How it works (the important part)

NocoBase renders each custom "code-block" business page inside an **isolated nested
React root** wrapped in a `transform`ed container. Raw CSS injected at `<body>` /
`.ant-layout` **cannot** paint through that boundary — so surface colors are **not**
done with CSS here. They are done with **antd design tokens**, which NocoBase
re-bridges into every nested root, so they penetrate everywhere.

| What | Mechanism | Key |
|---|---|---|
| Card / surface color | antd token | `colorBgContainer` (rgba) |
| Page body | antd token | `colorBgLayout: transparent` (lets the bg show) |
| Top nav color | antd token | `colorBgHeader` (NocoBase custom token) |
| Global font | antd token (+ CSS) | `fontFamily`; also `body{font-family}` since it inherits through the boundary |
| Uploaded font | CSS `@font-face` (+ token) | file → `attachments:create` → document-global `@font-face`, applied via the token so every viewer loads it (storage serves fonts with the right CORS header) |
| Overlays stay opaque | antd token | `colorBgElevated: #fff` (Modal/Drawer/Dropdown/…) |
| Controls stay readable | `components.<C>.colorBgContainer: #fff` | Input/Select/Table/DatePicker/… |
| **Side nav** | **CSS** | Full-width `.ant-layout-sider-children` tint — a token only hits the inset menu and leaves a seam |
| Page background image/gradient | CSS on `<body>` | antd has no bg-image token |
| Frosted blur | CSS | `backdrop-filter` (token gives alpha, CSS gives blur) |

Apply path (Provider-free): the settings page upserts **one `themeConfig` record**
(from the theme-editor plugin) marked `default: true`, pins the current user to it, and
calls `useGlobalTheme().setTheme()` for an immediate in-session result. Reloads and
other clients pick it up through the theme-editor's `InitializeTheme`. Each build
resets every managed token to native first, so an "off" state never inherits a prior
"on" state.

The raw settings (background image, blur radii, sider tint, on/off flags) are stored
server-side in the **`extraThemeSettings`** collection and served by the anonymous
`extraTheme:getPublic` action, which drives the injected `<style>` (background + blur +
sider). `ThemeInjector` caches the config in `localStorage` and paints from cache first
to avoid a flash.

---

## Architecture

```
src/
  shared/            pure, unit-tested core (framework-agnostic)
    types.ts         config shapes
    defaults.ts      DEFAULT_APP, gradient presets, mergeConfig (deep, non-mutating)
    color.ts         hexToRgba, buildBackground
    buildTheme.ts    AppConfig -> antd ThemeConfig (the token map above)
    generateCss.ts   AppConfig -> the thin <style> (bg + blur + sider)
    injector.ts      ThemeInjector: fetch -> cache -> inject, shared by both clients
    selectors.ts     DOM selectors
  server/
    collections/extraThemeSettings.ts
    resources/extraTheme.ts          getPublic (public) + set (snippet-gated)
    plugin.ts                        ACL + install seed (both scopes disabled)
  client/            legacy /admin — injector + the settings UI (primary)
  client-v2/         modern /v — injector mirror
  locale/            zh-CN + en-US
```

Shared logic is TDD'd with vitest under `src/shared/__tests__/`.

---

## Develop & deploy

```bash
# from the monorepo root (~/Developer/nocobase-plugin-dev)
yarn build @amo/plugin-extratheme

# ship into the running dev container (copy dist over the bind mount + restart)
bash packages/plugins/@amo/plugin-extratheme/deploy.sh
```

Run the shared tests (the NocoBase vitest config only auto-discovers
`src/client**/__tests__`, so point it at the shared files explicitly, from the root):

```bash
yarn vitest run packages/plugins/@amo/plugin-extratheme/src/shared/__tests__
```

First-time registration in the container (the `@amo` scope is not auto-discovered by
prefix, and the new collection needs a sync):

```bash
docker exec nb-dev-app sh -lc 'cd /app/nocobase && \
  npx nocobase pm add @amo/plugin-extratheme && \
  npx nocobase pm enable @amo/plugin-extratheme && \
  yarn nocobase db:sync'
```

### GitLab sync

The plugin is developed inside the `nocobase-plugin-dev` monorepo and mirrored to its
own repo via `git subtree` (one-time remote add, then re-run push after each release):

```bash
git remote add extratheme-gitlab ssh://git@192.168.100.15:2222/EmotionalAmo/plugin-moretheme.git
git subtree push --prefix=packages/plugins/@amo/plugin-extratheme extratheme-gitlab main
```

---

## Known limits

- **Author-written inline styles** in a JS-block's HTML (e.g. a hardcoded
  `style="background:#fff"`) can't be overridden by tokens or CSS — that's the block
  author's markup, not chrome.
- The **sign-in page** is not yet themable (no stable structural selectors; emotion
  hashes only). The config/injector path exists but is default-off.
- Requires the **theme-editor** plugin for cross-reload persistence (the `themeConfig`
  record). Without it, `setTheme` still gives an immediate in-session result.
