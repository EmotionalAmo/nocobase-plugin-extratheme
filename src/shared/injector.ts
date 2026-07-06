/**
 * ThemeInjector — pure-DOM CSS injector shared by both client lanes (legacy
 * `src/client` and modern `src/client-v2`). It fetches the public config,
 * compiles it to CSS via the shared `generateStylesheet`, and writes a single
 * controlled <style> into <head>, plus toggles body marker classes. It caches
 * the last config in localStorage so the (unauthenticated) sign-in page and
 * first paint apply instantly, then revalidates.
 *
 * Uses only browser globals (document/window/localStorage) — the NocoBase
 * server build never imports this file, so it stays out of the server bundle.
 */
import { generateStylesheet } from './generateCss';
import { mergeConfig } from './defaults';
import type { Selectors, ExtraThemeConfig } from './types';

const STYLE_ID = 'extra-theme-style';
const CACHE_KEY = 'EXTRA_THEME_CACHE';
export const CHANGE_EVENT = 'extra-theme:changed';

type ApiRequest = (opts: any) => Promise<any>;

export class ThemeInjector {
  constructor(private request: ApiRequest, private selectors: Selectors) {}

  /** Paint from cache immediately, then fetch fresh config, then listen for saves. */
  start(): void {
    try {
      const cached = localStorage.getItem(CACHE_KEY);
      if (cached) this.apply(mergeConfig(JSON.parse(cached)));
    } catch {
      /* ignore bad cache */
    }
    this.refresh();
    window.addEventListener(CHANGE_EVENT, () => this.refresh());
  }

  /** Fetch the public config, cache it, and apply. Silent on failure (keep cache / native). */
  async refresh(): Promise<void> {
    try {
      const res = await this.request({ url: 'extraTheme:getPublic', method: 'get' });
      const data = res?.data?.data ?? res?.data ?? {};
      const cfg = mergeConfig(data);
      try {
        localStorage.setItem(CACHE_KEY, JSON.stringify(cfg));
      } catch {
        /* storage full / disabled */
      }
      this.apply(cfg);
    } catch {
      /* offline / unauthorized edge — keep whatever is applied */
    }
  }

  /** Toggle body markers + (re)write the single injected <style>. */
  apply(cfg: ExtraThemeConfig): void {
    const body = document.body;
    if (!body) return;
    body.classList.toggle('extra-theme-app-on', !!cfg.app?.enabled);
    body.classList.toggle('extra-theme-login-on', !!cfg.login?.enabled);
    let el = document.getElementById(STYLE_ID) as HTMLStyleElement | null;
    if (!el) {
      el = document.createElement('style');
      el.id = STYLE_ID;
      document.head.appendChild(el);
    }
    el.textContent = generateStylesheet(cfg, this.selectors);
  }
}
