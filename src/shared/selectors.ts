import type { Selectors } from './types';

/**
 * DOM anchors pinned against the live NocoBase 2.1.19 pro-layout DOM. Verified
 * to be IDENTICAL for the legacy `/admin` client and the modern `/v` client —
 * both render the same `@ant-design/pro-layout` chrome (only the content engine
 * differs), so one selector set drives both lanes.
 *
 *   .ant-layout                         → layout root (background)
 *   .ant-layout-header                  → top nav bar (2 exist; both frost)
 *   .ant-layout-sider                   → left sider (settings / data sub-menu / side-mode)
 *   .ant-card                           → content block containers
 *   pro-layout-content/-container + nb-subpages-slot* → transparent so bg shows through
 *
 * Login anchors are placeholders; pinned for real in Task 10 against the
 * sign-in DOM (legacy `/signin` + modern `/v/signin`).
 */
export const DEFAULT_SELECTORS: Selectors = {
  app: {
    appRoot: '.ant-layout',
    header: '.ant-layout-header',
    sider: '.ant-layout-sider',
    card: '.ant-card',
    content:
      '.ant-pro-layout-content,.ant-pro-layout-container,.ant-layout-content,[class*="nb-subpages-slot"],[class*="nb-subpages-slot"]>div',
  },
  login: {
    loginRoot: '.ant-layout',
    loginCard: '.ant-card',
  },
};
