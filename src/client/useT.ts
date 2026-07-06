/**
 * i18n hook for the legacy settings UI. Same strategy as plugin-portal: the
 * Chinese copy IS the translation key, so `zh-CN.json` can be identity (or
 * empty — i18next falls back to the key, which is the correct Chinese text),
 * and `en-US.json` maps each key to English. `react-i18next` is externalized
 * by @nocobase/build so this resolves to the host's shared i18n instance.
 */
import { useTranslation } from 'react-i18next';

const NS = '@amo/plugin-extratheme';

export function useT() {
  const { t } = useTranslation([NS, 'client']);
  return (key: string, options?: Record<string, any>) => t(key, { ns: NS, ...options } as any);
}

export default useT;
