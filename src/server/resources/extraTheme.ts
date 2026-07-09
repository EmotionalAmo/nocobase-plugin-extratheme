/**
 * `extraTheme` — a collection-less resource with two actions:
 *   - getPublic  (anonymous, see ACL in plugin.ts) → the raw stored config for
 *     both scopes: `{ app, login }` (null when not yet saved). The client fills
 *     defaults via shared `mergeConfig`, so this stays free of shared imports
 *     (the NocoBase server build only compiles src/server/**).
 *   - set        (admin, gated by the `pm.extra-theme` snippet) → upsert one
 *     scope's config. body: { scope: 'app' | 'login', config: {...} }.
 *     NB: a CUSTOM action name (not the built-in `update`) so the resourcer
 *     routes to this handler instead of the reserved built-in update action.
 */
import { Context, Next } from '@nocobase/actions';

const SCOPES = ['app', 'login'];

export default {
  name: 'extraTheme',
  actions: {
    getPublic: {
      handler: async (ctx: Context, next: Next) => {
        const repo = ctx.db.getRepository('extraThemeSettings');
        const rows = await repo.find();
        const out: any = { app: null, login: null };
        for (const r of rows) {
          const key = r.get('key');
          if (key === 'app' || key === 'login') out[key] = r.get('config') ?? null;
        }
        ctx.body = out;
        await next();
      },
    },
    set: {
      handler: async (ctx: Context, next: Next) => {
        const values: any = ctx.action?.params?.values || {};
        const { scope, config } = values;
        if (!SCOPES.includes(scope)) return ctx.throw(400, 'invalid scope');
        if (config == null || typeof config !== 'object') return ctx.throw(400, 'invalid config');
        const repo = ctx.db.getRepository('extraThemeSettings');
        const existing = await repo.findOne({ filter: { key: scope } });
        if (existing) await repo.update({ filter: { key: scope }, values: { config } });
        else await repo.create({ values: { key: scope, config } });
        ctx.body = { ok: true };
        await next();
      },
    },
  },
};
