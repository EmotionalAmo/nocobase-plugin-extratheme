import { Plugin } from '@nocobase/client';
import zhCN from '../locale/zh-CN.json';
import enUS from '../locale/en-US.json';
import { ThemeInjector } from '../shared/injector';
import { LEGACY_SELECTORS } from './selectors';

const NS = '@amo/plugin-extratheme';

export class PluginExtraThemeClient extends Plugin {
  async load() {
    this.app.i18n.addResources('zh-CN', NS, zhCN);
    this.app.i18n.addResources('en-US', NS, enUS);

    // Inject theme CSS for /admin (+ legacy sign-in). Pure DOM, no Provider.
    const injector = new ThemeInjector((opts) => this.app.apiClient.request(opts), LEGACY_SELECTORS);
    injector.start();

    // Settings page registered in Task 8.
  }
}

export default PluginExtraThemeClient;
