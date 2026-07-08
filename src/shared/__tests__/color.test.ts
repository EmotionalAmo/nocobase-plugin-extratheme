import { describe, it, expect } from 'vitest';
import { hexToRgba, buildBackground, sanitizeFontFamily, fontFormatFromUrl, sanitizeCssUrl, toSolidRgb, withAlpha, safeCssColor, safeNum } from '../color';

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
  // --- security: no config value may break out of the injected declaration ---
  it('SECURITY color: a CSS-breakout color is rejected to transparent', () => {
    const r = buildBackground({ ...base, type: 'color', color: 'red}body::before{content:"x";background:url(//evil)}' });
    expect(r.image).toBe('transparent');
  });
  it('SECURITY gradient: breakout stops + non-numeric angle are neutralized', () => {
    const r = buildBackground({ ...base, type: 'gradient', gradient: { angle: '90);}body{x:1' as any, colors: ['red)} body::after{content:"X"', '#00f'] } });
    expect(r.image).toBe('linear-gradient(0deg,transparent,#00f)');
  });
  it('SECURITY image url: url() breakout is stripped by sanitizeCssUrl', () => {
    const r = buildBackground({ ...base, type: 'image', image: { url: 'x");}html{}body{background:url(//evil', fit: 'cover', position: 'center' } });
    expect(r.image).not.toContain('");}');
    expect(r.image).not.toContain('body{');
  });
  it('SECURITY fit: an unknown fit falls back to cover (no background-size injection)', () => {
    const r = buildBackground({ ...base, type: 'image', image: { url: 'http://x/y.png', fit: 'auto;}evil{' as any, position: 'center' } });
    expect(r.size).toBe('cover');
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
  it('SECURITY: unparseable input -> safe rgb(0,0,0), NEVER the raw value', () => {
    expect(toSolidRgb('transparent')).toBe('rgb(0,0,0)');
    expect(toSolidRgb('red);}body{x:1')).toBe('rgb(0,0,0)');
  });
});

describe('withAlpha', () => {
  it('applies alpha to hex', () => expect(withAlpha('#001529', 0.5)).toBe('rgba(0,21,41,0.5)'));
  it('re-applies alpha to rgba without double-fading (RGB kept)', () => expect(withAlpha('rgba(0, 21, 41, 0.2)', 0.8)).toBe('rgba(0,21,41,0.8)'));
  it('applies alpha to rgb', () => expect(withAlpha('rgb(10, 20, 30)', 1)).toBe('rgba(10,20,30,1)'));
  it('SECURITY: unparseable input -> transparent, NEVER the raw value (was a CSS-injection sink)', () => {
    expect(withAlpha('transparent', 0.5)).toBe('transparent');
    expect(withAlpha('red;} body{background:url(//evil)} .x{color:red', 0.5)).toBe('transparent');
  });
  it('non-numeric alpha -> coerced to 0', () => expect(withAlpha('#001529', 'x' as any)).toBe('rgba(0,21,41,0)'));
});

describe('safeCssColor (strict CSS-color allow-list)', () => {
  it('accepts hex 3/4/6/8', () => {
    ['#fff', '#ffff', '#ffffff', '#ffffffff'].forEach((c) => expect(safeCssColor(c)).toBe(c));
  });
  it('accepts rgb/rgba/hsl/hsla', () => {
    expect(safeCssColor('rgb(1,2,3)')).toBe('rgb(1,2,3)');
    expect(safeCssColor('rgba(1, 2, 3, 0.5)')).toBe('rgba(1, 2, 3, 0.5)');
    expect(safeCssColor('hsl(120, 50%, 50%)')).toBe('hsl(120, 50%, 50%)');
  });
  it('accepts a bare named color', () => expect(safeCssColor('red')).toBe('red'));
  it('SECURITY: rejects any breakout payload -> transparent', () => {
    ['red}body{x:1', 'rgb(1,2,3)}evil{', '#fff;} @import url(//e)', 'url(//evil)', 'red)/**/'].forEach((c) =>
      expect(safeCssColor(c)).toBe('transparent'),
    );
  });
});

describe('safeNum', () => {
  it('coerces numeric strings', () => expect(safeNum('90')).toBe(90));
  it('non-numeric / injection -> default 0', () => {
    expect(safeNum('90);}body{x:1')).toBe(0);
    expect(safeNum(undefined)).toBe(0);
    expect(safeNum('x', 5)).toBe(5);
  });
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
