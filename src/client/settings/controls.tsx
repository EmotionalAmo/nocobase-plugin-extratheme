import React from 'react';
import { Segmented, Slider, Switch, ColorPicker, Input, Select, Upload, Button } from 'antd';
import type { AppConfig, LoginConfig, BackgroundConfig, CardConfig, NavConfig, LoginCard, FontConfig, ScrollbarConfig, HideConfig } from '../../shared/types';
import { GRADIENT_PRESETS, FONT_PRESETS } from '../../shared/defaults';
import { isEphemeralUrl } from '../../shared/color';
import { useT } from '../useT';

const ACCENT = '#6d5ae6';

function hex(c: any): string {
  return typeof c === 'string' ? c : c?.toHexString?.() || '#ffffff';
}

/** one labelled control row */
const Row: React.FC<{ label: string; value?: React.ReactNode; children: React.ReactNode }> = ({ label, value, children }) => (
  <div style={{ marginBottom: 14 }}>
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 7 }}>
      <span style={{ fontSize: 12.5, color: '#475569' }}>{label}</span>
      {value != null && <span style={{ fontSize: 12, fontWeight: 600, color: ACCENT, fontVariantNumeric: 'tabular-nums' }}>{value}</span>}
    </div>
    {children}
  </div>
);

/** a titled sub-group inside a panel */
const Group: React.FC<{ title?: string; right?: React.ReactNode; children: React.ReactNode; first?: boolean }> = ({ title, right, children, first }) => (
  <div style={{ marginTop: first ? 0 : 18, paddingTop: first ? 0 : 16, borderTop: first ? 'none' : '1px solid rgba(0,0,0,0.05)' }}>
    {title && (
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
        <span style={{ fontSize: 12.5, fontWeight: 700, color: '#0f172a' }}>{title}</span>
        {right}
      </div>
    )}
    {children}
  </div>
);

/** a column card */
const Panel: React.FC<{ title: string; right?: React.ReactNode; children: React.ReactNode; style?: React.CSSProperties }> = ({ title, right, children, style }) => (
  <div
    style={{
      flex: '1 1 300px',
      minWidth: 280,
      background: '#fff',
      borderRadius: 14,
      border: '1px solid rgba(15,23,42,0.08)',
      boxShadow: '0 1px 3px rgba(15,23,42,0.04)',
      padding: '16px 20px 20px',
      alignSelf: 'stretch',
      ...style,
    }}
  >
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16, paddingBottom: 13, borderBottom: '1px solid rgba(15,23,42,0.07)' }}>
      <b style={{ fontSize: 14, letterSpacing: 0.2, color: '#0f172a' }}>{title}</b>
      {right}
    </div>
    {children}
  </div>
);

const dimStyle = (enabled: boolean): React.CSSProperties =>
  enabled ? {} : { opacity: 0.4, pointerEvents: 'none', filter: 'grayscale(0.4)' };

// ---- control groups (unwrapped; caller places them in Panels) ----

const BackgroundGroup: React.FC<{ bg: BackgroundConfig; onChange: (b: BackgroundConfig) => void; uploadImage?: (f: File) => Promise<string>; first?: boolean }> = ({ bg, onChange, uploadImage, first }) => {
  const t = useT();
  const set = (p: Partial<BackgroundConfig>) => onChange({ ...bg, ...p });
  const presetNames = Object.keys(GRADIENT_PRESETS);
  const isCustom = !presetNames.includes(bg.gradient.preset);
  return (
    <Group title={t('背景')} first={first}>
      <Row label={t('类型')}>
        <Segmented
          block
          size="small"
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
          <ColorPicker value={bg.color} onChangeComplete={(c) => set({ color: hex(c) })} showText disabledAlpha />
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
          <Row label={t('角度')} value={`${bg.gradient.angle}°`}>
            <Slider min={0} max={360} value={bg.gradient.angle} onChange={(v) => set({ gradient: { ...bg.gradient, angle: v } })} />
          </Row>
          {isCustom && (
            <Row label={t('自定义色标')}>
              <div style={{ display: 'flex', gap: 8 }}>
                <ColorPicker disabledAlpha value={bg.gradient.colors[0] || '#ffffff'} onChangeComplete={(c) => set({ gradient: { ...bg.gradient, colors: [hex(c), bg.gradient.colors[1] || '#ffffff'] } })} />
                <ColorPicker disabledAlpha value={bg.gradient.colors[1] || '#ffffff'} onChangeComplete={(c) => set({ gradient: { ...bg.gradient, colors: [bg.gradient.colors[0] || '#ffffff', hex(c)] } })} />
              </div>
            </Row>
          )}
        </>
      )}
      {bg.type === 'image' && (
        <>
          <Row label={t('图片 URL')}>
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
          {isEphemeralUrl(bg.image.url) && (
            <div style={{ margin: '-4px 0 12px', padding: '8px 10px', borderRadius: 8, background: '#fff7ed', border: '1px solid #fed7aa', fontSize: 11.5, color: '#c2410c', lineHeight: 1.6 }}>
              {t('⚠ 当前图片是临时签名链接，过期后会 403 失效。请点上方“上传”重新选择图片，将改为内联存储，永不过期。')}
            </div>
          )}
          <Row label={t('铺法')}>
            <Segmented
              block
              size="small"
              value={bg.image.fit}
              onChange={(v) => set({ image: { ...bg.image, fit: v as any } })}
              options={[
                { label: t('铺满'), value: 'cover' },
                { label: t('适应'), value: 'contain' },
                { label: t('拉伸'), value: 'stretch' },
                { label: t('平铺'), value: 'repeat' },
              ]}
            />
          </Row>
        </>
      )}
      <Row label={t('暗化遮罩')} value={`${bg.dim}%`}>
        <Slider min={0} max={80} value={bg.dim} onChange={(v) => set({ dim: v })} />
      </Row>
    </Group>
  );
};

const CardGroup: React.FC<{ card: CardConfig; onChange: (c: CardConfig) => void }> = ({ card, onChange }) => {
  const t = useT();
  const set = (p: Partial<CardConfig>) => onChange({ ...card, ...p });
  return (
    <Group title={t('内容区卡片')} right={<Switch size="small" checked={card.glass} onChange={(v) => set({ glass: v })} />}>
      <div style={dimStyle(card.glass)}>
        <Row label={t('卡片不透明度')} value={`${card.opacity}%`}>
          <Slider min={10} max={100} value={card.opacity} onChange={(v) => set({ opacity: v })} />
        </Row>
        <Row label={t('背景模糊')} value={`${card.blur}px`}>
          <Slider min={0} max={40} value={card.blur} onChange={(v) => set({ blur: v })} />
        </Row>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span style={{ fontSize: 12.5, color: '#475569' }}>{t('浅色描边')}</span>
          <Switch size="small" checked={card.border} onChange={(v) => set({ border: v })} />
        </div>
      </div>
    </Group>
  );
};

// Scrollbar display: 始终显示 (always-visible slim bar) vs 始终隐藏 (fully hidden;
// content still scrolls). Own on/off switch — off = native. Independent of the master switch.
const ScrollbarGroup: React.FC<{ scrollbar: ScrollbarConfig; onChange: (s: ScrollbarConfig) => void }> = ({ scrollbar, onChange }) => {
  const t = useT();
  const set = (p: Partial<ScrollbarConfig>) => onChange({ ...scrollbar, ...p });
  return (
    <Group title={t('滚动条')} right={<Switch size="small" checked={scrollbar.enabled} onChange={(v) => set({ enabled: v })} />}>
      <div style={dimStyle(scrollbar.enabled)}>
        <Row label={t('显示方式')}>
          <Segmented
            block
            size="small"
            value={scrollbar.mode}
            onChange={(v) => set({ mode: v as any })}
            options={[
              { label: t('始终显示'), value: 'always' },
              { label: t('始终隐藏'), value: 'hidden' },
            ]}
          />
        </Row>
        <div style={{ fontSize: 11, color: '#94a3b8', marginTop: 2, lineHeight: 1.6 }}>
          {t('“始终显示”为常驻细滚动条；“始终隐藏”完全隐藏滚动条（内容仍可滚动）。')}
        </div>
      </div>
    </Group>
  );
};

// Hide arbitrary elements (e.g. the global AI entry) by CSS selector. Own on/off switch,
// independent of the master switch. The selector is user-editable ON PURPOSE: the AI entry's
// `.css-…` class is an emotion hash that changes across NocoBase builds, so a fixed selector
// would silently stop matching after an upgrade.
const HideGroup: React.FC<{ hide: HideConfig; onChange: (h: HideConfig) => void }> = ({ hide, onChange }) => {
  const t = useT();
  const set = (p: Partial<HideConfig>) => onChange({ ...hide, ...p });
  return (
    <Group title={t('隐藏元素')} right={<Switch size="small" checked={hide.enabled} onChange={(v) => set({ enabled: v })} />}>
      <div style={dimStyle(hide.enabled)}>
        <Row label={t('CSS 选择器')}>
          <Input value={hide.selector} placeholder=".css-1hc929u" onChange={(e) => set({ selector: e.target.value })} />
        </Row>
        <div style={{ fontSize: 11, color: '#94a3b8', marginTop: 2, lineHeight: 1.6 }}>
          {t('隐藏匹配到的元素（如 AI 入口）。可填多个,用逗号分隔。注意：.css-xxxx 是 NocoBase 自动生成的哈希类,升级后可能变化——失效时来这里更新即可,无需换插件版本。')}
        </div>
      </div>
    </Group>
  );
};

// Nav = one base COLOR (the theme editor can't set colorBgHeader, so the plugin owns it)
// + the enhancement layer: style + opacity + blur. Menu TEXT color stays theme-managed.
const NavGroup: React.FC<{ nav: NavConfig; onChange: (n: NavConfig) => void }> = ({ nav, onChange }) => {
  const t = useT();
  const set = (p: Partial<NavConfig>) => onChange({ ...nav, ...p });
  return (
    <Group first>
      <Row label={t('背景颜色')}>
        <ColorPicker value={nav.color} onChangeComplete={(c) => set({ color: hex(c) })} showText disabledAlpha />
      </Row>
      <Row label={t('风格')}>
        <Segmented
          block
          size="small"
          value={nav.style}
          onChange={(v) => set({ style: v as any })}
          options={[
            { label: t('实色'), value: 'solid' },
            { label: t('毛玻璃'), value: 'frosted' },
            { label: t('质感玻璃'), value: 'material' },
          ]}
        />
      </Row>
      <Row label={t('不透明度')} value={`${nav.opacity}%`}>
        <Slider min={0} max={100} value={nav.opacity} onChange={(v) => set({ opacity: v })} />
      </Row>
      <Row label={t('背景模糊')} value={`${nav.blur}px`}>
        <Slider min={0} max={40} value={nav.blur} disabled={nav.style === 'solid'} onChange={(v) => set({ blur: v })} />
      </Row>
      {nav.style === 'material' && (
        <Row label={t('质感强度')} value={`${nav.texture}%`}>
          <Slider min={0} max={100} value={nav.texture} onChange={(v) => set({ texture: v })} />
        </Row>
      )}
    </Group>
  );
};

type FontUploadResult = { url: string; name: string; format: string };

const FontGroup: React.FC<{
  font: FontConfig;
  onChange: (f: FontConfig) => void;
  uploadFont?: (f: File) => Promise<FontUploadResult>;
}> = ({ font, onChange, uploadFont }) => {
  const t = useT();
  const set = (p: Partial<FontConfig>) => onChange({ ...font, ...p });
  const setUpload = (p: Partial<FontConfig['upload']>) => onChange({ ...font, upload: { ...font.upload, ...p } });

  // --- system source: sticky custom-mode (decoupled from the family value) ---
  const matchesPreset = FONT_PRESETS.some((p) => p.value === font.family);
  const [customMode, setCustomMode] = React.useState(!matchesPreset);
  const lastEmitted = React.useRef(font.family);
  React.useEffect(() => {
    if (font.family !== lastEmitted.current) {
      lastEmitted.current = font.family;
      setCustomMode(!FONT_PRESETS.some((p) => p.value === font.family));
    }
  }, [font.family]);
  const emit = (family: string) => {
    lastEmitted.current = family;
    set({ family });
  };
  const showCustom = customMode || !matchesPreset;

  // --- upload source: load the uploaded font into the document so the preview
  // renders it before saving (the injected @font-face only exists after save) ---
  const up = font.upload;
  React.useEffect(() => {
    const FF = (window as any).FontFace;
    if (font.source === 'upload' && up?.url && up?.name && FF && (document as any).fonts) {
      try {
        new FF(up.name, `url("${up.url}")`)
          .load()
          .then((f: any) => (document as any).fonts.add(f))
          .catch(() => {});
      } catch {
        /* ignore */
      }
    }
  }, [font.source, up?.url, up?.name]);

  const handleUpload = async (file: File) => {
    if (uploadFont) {
      const r = await uploadFont(file);
      if (r.url) onChange({ ...font, upload: r });
    }
    return false; // never let antd auto-upload
  };

  const previewFamily = font.source === 'upload' && up?.url ? `"${up.name}"` : font.family || undefined;

  return (
    <Group first>
      <Row label={t('字体来源')}>
        <Segmented
          block
          size="small"
          value={font.source}
          onChange={(v) => set({ source: v as any })}
          options={[
            { label: t('系统字体'), value: 'system' },
            { label: t('上传字体'), value: 'upload' },
          ]}
        />
      </Row>

      {font.source === 'system' ? (
        <>
          <Row label={t('字体')}>
            <Select
              style={{ width: '100%' }}
              value={showCustom ? '__custom__' : font.family}
              onChange={(v) => {
                if (v === '__custom__') setCustomMode(true);
                else {
                  setCustomMode(false);
                  emit(v);
                }
              }}
              options={[...FONT_PRESETS.map((p) => ({ label: p.label, value: p.value })), { label: t('自定义'), value: '__custom__' }]}
            />
          </Row>
          {showCustom && (
            <Row label={t('自定义字体')}>
              <Input value={font.family} placeholder='"Font Name", sans-serif' onChange={(e) => emit(e.target.value)} />
            </Row>
          )}
        </>
      ) : up?.url ? (
        <>
          <Row label={t('字体名称')}>
            <Input value={up.name} placeholder="Custom Font" onChange={(e) => setUpload({ name: e.target.value })} />
          </Row>
          <div style={{ display: 'flex', gap: 12, alignItems: 'center', marginBottom: 14 }}>
            <span style={{ fontSize: 12, color: '#16a34a' }}>{t('已上传')}{up.format ? ` · ${up.format}` : ''}</span>
            <Upload showUploadList={false} accept=".ttf,.otf,.woff,.woff2" beforeUpload={handleUpload}>
              <Button type="link" size="small" style={{ padding: 0 }}>{t('重新上传')}</Button>
            </Upload>
            <Button type="link" size="small" danger style={{ padding: 0 }} onClick={() => onChange({ ...font, upload: { url: '', name: '', format: '' } })}>
              {t('移除')}
            </Button>
          </div>
        </>
      ) : (
        <Row label={t('上传字体文件')}>
          <Upload showUploadList={false} accept=".ttf,.otf,.woff,.woff2" beforeUpload={handleUpload}>
            <Button size="small">{t('选择字体文件')}</Button>
          </Upload>
        </Row>
      )}

      <div style={{ marginTop: 12, padding: '14px 16px', borderRadius: 10, background: '#f8fafc', border: '1px solid rgba(15,23,42,0.06)', fontFamily: previewFamily }}>
        <div style={{ fontSize: 19, fontWeight: 700, color: '#0f172a', lineHeight: 1.4 }}>{t('字体预览')} Aa 永和</div>
        <div style={{ fontSize: 13, color: '#475569', marginTop: 5 }}>中文示例文本 · The quick brown fox · 0123456789</div>
      </div>
      <div style={{ fontSize: 11, color: '#94a3b8', marginTop: 8, lineHeight: 1.6 }}>
        {font.source === 'upload'
          ? t('提示：上传字体对所有访问者生效，无需本机安装；中文字体文件较大，建议使用 woff2 或先做子集化以加快加载。')
          : t('提示：字体需系统已安装才生效；“无衬线/系统默认”通常与本机默认字体一致，选“楷体/宋体”等可看到明显变化。')}
      </div>
    </Group>
  );
};

const LoginCardGroup: React.FC<{ card: LoginCard; onChange: (c: LoginCard) => void }> = ({ card, onChange }) => {
  const t = useT();
  const set = (p: Partial<LoginCard>) => onChange({ ...card, ...p });
  return (
    <Group title={t('登录卡片')} right={<Switch size="small" checked={card.glass} onChange={(v) => set({ glass: v })} />}>
      <Row label={t('卡片不透明度')} value={`${card.opacity}%`}>
        <Slider min={10} max={100} value={card.opacity} onChange={(v) => set({ opacity: v })} />
      </Row>
      <Row label={t('背景模糊')} value={`${card.blur}px`}>
        <Slider min={0} max={40} value={card.blur} onChange={(v) => set({ blur: v })} />
      </Row>
      <Row label={t('圆角')} value={`${card.radius}px`}>
        <Slider min={0} max={32} value={card.radius} onChange={(v) => set({ radius: v })} />
      </Row>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <span style={{ fontSize: 12.5, color: '#475569' }}>{t('投影')}</span>
        <Switch size="small" checked={card.shadow} onChange={(v) => set({ shadow: v })} />
      </div>
    </Group>
  );
};

// ---- public forms ----

export const AppForm: React.FC<{
  app: AppConfig;
  onChange: (a: AppConfig) => void;
  uploadImage?: (f: File) => Promise<string>;
  uploadFont?: (f: File) => Promise<{ url: string; name: string; format: string }>;
}> = ({ app, onChange, uploadImage, uploadFont }) => {
  const t = useT();
  const navPanelStyle = { flex: '0 0 auto' } as React.CSSProperties;
  return (
    // Row: 工作区外观 | (顶部导航栏 above 侧边导航栏) | 全局字体
    <div style={{ display: 'flex', gap: 20, flexWrap: 'wrap', alignItems: 'stretch' }}>
      <Panel title={t('工作区外观')} right={<Switch checked={app.enabled} onChange={(v) => onChange({ ...app, enabled: v })} />}>
        <div style={dimStyle(app.enabled)}>
          <BackgroundGroup first bg={app.background} onChange={(background) => onChange({ ...app, background })} uploadImage={uploadImage} />
          <CardGroup card={app.card} onChange={(card) => onChange({ ...app, card })} />
        </div>
        {/* scrollbar + hide are global preferences, independent of the workspace switch (not dimmed) */}
        <ScrollbarGroup scrollbar={app.scrollbar} onChange={(scrollbar) => onChange({ ...app, scrollbar })} />
        <HideGroup hide={app.hide} onChange={(hide) => onChange({ ...app, hide })} />
      </Panel>
      {/* middle column: top + side nav stacked vertically */}
      <div style={{ flex: '1 1 300px', minWidth: 280, display: 'flex', flexDirection: 'column', gap: 20 }}>
        <Panel
          style={navPanelStyle}
          title={t('顶部导航栏')}
          right={<Switch checked={app.header.enabled} onChange={(v) => onChange({ ...app, header: { ...app.header, enabled: v } })} />}
        >
          <div style={dimStyle(app.header.enabled)}>
            <NavGroup nav={app.header} onChange={(header) => onChange({ ...app, header })} />
          </div>
        </Panel>
        <Panel
          style={navPanelStyle}
          title={t('侧边导航栏')}
          right={<Switch checked={app.sider.enabled} onChange={(v) => onChange({ ...app, sider: { ...app.sider, enabled: v } })} />}
        >
          <div style={dimStyle(app.sider.enabled)}>
            <NavGroup nav={app.sider} onChange={(sider) => onChange({ ...app, sider })} />
          </div>
        </Panel>
      </div>
      <Panel
        title={t('全局字体')}
        right={<Switch checked={app.font.enabled} onChange={(v) => onChange({ ...app, font: { ...app.font, enabled: v } })} />}
      >
        <div style={dimStyle(app.font.enabled)}>
          <FontGroup font={app.font} onChange={(font) => onChange({ ...app, font })} uploadFont={uploadFont} />
        </div>
      </Panel>
    </div>
  );
};

export const LoginForm: React.FC<{ login: LoginConfig; onChange: (l: LoginConfig) => void; uploadImage?: (f: File) => Promise<string> }> = ({ login, onChange, uploadImage }) => {
  const t = useT();
  const dim = dimStyle(login.enabled);
  return (
    <div style={{ display: 'flex', gap: 20, flexWrap: 'wrap', alignItems: 'stretch' }}>
      <Panel title={t('登录页外观')} right={<Switch checked={login.enabled} onChange={(v) => onChange({ ...login, enabled: v })} />}>
        <div style={dim}>
          <BackgroundGroup first bg={login.background} onChange={(background) => onChange({ ...login, background })} uploadImage={uploadImage} />
        </div>
      </Panel>
      <Panel title={t('登录卡片')}>
        <div style={dim}>
          <LoginCardGroup card={login.card} onChange={(card) => onChange({ ...login, card })} />
        </div>
      </Panel>
    </div>
  );
};
