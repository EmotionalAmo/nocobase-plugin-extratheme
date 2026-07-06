import { describe, it, expect } from 'vitest';
import { hexToRgba, buildBackground, sanitizeFontFamily } from '../color';

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
