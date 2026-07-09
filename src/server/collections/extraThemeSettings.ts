/**
 * `extraThemeSettings` — the global singleton config store for ExtraTheme.
 * Exactly two rows: key='app' (工作区外观, /admin + /v) and key='login'
 * (登录页外观). `config` holds the whole group's JSON.
 *
 * Accessed only via the custom `extraTheme` resource (getPublic/update) —
 * never exposed as a business/block collection, so no uiSchema/dataCategory.
 */
import { defineCollection } from '@nocobase/database';

export default defineCollection({
  name: 'extraThemeSettings',
  fields: [
    { type: 'string', name: 'key', unique: true },
    { type: 'json', name: 'config' },
  ],
});
