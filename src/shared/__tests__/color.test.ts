import { describe, it, expect } from 'vitest';
import { hexToRgba, buildBackground, sanitizeFontFamily, fontFormatFromUrl, sanitizeCssUrl, toSolidRgb, withAlpha } from '../color';

describe('hexToRgba', () => {
  it('converts 6-digit hex', () => {
    expect(hexToRgba('#ffffff', 0.9)).toBe('rgba(255,255,255,0.9)');
  });
  it('converts 3-digit hex', () => {
    expect(hexToRgba('#000', 0.5)).toBe('rgba(0,0,0,0.5)');
  });
  it('tolerates missing #', () => {
    expect(hexToRgba('6d5ae6', 1)).toBe('rgba(109,90,230,1)');
  });
});

describe('buildBackground', () => {
  const base = {
    type: 'none',
    color: '#eef2f7',
    gradient: { preset: '晴空', angle: 135, colors: ['#e0f2fe', '#ede9fe'] },
    image: { url: '', fit: 'cover', position: 'center' },
    dim: 0,
  } as any;

  it('color', () => {
    expect(buildBackground({ ...base, type: 'color' }).image).toBe('#eef2f7');
  });
  it('gradient uses angle+colors', () => {
    expect(buildBackground({ ...base, type: 'gradient' }).image).toBe('linear-gradient(135deg,#e0f2fe,#ede9fe)');
  });
  it('image cover', () => {
    const r = buildBackground({ ...base, type: 'image', image: { url: 'http://x/y.png', fit: 'cover', position: 'center' } });
    expect(r.image).toBe('url("http://x/y.png")');
    expect(r.size).toBe('cover');
    expect(r.repeat).toBe('no-repeat');
  });
  it('image repeat', () => {
    const r = buildBackground({ ...base, type: 'image', image: { url: 'http://x/y.png', fit: 'repeat', position: 'center' } });
    expect(r.size).toBe('auto');
    expect(r.repeat).toBe('repeat');
  });
  it('image stretch -> 100% 100% (non-uniform fill), no-repeat', () => {
    const r = buildBackground({ ...base, type: 'image', image: { url: 'http://x/y.png', fit: 'stretch', position: 'center' } });
    expect(r.size).toBe('100% 100%');
    expect(r.repeat).toBe('no-repeat');
  });
  it('image contain keeps the contain keyword', () => {
    expect(buildBackground({ ...base, type: 'image', image: { url: 'http://x/y.png', fit: 'contain', position: 'center' } }).size).toBe('contain');
  });
  it('image with empty url -> transparent', () => {
    const r = buildBackground({ ...base, type: 'image', image: { url: '', fit: 'cover', position: 'center' } });
    expect(r.image).toBe('transparent');
  });
  it('none -> transparent', () => {
    expect(buildBackground({ ...base, type: 'none' }).image).toBe('transparent');
  });
});

describe('sanitizeFontFamily', () => {
  it('keeps a normal stack intact', () => {
    expect(sanitizeFontFamily('"Kaiti SC", serif')).toBe('"Kaiti SC", serif');
  });
  it('strips CSS-breakout chars (;{}<>\\)', () => {
    expect(sanitizeFontFamily('Arial;}body{display:none')).toBe('Arialbodydisplay:none');
    expect(sanitizeFontFamily('a<b>c\\d')).toBe('abcd');
  });
  it('strips CSS comment markers / and * (no stylesheet-swallowing)', () => {
    expect(sanitizeFontFamily('Inter /*')).toBe('Inter');
    expect(sanitizeFontFamily('a/*b*/c')).toBe('abc');
  });
  it('drops unbalanced quotes but keeps balanced ones', () => {
    expect(sanitizeFontFamily('"Inter')).toBe('Inter');
    expect(sanitizeFontFamily("O'Font")).toBe('OFont');
    expect(sanitizeFontFamily('"Kaiti SC", serif')).toBe('"Kaiti SC", serif');
  });
  it('collapses newlines/tabs and trims', () => {
    expect(sanitizeFontFamily('  Menlo\n\tmono  ')).toBe('Menlo mono');
  });
  it('empty/nullish -> empty string', () => {
    expect(sanitizeFontFamily('')).toBe('');
    expect(sanitizeFontFamily(undefined as any)).toBe('');
  });
  it('caps length at 200', () => {
    expect(sanitizeFontFamily('a'.repeat(300)).length).toBe(200);
  });
});

describe('toSolidRgb', () => {
  it('drops alpha from rgba', () => expect(toSolidRgb('rgba(0, 21, 41, 0.3)')).toBe('rgb(0,21,41)'));
  it('converts hex', () => expect(toSolidRgb('#001529')).toBe('rgb(0,21,41)'));
  it('passes rgb through (normalized)', () => expect(toSolidRgb('rgb(255,255,255)')).toBe('rgb(255,255,255)'));
  it('falls back on keyword/var', () => expect(toSolidRgb('transparent')).toBe('transparent'));
});

describe('withAlpha', () => {
  it('applies alpha to hex', () => expect(withAlpha('#001529', 0.5)).toBe('rgba(0,21,41,0.5)'));
  it('re-applies alpha to rgba without double-fading (RGB kept)', () => expect(withAlpha('rgba(0, 21, 41, 0.2)', 0.8)).toBe('rgba(0,21,41,0.8)'));
  it('applies alpha to rgb', () => expect(withAlpha('rgb(10, 20, 30)', 1)).toBe('rgba(10,20,30,1)'));
  it('falls back on keyword', () => expect(withAlpha('transparent', 0.5)).toBe('transparent'));
});

describe('fontFormatFromUrl', () => {
  it('maps common extensions (case + query/hash tolerant)', () => {
    expect(fontFormatFromUrl('/x/y.woff2')).toBe('woff2');
    expect(fontFormatFromUrl('http://h/z.WOFF')).toBe('woff');
    expect(fontFormatFromUrl('/a.ttf?sig=abc')).toBe('truetype');
    expect(fontFormatFromUrl('/a.otf#frag')).toBe('opentype');
    expect(fontFormatFromUrl('/a.xyz')).toBe('');
    expect(fontFormatFromUrl('')).toBe('');
  });
});

describe('sanitizeCssUrl', () => {
  it('keeps a normal signed URL intact', () => {
    expect(sanitizeCssUrl('http://h/f.woff2?a=1&b=2')).toBe('http://h/f.woff2?a=1&b=2');
  });
  it('strips chars that could close url()/the rule', () => {
    expect(sanitizeCssUrl('http://h/f");}body{x:1')).toBe('http://h/fbodyx:1');
  });
});
