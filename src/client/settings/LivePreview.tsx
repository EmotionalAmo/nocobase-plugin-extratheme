import React from 'react';
import type { AppConfig, LoginConfig, BackgroundConfig, NavConfig } from '../../shared/types';
import { hexToRgba, buildBackground } from '../../shared/color';
import { useT } from '../useT';

function bgStyle(bg: BackgroundConfig): React.CSSProperties {
  const b = buildBackground(bg);
  let image = b.image;
  if (bg.dim > 0 && bg.type !== 'none') {
    const d = hexToRgba('#000000', bg.dim / 100);
    image = `linear-gradient(${d},${d}),${b.image}`;
  }
  return { background: image, backgroundSize: b.size, backgroundRepeat: b.repeat, backgroundPosition: b.position };
}

function navStyle(nav: NavConfig): React.CSSProperties {
  const glass = nav.style === 'frosted' && nav.blur > 0 ? `blur(${nav.blur}px)` : undefined;
  return {
    background: hexToRgba(nav.color, nav.opacity / 100),
    backdropFilter: glass,
    WebkitBackdropFilter: glass,
    color: nav.text === 'light' ? '#f8fafc' : '#1f2733',
  };
}

const box: React.CSSProperties = {
  position: 'relative',
  height: 300,
  borderRadius: 12,
  overflow: 'hidden',
  border: '1px solid rgba(0,0,0,0.08)',
  boxShadow: '0 8px 30px rgba(0,0,0,0.12)',
};

export const LivePreview: React.FC<{ scope: 'app' | 'login'; app: AppConfig; login: LoginConfig }> = ({
  scope,
  app,
  login,
}) => {
  const t = useT();
  if (scope === 'app') {
    const cardStyle: React.CSSProperties = {
      flex: 1,
      borderRadius: 10,
      padding: 12,
      background: hexToRgba('#ffffff', app.card.opacity / 100),
      backdropFilter: app.card.glass && app.card.blur > 0 ? `blur(${app.card.blur}px)` : undefined,
      WebkitBackdropFilter: app.card.glass && app.card.blur > 0 ? `blur(${app.card.blur}px)` : undefined,
      border: app.card.border ? '1px solid rgba(255,255,255,0.5)' : '1px solid transparent',
      color: '#1f2733',
      fontSize: 12,
    };
    return (
      <div style={{ ...box, ...(app.enabled ? bgStyle(app.background) : { background: '#f0f2f5' }) }}>
        {/* header */}
        <div
          style={{
            height: 40,
            display: 'flex',
            alignItems: 'center',
            padding: '0 14px',
            fontWeight: 700,
            fontSize: 13,
            ...(app.enabled ? navStyle(app.header) : { background: '#fff', color: '#1f2733' }),
          }}
        >
          NocoBase
          <span style={{ marginLeft: 'auto', display: 'flex', gap: 14, fontWeight: 500, opacity: 0.85 }}>
            <span>{t('概览')}</span>
            <span>{t('数据')}</span>
            <span>{t('设置')}</span>
          </span>
        </div>
        <div style={{ display: 'flex', height: 'calc(100% - 40px)' }}>
          {/* sider */}
          <div
            style={{
              width: 92,
              padding: 10,
              display: 'flex',
              flexDirection: 'column',
              gap: 8,
              fontSize: 12,
              ...(app.enabled ? navStyle(app.sider) : { background: '#fff', color: '#1f2733' }),
            }}
          >
            <div style={{ fontWeight: 700 }}>{t('菜单')}</div>
            <div style={{ opacity: 0.8 }}>{t('概览')}</div>
            <div style={{ opacity: 0.8 }}>{t('订单')}</div>
            <div style={{ opacity: 0.8 }}>{t('报表')}</div>
          </div>
          {/* content cards */}
          <div style={{ flex: 1, padding: 12, display: 'flex', flexDirection: 'column', gap: 10 }}>
            <div style={cardStyle}>{t('内容卡片')} A</div>
            <div style={{ display: 'flex', gap: 10, flex: 1 }}>
              <div style={cardStyle}>B</div>
              <div style={cardStyle}>C</div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // login preview
  const c = login.card;
  const cardStyle: React.CSSProperties = {
    width: 220,
    padding: '22px 20px',
    borderRadius: c.radius,
    background: hexToRgba('#ffffff', c.opacity / 100),
    backdropFilter: c.glass && c.blur > 0 ? `blur(${c.blur}px)` : undefined,
    WebkitBackdropFilter: c.glass && c.blur > 0 ? `blur(${c.blur}px)` : undefined,
    boxShadow: c.shadow ? '0 24px 70px rgba(15,23,42,0.28)' : 'none',
    color: '#1f2733',
    textAlign: 'center' as const,
  };
  const fakeInput: React.CSSProperties = {
    height: 30,
    borderRadius: 8,
    background: 'rgba(255,255,255,0.6)',
    border: '1px solid rgba(0,0,0,0.1)',
    margin: '8px 0',
  };
  return (
    <div
      style={{
        ...box,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        ...(login.enabled ? bgStyle(login.background) : { background: '#f0f2f5' }),
      }}
    >
      <div style={cardStyle}>
        <div style={{ fontWeight: 800, fontSize: 16, marginBottom: 4 }}>NocoBase</div>
        <div style={{ fontSize: 11, opacity: 0.7, marginBottom: 10 }}>{t('欢迎登录')}</div>
        <div style={fakeInput} />
        <div style={fakeInput} />
        <div style={{ height: 32, borderRadius: 8, background: '#6d5ae6', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, marginTop: 6 }}>
          {t('登录')}
        </div>
      </div>
    </div>
  );
};

export default LivePreview;
