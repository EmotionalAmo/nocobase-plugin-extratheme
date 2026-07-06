import { Plugin } from '@nocobase/client';
import zhCN from '../locale/zh-CN.json';
import enUS from '../locale/en-US.json';
import { ThemeInjector } from '../shared/injector';
import { LEGACY_SELECTORS } from './selectors';
import { SettingsPage } from './settings/SettingsPage';

const NS = '@amo/plugin-extratheme';

export class PluginExtraThemeClient extends Plugin {
  async load() {
    this.app.i18n.addResources('zh-CN', NS, zhCN);
    this.app.i18n.addResources('en-US', NS, enUS);

    // Inject theme CSS for /admin (+ legacy sign-in). Pure DOM, no Provider.
    const injector = new ThemeInjector((opts) => this.app.apiClient.request(opts), LEGACY_SELECTORS);
    injector.start();

    // Settings page at /admin/settings/extra-theme (admins carry pm.*).
    this.app.addComponents({ ExtraThemeSettings: SettingsPage });
    this.app.pluginSettingsManager.add('extra-theme', {
      title: this.app.i18n.t('主题增强', { ns: NS }),
      icon: 'BgColorsOutlined',
      Component: 'ExtraThemeSettings',
      aclSnippet: 'pm.extra-theme',
      sort: 500,
    });
  }
}

export default PluginExtraThemeClient;
