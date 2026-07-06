import type { Selectors } from '../shared/types';

/**
 * DOM anchors for the legacy `/admin` client, pinned against the live 2.1.19
 * pro-layout DOM (top-nav horizontal-menu mode):
 *   .ant-layout                              → layout root (background)
 *   .ant-layout-header                       → top nav bar (2 exist; both frost)
 *   .ant-layout-sider                        → left sider (settings / data-page sub-menu / side-mode)
 *   .ant-card                                → content block containers
 *   .ant-pro-layout-content/-container       → made transparent so bg shows through
 * Login anchors are placeholders here; pinned for real in Task 10 (sign-in DOM).
 */
export const LEGACY_SELECTORS: Selectors = {
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
