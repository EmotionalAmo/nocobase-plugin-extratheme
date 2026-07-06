import React, { useEffect, useState } from 'react';
import { Tabs, Button, Space, message, Spin } from 'antd';
import { useAPIClient } from '@nocobase/client';
import type { ExtraThemeConfig } from '../../shared/types';
import { mergeConfig, DEFAULT_APP, DEFAULT_LOGIN } from '../../shared/defaults';
import { AppForm, LoginForm } from './controls';
import { LivePreview } from './LivePreview';
import { useT } from '../useT';

const CHANGE_EVENT = 'extra-theme:changed';

export const SettingsPage: React.FC = () => {
  const t = useT();
  const api = useAPIClient();
  const [cfg, setCfg] = useState<ExtraThemeConfig>(() => mergeConfig({}));
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [tab, setTab] = useState<'app' | 'login'>('app');

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

  const save = async () => {
    setSaving(true);
    try {
      await api.request({ url: 'extraTheme:set', method: 'post', data: { scope: 'app', config: cfg.app } });
      await api.request({ url: 'extraTheme:set', method: 'post', data: { scope: 'login', config: cfg.login } });
      window.dispatchEvent(new Event(CHANGE_EVENT));
      message.success(t('已保存并应用'));
    } catch {
      message.error(t('保存失败'));
    } finally {
      setSaving(false);
    }
  };

  const resetTab = () => {
    if (tab === 'app') setCfg({ ...cfg, app: JSON.parse(JSON.stringify(DEFAULT_APP)) });
    else setCfg({ ...cfg, login: JSON.parse(JSON.stringify(DEFAULT_LOGIN)) });
  };

  if (loading) {
    return (
      <div style={{ padding: 60, textAlign: 'center' }}>
        <Spin />
      </div>
    );
  }

  return (
    <div style={{ padding: 4 }}>
      <div style={{ display: 'flex', gap: 24, alignItems: 'flex-start', flexWrap: 'wrap' }}>
        {/* form */}
        <div style={{ flex: '1 1 420px', minWidth: 360, maxWidth: 560 }}>
          <Tabs
            activeKey={tab}
            onChange={(k) => setTab(k as any)}
            items={[
              { key: 'app', label: t('工作区外观'), children: <AppForm app={cfg.app} onChange={(app) => setCfg({ ...cfg, app })} uploadImage={uploadImage} /> },
              { key: 'login', label: t('登录页外观'), children: <LoginForm login={cfg.login} onChange={(login) => setCfg({ ...cfg, login })} uploadImage={uploadImage} /> },
            ]}
          />
          <Space style={{ marginTop: 16 }}>
            <Button type="primary" loading={saving} onClick={save}>
              {t('保存并应用')}
            </Button>
            <Button onClick={resetTab}>{t('重置本组')}</Button>
          </Space>
        </div>

        {/* live preview (sticky) */}
        <div style={{ flex: '1 1 380px', minWidth: 340, position: 'sticky', top: 16 }}>
          <div style={{ fontSize: 12, color: '#94a3b8', marginBottom: 8 }}>{t('实时预览')}</div>
          <LivePreview scope={tab} app={cfg.app} login={cfg.login} />
          <div style={{ fontSize: 11, color: '#94a3b8', marginTop: 10, lineHeight: 1.6 }}>
            {t('提示：默认全部关闭，开启对应开关并保存后才生效；关闭插件或关闭开关立即恢复原生外观。')}
          </div>
        </div>
      </div>
    </div>
  );
};

export default SettingsPage;
