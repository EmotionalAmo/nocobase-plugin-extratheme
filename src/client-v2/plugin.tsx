import { Plugin } from '@nocobase/client-v2';
import { ThemeInjector } from '../shared/injector';
import { MODERN_SELECTORS } from './selectors';

/**
 * getPublic is anonymous, so a plain fetch works in the modern client (and on
 * /v/signin, unauthenticated) without needing the FlowEngine api. Shaped as
 * `{ data }` so ThemeInjector reads `res.data.data`.
 */
async function fetchPublic() {
  const r = await fetch('/api/extraTheme:getPublic', { headers: { Accept: 'application/json' } });
  return { data: await r.json() };
}

export class PluginExtraThemeClientV2 extends Plugin {
  async load() {
    // Inject theme CSS for /v (+ modern sign-in). Pure DOM, no Provider.
    new ThemeInjector(fetchPublic, MODERN_SELECTORS).start();
  }
}

export default PluginExtraThemeClientV2;
