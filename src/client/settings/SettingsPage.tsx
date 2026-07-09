import React, { useEffect, useState } from 'react';
import { Button, Space, message, Spin } from 'antd';
import { useAPIClient, useGlobalTheme, defaultTheme } from '@nocobase/client';
import type { ExtraThemeConfig, AppConfig } from '../../shared/types';
import { mergeConfig, DEFAULT_APP } from '../../shared/defaults';
import { buildThemeConfig } from '../../shared/buildTheme';
import { fontFormatFromUrl, mimeFromFilename } from '../../shared/color';
import { AppForm } from './controls';
import { LivePreview } from './LivePreview';
import { useT } from '../useT';

const CHANGE_EVENT = 'extra-theme:changed';
const THEME_UID = 'amo-extratheme';

// Uploaded background images / fonts are stored INLINE as base64 `data:` URIs in the
// config — never as a NocoBase attachment URL. Attachment URLs are per-storage: a private
// S3/MinIO/OSS bucket hands back a short-lived *presigned* link that 403s after its TTL
// (≈1h), silently breaking the background for every visitor. Inlining is immune to storage
// type, bucket privacy, domain/origin changes, and storage migration — so the plugin works
// on any installer's setup. Capped, since the config is served to the anonymous sign-in
// page and cached in localStorage.
const MAX_ASSET_BYTES = 1024 * 1024; // 1 MB hard cap
const WARN_ASSET_BYTES = 400 * 1024; // 400 KB soft warning

/** Read a File into a `data:<mime>;base64,…` URI with a guaranteed-valid MIME (`File.type`
 * is often empty for fonts, so fall back to the extension). Browser-only (FileReader). */
function fileToDataUri(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(reader.error || new Error('read failed'));
    reader.onload = () => {
      const raw = String(reader.result || '');
      const comma = raw.indexOf(',');
      const b64 = comma >= 0 ? raw.slice(comma + 1) : '';
      if (!b64) return reject(new Error('empty'));
      const mime = file.type || mimeFromFilename(file.name) || 'application/octet-stream';
      resolve(`data:${mime};base64,${b64}`);
    };
    reader.readAsDataURL(file);
  });
}

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
      if (file.size > MAX_ASSET_BYTES) {
        message.error(t('图片过大，上限 1MB。背景图会内联进主题配置，请压缩后再上传（推荐 WebP，≤400KB）。'));
        return '';
      }
      const uri = await fileToDataUri(file);
      if (file.size > WARN_ASSET_BYTES) message.warning(t('图片较大，已内联进配置；建议压缩到 400KB 以内。'));
      message.success(t('已内联，不依赖存储、永不过期'));
      return uri;
    } catch {
      message.error(t('上传失败'));
      return '';
    }
  };

  const uploadFont = async (file: File): Promise<{ url: string; name: string; format: string }> => {
    const empty = { url: '', name: '', format: '' };
    try {
      if (file.size > MAX_ASSET_BYTES) {
        message.error(t('字体文件过大，上限 1MB。字体会内联进主题配置，请使用子集化后的 woff2。'));
        return empty;
      }
      const uri = await fileToDataUri(file);
      // family name from the original filename (drop extension); format from the extension.
      // Derive format from the ORIGINAL filename BEFORE encoding — a data: URI has no
      // extension for fontFormatFromUrl to read, so it must come from file.name.
      const name = (file.name || 'Custom Font').replace(/\.[^.]+$/, '') || 'Custom Font';
      const format = fontFormatFromUrl(file.name);
      message.success(t('已内联，不依赖存储、永不过期'));
      return { url: uri, name, format };
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
      // 1) persist raw settings (drives the bg-image + nav color/opacity/blur CSS via getPublic)
      await api.request({ url: 'extraTheme:set', method: 'post', data: { scope: 'app', config: cfg.app } });
      // 2) apply surface colors via the antd theme (tokens reach code-blocks)
      await applyTheme(cfg.app);
      // 3) refresh the injected CSS (bg + nav color/opacity/blur) in this session
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
    <div style={{ padding: 4, width: '100%' }}>
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
