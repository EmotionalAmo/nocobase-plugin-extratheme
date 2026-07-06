import React from 'react';
import { Segmented, Slider, Switch, ColorPicker, Input, Select, Upload, Button, Space } from 'antd';
import type { AppConfig, LoginConfig, BackgroundConfig, CardConfig, NavConfig, LoginCard } from '../../shared/types';
import { GRADIENT_PRESETS } from '../../shared/defaults';
import { useT } from '../useT';

/** labelled row */
const Row: React.FC<{ label: string; extra?: React.ReactNode; children: React.ReactNode }> = ({ label, extra, children }) => (
  <div style={{ marginBottom: 14 }}>
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
      <span style={{ fontSize: 13, color: '#334155' }}>{label}</span>
      {extra}
    </div>
    {children}
  </div>
);

const Section: React.FC<{ title: string; right?: React.ReactNode; children: React.ReactNode }> = ({ title, right, children }) => (
  <div style={{ padding: '14px 0', borderTop: '1px solid rgba(0,0,0,0.06)' }}>
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
      <b style={{ fontSize: 13.5 }}>{title}</b>
      {right}
    </div>
    {children}
  </div>
);

function hex(c: any): string {
  return typeof c === 'string' ? c : c?.toHexString?.() || '#ffffff';
}

const BackgroundSection: React.FC<{
  bg: BackgroundConfig;
  onChange: (b: BackgroundConfig) => void;
  uploadImage?: (file: File) => Promise<string>;
  loginHint?: boolean;
}> = ({ bg, onChange, uploadImage, loginHint }) => {
  const t = useT();
  const set = (p: Partial<BackgroundConfig>) => onChange({ ...bg, ...p });
  const presetNames = Object.keys(GRADIENT_PRESETS);
  const isCustom = !presetNames.includes(bg.gradient.preset);
  return (
    <Section title={t('背景')}>
      <Row label={t('类型')}>
        <Segmented
          block
          value={bg.type}
          onChange={(v) => set({ type: v as any })}
          options={[
            { label: t('纯色'), value: 'color' },
            { label: t('渐变'), value: 'gradient' },
            { label: t('图片'), value: 'image' },
          ]}
        />
      </Row>

      {bg.type === 'color' && (
        <Row label={t('背景颜色')}>
          <ColorPicker value={bg.color} onChangeComplete={(c) => set({ color: hex(c) })} showText />
        </Row>
      )}

      {bg.type === 'gradient' && (
        <>
          <Row label={t('渐变预设')}>
            <Select
              style={{ width: '100%' }}
              value={isCustom ? '__custom__' : bg.gradient.preset}
              onChange={(v) => {
                if (v === '__custom__') set({ gradient: { ...bg.gradient, preset: '自定义' } });
                else set({ gradient: { ...bg.gradient, preset: v, colors: GRADIENT_PRESETS[v] } });
              }}
              options={[...presetNames.map((n) => ({ label: n, value: n })), { label: t('自定义'), value: '__custom__' }]}
            />
          </Row>
          <Row label={t('角度')} extra={<span style={{ color: '#6d5ae6' }}>{bg.gradient.angle}°</span>}>
            <Slider min={0} max={360} value={bg.gradient.angle} onChange={(v) => set({ gradient: { ...bg.gradient, angle: v } })} />
          </Row>
          {isCustom && (
            <Row label={t('自定义色标')}>
              <Space>
                <ColorPicker
                  value={bg.gradient.colors[0] || '#ffffff'}
                  onChangeComplete={(c) => set({ gradient: { ...bg.gradient, colors: [hex(c), bg.gradient.colors[1] || '#ffffff'] } })}
                />
                <ColorPicker
                  value={bg.gradient.colors[1] || '#ffffff'}
                  onChangeComplete={(c) => set({ gradient: { ...bg.gradient, colors: [bg.gradient.colors[0] || '#ffffff', hex(c)] } })}
                />
              </Space>
            </Row>
          )}
        </>
      )}

      {bg.type === 'image' && (
        <>
          <Row label={t('图片 URL')} extra={loginHint ? <span style={{ fontSize: 11, color: '#f59e0b' }}>{t('需公网可读')}</span> : null}>
            <Input
              value={bg.image.url}
              placeholder="https://…"
              onChange={(e) => set({ image: { ...bg.image, url: e.target.value } })}
              addonAfter={
                uploadImage ? (
                  <Upload
                    showUploadList={false}
                    beforeUpload={async (file) => {
                      const url = await uploadImage(file as File);
                      if (url) set({ image: { ...bg.image, url } });
                      return false;
                    }}
                  >
                    <span style={{ cursor: 'pointer' }}>{t('上传')}</span>
                  </Upload>
                ) : null
              }
            />
          </Row>
          <Row label={t('铺法')}>
            <Segmented
              block
              value={bg.image.fit}
              onChange={(v) => set({ image: { ...bg.image, fit: v as any } })}
              options={[
                { label: t('铺满'), value: 'cover' },
                { label: t('适应'), value: 'contain' },
                { label: t('平铺'), value: 'repeat' },
              ]}
            />
          </Row>
        </>
      )}

      <Row label={t('暗化遮罩')} extra={<span style={{ color: '#6d5ae6' }}>{bg.dim}%</span>}>
        <Slider min={0} max={80} value={bg.dim} onChange={(v) => set({ dim: v })} />
      </Row>
    </Section>
  );
};

const CardSection: React.FC<{ card: CardConfig; onChange: (c: CardConfig) => void }> = ({ card, onChange }) => {
  const t = useT();
  const set = (p: Partial<CardConfig>) => onChange({ ...card, ...p });
  return (
    <Section title={t('内容区卡片')} right={<Switch checked={card.glass} onChange={(v) => set({ glass: v })} />}>
      <Row label={t('卡片不透明度')} extra={<span style={{ color: '#6d5ae6' }}>{card.opacity}%</span>}>
        <Slider min={10} max={100} value={card.opacity} onChange={(v) => set({ opacity: v })} />
      </Row>
      <Row label={t('背景模糊')} extra={<span style={{ color: '#6d5ae6' }}>{card.blur}px</span>}>
        <Slider min={0} max={40} value={card.blur} onChange={(v) => set({ blur: v })} />
      </Row>
      <Row label={t('浅色描边')}>
        <Switch checked={card.border} onChange={(v) => set({ border: v })} />
      </Row>
    </Section>
  );
};

const NavSection: React.FC<{ title: string; nav: NavConfig; onChange: (n: NavConfig) => void }> = ({ title, nav, onChange }) => {
  const t = useT();
  const set = (p: Partial<NavConfig>) => onChange({ ...nav, ...p });
  return (
    <Section title={title}>
      <Row label={t('风格')}>
        <Segmented
          block
          value={nav.style}
          onChange={(v) => set({ style: v as any })}
          options={[
            { label: t('实色'), value: 'solid' },
            { label: t('毛玻璃'), value: 'frosted' },
          ]}
        />
      </Row>
      <Row label={t('背景颜色')}>
        <ColorPicker value={nav.color} onChangeComplete={(c) => set({ color: hex(c) })} showText />
      </Row>
      <Row label={t('不透明度')} extra={<span style={{ color: '#6d5ae6' }}>{nav.opacity}%</span>}>
        <Slider min={0} max={100} value={nav.opacity} onChange={(v) => set({ opacity: v })} />
      </Row>
      <Row label={t('背景模糊')} extra={<span style={{ color: '#6d5ae6' }}>{nav.blur}px</span>}>
        <Slider min={0} max={40} value={nav.blur} disabled={nav.style !== 'frosted'} onChange={(v) => set({ blur: v })} />
      </Row>
      <Row label={t('文字颜色')}>
        <Segmented
          block
          value={nav.text}
          onChange={(v) => set({ text: v as any })}
          options={[
            { label: t('深色'), value: 'dark' },
            { label: t('浅色'), value: 'light' },
          ]}
        />
      </Row>
    </Section>
  );
};

const LoginCardSection: React.FC<{ card: LoginCard; onChange: (c: LoginCard) => void }> = ({ card, onChange }) => {
  const t = useT();
  const set = (p: Partial<LoginCard>) => onChange({ ...card, ...p });
  return (
    <Section title={t('登录卡片')} right={<Switch checked={card.glass} onChange={(v) => set({ glass: v })} />}>
      <Row label={t('卡片不透明度')} extra={<span style={{ color: '#6d5ae6' }}>{card.opacity}%</span>}>
        <Slider min={10} max={100} value={card.opacity} onChange={(v) => set({ opacity: v })} />
      </Row>
      <Row label={t('背景模糊')} extra={<span style={{ color: '#6d5ae6' }}>{card.blur}px</span>}>
        <Slider min={0} max={40} value={card.blur} onChange={(v) => set({ blur: v })} />
      </Row>
      <Row label={t('圆角')} extra={<span style={{ color: '#6d5ae6' }}>{card.radius}px</span>}>
        <Slider min={0} max={32} value={card.radius} onChange={(v) => set({ radius: v })} />
      </Row>
      <Row label={t('投影')}>
        <Switch checked={card.shadow} onChange={(v) => set({ shadow: v })} />
      </Row>
    </Section>
  );
};

export const AppForm: React.FC<{ app: AppConfig; onChange: (a: AppConfig) => void; uploadImage?: (f: File) => Promise<string> }> = ({ app, onChange, uploadImage }) => {
  const t = useT();
  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingBottom: 4 }}>
        <b style={{ fontSize: 14 }}>{t('总开关')}</b>
        <Switch checked={app.enabled} onChange={(v) => onChange({ ...app, enabled: v })} />
      </div>
      <BackgroundSection bg={app.background} onChange={(background) => onChange({ ...app, background })} uploadImage={uploadImage} />
      <CardSection card={app.card} onChange={(card) => onChange({ ...app, card })} />
      <NavSection title={t('顶部导航栏')} nav={app.header} onChange={(header) => onChange({ ...app, header })} />
      <NavSection title={t('侧边导航栏')} nav={app.sider} onChange={(sider) => onChange({ ...app, sider })} />
    </div>
  );
};

export const LoginForm: React.FC<{ login: LoginConfig; onChange: (l: LoginConfig) => void; uploadImage?: (f: File) => Promise<string> }> = ({ login, onChange, uploadImage }) => {
  const t = useT();
  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingBottom: 4 }}>
        <b style={{ fontSize: 14 }}>{t('总开关')}</b>
        <Switch checked={login.enabled} onChange={(v) => onChange({ ...login, enabled: v })} />
      </div>
      <BackgroundSection bg={login.background} onChange={(background) => onChange({ ...login, background })} uploadImage={uploadImage} loginHint />
      <LoginCardSection card={login.card} onChange={(card) => onChange({ ...login, card })} />
    </div>
  );
};
