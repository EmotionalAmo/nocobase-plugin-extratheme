import React, { useEffect, useState } from 'react';
import { Button, Space, message, Spin } from 'antd';
import { useAPIClient, useGlobalTheme, defaultTheme } from '@nocobase/client';
import type { ExtraThemeConfig, AppConfig } from '../../shared/types';
import { mergeConfig, DEFAULT_APP } from '../../shared/defaults';
import { buildThemeConfig } from '../../shared/buildTheme';
import { fontFormatFromUrl, toSolidRgb } from '../../shared/color';
import { AppForm } from './controls';
import { LivePreview } from './LivePreview';
import { useT } from '../useT';

const CHANGE_EVENT = 'extra-theme:changed';
const THEME_UID = 'amo-extratheme';

// NOTE: the 登录页外观 (sign-in) tab is intentionally not exposed yet — the
// login config/injector plumbing stays in the codebase (dormant, default-off)
// for a future re-add. This page configures the 工作区外观 (/admin + /v) only.
export const SettingsPage: React.FC = () => {
  const t = useT();
  const api = useAPIClient();
  const { setTheme, theme } = useGlobalTheme();
  const [cfg, setCfg] = useState<ExtraThemeConfig>(() => mergeConfig({}));
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const res = await api.request({ url: 'extraTheme:getPublic', method: 'get' });
        const data = res?.data?.data ?? {};
        if (alive) setCfg(mergeConfig(data));
      } catch {
        /* keep defaults */
      } finally {
        if (alive) setLoading(false);
      }
    })();
    return () => {
      alive = false;
    };
  }, [api]);

  const uploadImage = async (file: File): Promise<string> => {
    try {
      const form = new FormData();
      form.append('file', file);
      const res = await api.request({ url: 'attachments:create', method: 'post', data: form });
      const url: string = res?.data?.data?.url || '';
      if (!url) throw new Error('no url');
      message.success(t('上传成功'));
      return url.startsWith('http') ? url : window.location.origin + url;
    } catch {
      message.error(t('上传失败'));
      return '';
    }
  };

  const uploadFont = async (file: File): Promise<{ url: string; name: string; format: string }> => {
    const empty = { url: '', name: '', format: '' };
    try {
      const form = new FormData();
      form.append('file', file);
      const res = await api.request({ url: 'attachments:create', method: 'post', data: form });
      let url: string = res?.data?.data?.url || '';
      if (!url) throw new Error('no url');
      if (!url.startsWith('http')) url = window.location.origin + url;
      // family name from the original filename (drop extension); format from the extension.
      const name = (file.name || 'Custom Font').replace(/\.[^.]+$/, '') || 'Custom Font';
      const format = fontFormatFromUrl(file.name || url);
      message.success(t('上传成功'));
      return { url, name, format };
    } catch {
      message.error(t('上传失败'));
      return empty;
    }
  };

  /**
   * Apply surface colors via the antd theme (penetrates isolated code-block roots):
   * persist ONE themeConfig record (default:true) + pin the current user to it, then
   * setTheme() for immediate apply this session. Reloads / other clients pick it up
   * via NocoBase's InitializeTheme. Silent if plugin-theme-editor is unavailable —
   * setTheme still gives an immediate in-session result.
   */
  const applyTheme = async (app: AppConfig) => {
    // base = the CURRENT theme's token (preserves the user's own customizations —
    // colorPrimary, colorSettings, …). native = pristine defaultTheme token — the
    // source of truth for chrome tokens that must survive when a section is off,
    // so "all off" reverts cleanly instead of inheriting a prior on-state.
    const base = (theme as any)?.token || (defaultTheme as any)?.token || {};
    const native = (defaultTheme as any)?.token || {};
    const built = buildThemeConfig(app, base, native);
    // finalConfig may adopt the existing record's display name so a theme-editor
    // rename (e.g. → "Modern") is NOT clobbered back on every plugin save.
    let finalConfig: any = built;
    try {
      const list = await api.resource('themeConfig').list({ filter: { uid: THEME_UID }, pageSize: 1 });
      const existing = list?.data?.data?.[0];
      let id = existing?.id;
      if (existing?.config?.name) finalConfig = { ...built, name: existing.config.name };
      if (existing) {
        await api.resource('themeConfig').update({ filterByTk: id, values: { config: finalConfig, default: true, optional: true } });
      } else {
        const created = await api.resource('themeConfig').create({
          values: { config: finalConfig, optional: true, isBuiltIn: false, uid: THEME_UID, default: true },
        });
        id = created?.data?.data?.id;
      }
      if (id != null) await api.resource('users').updateTheme({ values: { themeId: id } });
    } catch {
      /* theme-editor off / no perms — fall through to in-session setTheme */
    }
    try {
      setTheme?.(finalConfig as any);
    } catch {
      /* not inside GlobalThemeProvider (shouldn't happen in /admin) */
    }
  };

  const save = async () => {
    setSaving(true);
    try {
      // Capture the theme's OWN nav color (colorBgHeader) as the base for the nav
      // opacity/blur — the plugin no longer owns the nav color, it's theme-managed.
      // toSolidRgb drops any alpha so re-saving never double-fades.
      const navColor = toSolidRgb(
        (theme as any)?.token?.colorBgHeader || (defaultTheme as any)?.token?.colorBgHeader || '#001529',
      );
      const app = {
        ...cfg.app,
        header: { ...cfg.app.header, color: navColor },
        sider: { ...cfg.app.sider, color: navColor },
      };
      // 1) persist raw settings (drives the bg-image + nav opacity/blur CSS via getPublic)
      await api.request({ url: 'extraTheme:set', method: 'post', data: { scope: 'app', config: app } });
      // 2) apply surface colors via the antd theme (tokens reach code-blocks)
      await applyTheme(app);
      // 3) refresh the injected CSS (bg + nav opacity/blur) in this session
      window.dispatchEvent(new Event(CHANGE_EVENT));
      message.success(t('已保存并应用'));
    } catch {
      message.error(t('保存失败'));
    } finally {
      setSaving(false);
    }
  };

  const reset = () => setCfg({ ...cfg, app: JSON.parse(JSON.stringify(DEFAULT_APP)) });

  if (loading) {
    return (
      <div style={{ padding: 60, textAlign: 'center' }}>
        <Spin />
      </div>
    );
  }

  return (
    <div style={{ padding: 4, maxWidth: 1100 }}>
      {/* form: 工作区外观 / 顶部导航栏 / 侧边导航栏 as three horizontal columns */}
      <AppForm app={cfg.app} onChange={(app) => setCfg({ ...cfg, app })} uploadImage={uploadImage} uploadFont={uploadFont} />

      <Space style={{ marginTop: 20 }}>
        <Button type="primary" loading={saving} onClick={save}>
          {t('保存并应用')}
        </Button>
        <Button onClick={reset}>{t('重置本组')}</Button>
      </Space>

      {/* live preview below, full width */}
      <div style={{ marginTop: 24 }}>
        <div style={{ fontSize: 12, color: '#94a3b8', marginBottom: 8 }}>{t('实时预览')}</div>
        <LivePreview scope="app" app={cfg.app} login={cfg.login} />
        <div style={{ fontSize: 11, color: '#94a3b8', marginTop: 10, lineHeight: 1.6 }}>
          {t('提示：默认关闭，开启总开关并保存后才生效；关闭插件或关闭开关立即恢复原生外观。')}
        </div>
      </div>
    </div>
  );
};

export default SettingsPage;
