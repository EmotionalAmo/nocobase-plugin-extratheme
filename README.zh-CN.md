[English](./README.md) | **简体中文**

# ExtraTheme · 主题增强

> `@emotionalamo/plugin-extratheme` —— 面向 NocoBase 2.x 的全局主题增强插件。

在**原生主题编辑器(只能改 antd token)之外**扩展主题能力:自定义页面**背景**(图片上传 /
URL / 渐变预设 / 纯色,支持铺满 / 适应 / 拉伸 / 平铺)、表面**透明度**、**毛玻璃**
(`backdrop-filter`)、**顶部 / 侧边导航栏**透明度 + 模糊、**全局字体**(内置系统字体预设、
自定义 font-family、或**上传字体文件**——对所有访问者生效,无需本机安装)、以及仿 macOS 的
**滚动条**方式(始终显示 / 始终隐藏)。由管理员在一个设置页里全局配置,对两个客户端同时生效。

**默认关闭** —— 启用插件本身不改变任何外观,直到管理员打开某个分区并保存;把所有分区关闭即可干净地恢复原生外观。

---

## 安装

已发布到 npm:
[`@emotionalamo/plugin-extratheme`](https://www.npmjs.com/package/@emotionalamo/plugin-extratheme)。
需要 NocoBase **2.x**(以及随 NocoBase 内置的 **theme-editor** 插件,用于跨刷新持久化)。

在 NocoBase **插件管理器**里添加(`添加`→ 填 npm 包名
`@emotionalamo/plugin-extratheme`),或用命令行:

```bash
yarn pm add @emotionalamo/plugin-extratheme
yarn pm enable @emotionalamo/plugin-extratheme
```

---

## 作用范围

| 界面 | 是否美化 | 说明 |
|---|---|---|
| `/admin`(旧版客户端) | ✅ | 主工作区,设置界面在这里 |
| `/v`(新版客户端) | ✅ | 同一套主题,通过共享的主题记录桥接 |
| 登录页 | ⏸ 延后 | 通路已埋好(默认关),但暂无稳定选择器 |

设置页:**`/admin/settings/extra-theme`** → 三列 ——
**工作区外观**(背景 + 内容卡片透明度 + 滚动条)· **顶部导航栏 / 侧边导航栏**
(底色 + 透明度 + 模糊)· **全局字体** —— 每项都有**独立开关**,附带实时预览与整组重置。

---

## 原理(关键部分)

NocoBase 把每个自定义"代码块"业务页渲染在一个**隔离的嵌套 React 根**里,外层包着一个带
`transform` 的容器。注入到 `<body>` / `.ant-layout` 的裸 CSS **无法**穿透这个边界 —— 所以
表面颜色用 **antd 设计 token** 实现,NocoBase 会把它重新桥接进每个嵌套根,从而处处生效;
外层框架(导航、背景)则用 CSS 实现。

| 内容 | 机制 | 关键 |
|---|---|---|
| 卡片 / 表面色 | antd token | `colorBgContainer`(rgba,受"内容卡片"开关控制) |
| 页面主体 | antd token | `colorBgLayout: transparent`(让背景透出) |
| 浮层保持不透明 | antd token | `colorBgElevated: #fff`(Modal/Drawer/Dropdown 等) |
| 控件保持可读 | `components.<C>.colorBgContainer: #fff` | Input/Select/Table/DatePicker 等 |
| 全局字体 | antd token(+ body CSS) | `fontFamily`(上传字体额外注入文档级 `@font-face`) |
| 顶部 / 侧边导航 | **CSS** | 底色 + 透明度 + 毛玻璃,作用在真实的 header/sider 上;**菜单文字颜色仍由主题掌管** |
| 页面背景(图片 / 渐变 / 纯色) | **CSS**(作用于 `<body>`) | antd 无背景图 token;支持铺法与暗化 |
| 毛玻璃 | CSS | `backdrop-filter`(token 给透明度,CSS 给模糊) |
| 滚动条 | CSS | 常驻细滚动条 / 完全隐藏 |

生效方式(无 Provider):设置页 upsert **一条 `themeConfig` 记录**(来自 theme-editor 插件,
默认显示名 **"Modern"**),标记 `default: true`,把当前用户 pin 到它,并调用
`useGlobalTheme().setTheme()` 当场生效;刷新和其它客户端通过 theme-editor 的
`InitializeTheme` 接手。每次构建都会先**删除**插件所管的 token,所以"关闭"态绝不会继承上一次
"开启"态,且在主题编辑器里的重命名会被保留。

原始设置存在服务端集合 **`extraThemeSettings`**,由匿名的 `extraTheme:getPublic` 动作提供,
驱动注入的 `<style>`。`ThemeInjector` 把配置缓存在 `localStorage`,先从缓存渲染以避免闪烁。

**上传的背景图和字体以 base64 `data:` URI 内联**存进配置,**不**存成 NocoBase 附件地址。
附件地址因存储而异:私有 S3/MinIO/OSS 桶返回的是**预签名**临时链接,过期(约 1 小时)后
会 403,导致所有访问者的背景静默失效。内联方式对存储类型、桶私有性、换域名、迁移全免疫,
因此在任何人的环境里都能用。每个资源上限 **1 MB** —— 大图请压缩(WebP),中文字体请子集化
(woff2)。设置页还会检测旧配置里疑似"过期签名链接"的背景地址并提示重新上传。

---

## 安全

`extraTheme:getPublic` 是公共接口,但**只暴露外观配置**;所有写操作都需要
**`pm.extra-theme` 管理员 snippet**(`extraTheme:set` 与 `extraThemeSettings` 集合均已鉴权)。
由于编译出的样式表会下发给每一个访问者(包括匿名登录页),**所有进入 CSS 的配置值都在生成出口
处做了净化**:严格颜色白名单(`safeCssColor`)、URL 净化(`sanitizeCssUrl`)、数字强制转换
(`safeNum`)、字体族净化、以及 `@font-face format()` 白名单 —— 任何配置值都无法突破注入的声明。

---

## 目录结构

```
src/
  shared/            纯逻辑核心(与框架无关,已单测)
    types.ts         配置结构
    defaults.ts      DEFAULT_APP、渐变/字体预设、mergeConfig(深合并、不改原对象)
    color.ts         颜色/URL/数字净化器、hexToRgba、buildBackground
    buildTheme.ts    AppConfig -> antd ThemeConfig(上面的 token 映射)
    generateCss.ts   AppConfig -> 注入的 <style>(背景 + 导航 + 模糊 + 滚动条 + 字体)
    injector.ts      ThemeInjector:拉取 -> 缓存 -> 注入,两端共用
    selectors.ts     DOM 选择器
  server/
    collections/extraThemeSettings.ts
    resources/extraTheme.ts          getPublic(公共)+ set(snippet 鉴权)
    plugin.ts                        ACL + 安装播种(默认关闭)
  client/            旧版 /admin —— 注入器 + 设置界面(主)
  client-v2/         新版 /v —— 注入器镜像
  locale/            zh-CN + en-US
```

共享逻辑用 vitest TDD,位于 `src/shared/__tests__/`(100+ 用例,含安全用例)。

---

## 开发

框架无关的核心在 `src/shared/`,用 vitest 单测。用 NocoBase 工具链构建并跑共享测试:

```bash
yarn build @emotionalamo/plugin-extratheme
yarn vitest run src/shared/__tests__
```

在你的 NocoBase 应用里注册并启用(非 `@nocobase` 作用域不会按前缀自动发现,新集合需要一次性同步):

```bash
yarn pm add @emotionalamo/plugin-extratheme
yarn pm enable @emotionalamo/plugin-extratheme
yarn nocobase db:sync
```

---

## 已知限制

- JS 代码块 HTML 里**作者写死的内联样式**(如 `style="background:#fff"`)无法被 token 或
  CSS 覆盖 —— 那是块作者的标记,不属于框架外观。
- **登录页**暂不可主题化(无稳定结构选择器),配置/注入通路已存在但默认关闭。
- **导航栏底色由插件设置**(NocoBase 主题编辑器不暴露 `colorBgHeader` token),插件只在其上
  叠加透明度 + 模糊。
- 跨刷新持久化依赖 **theme-editor** 插件(即那条 `themeConfig` 记录);没有它时 `setTheme`
  仍能当场生效。

---

## 许可证

AGPL-3.0
