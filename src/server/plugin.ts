import { Plugin } from '@nocobase/server';
import extraTheme from './resources/extraTheme';

/** Snippet that gates who may write the theme config (admins carry `pm.*`). */
const SNIPPET = 'pm.extra-theme';

export class PluginExtraThemeServer extends Plugin {
  async load() {
    // Collection `extraThemeSettings` is auto-loaded from ./collections.
    this.app.resourceManager.define(extraTheme);

    // getPublic is anonymous — the sign-in page (unauthenticated) reads it.
    this.app.acl.allow('extraTheme', 'getPublic', 'public');

    // set is default-denied; grant it only through the settings snippet.
    this.app.acl.registerSnippet({ name: SNIPPET, actions: ['extraTheme:set'] });
  }

  async install() {
    // Seed both scopes disabled → enabling the plugin does not change the look.
    const repo = this.db.getRepository('extraThemeSettings');
    for (const key of ['app', 'login']) {
      const found = await repo.findOne({ filter: { key } });
      if (!found) await repo.create({ values: { key, config: { enabled: false } } });
    }
  }
}

export default PluginExtraThemeServer;
