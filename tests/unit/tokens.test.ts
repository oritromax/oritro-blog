import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { KNOWN_CATEGORIES, categoryVar } from '../../src/lib/category';

/**
 * `categoryVar` emits `var(--c-…)` references. Nothing in TypeScript checks
 * that the token on the other end exists, and a missing one fails silently:
 * the custom property resolves to nothing and the element inherits whatever
 * `--cat` happened to be. These tests close that gap in both themes.
 */
const css = readFileSync(
  fileURLToPath(new URL('../../src/styles/tokens.css', import.meta.url)),
  'utf8'
);

/** Splits tokens.css into its `:root` and `[data-theme="dark"]` blocks. */
function block(selector: string): string {
  const at = css.indexOf(selector);
  expect(at, `${selector} block not found in tokens.css`).toBeGreaterThan(-1);
  const open = css.indexOf('{', at);
  return css.slice(open, css.indexOf('\n}', open));
}

const LIGHT = block(':root {');
const DARK = block('[data-theme="dark"]');

const defines = (scope: string, token: string) =>
  new RegExp(`^\\s*--${token}:\\s*#[0-9A-Fa-f]{3,8}\\s*;`, 'm').test(scope);

const tokenOf = (cat: string) => categoryVar(cat).match(/var\(--([\w-]+)\)/)![1];

describe('category colour tokens', () => {
  it.each(KNOWN_CATEGORIES)('%s resolves to a token defined in the light theme', (cat) => {
    expect(defines(LIGHT, tokenOf(cat)), `--${tokenOf(cat)} missing from :root`).toBe(true);
  });

  it.each(KNOWN_CATEGORIES)('%s resolves to a token defined in the dark theme', (cat) => {
    expect(defines(DARK, tokenOf(cat)), `--${tokenOf(cat)} missing from dark block`).toBe(true);
  });

  it('defines the uncategorized fallback in both themes', () => {
    expect(defines(LIGHT, 'c-life')).toBe(true);
    expect(defines(DARK, 'c-life')).toBe(true);
  });

  it('gives every category a distinct token', () => {
    const tokens = KNOWN_CATEGORIES.map(tokenOf);
    expect(new Set(tokens).size).toBe(tokens.length);
  });

  it('gives every category a distinct colour value in each theme', () => {
    for (const [name, scope] of [['light', LIGHT], ['dark', DARK]] as const) {
      const values = KNOWN_CATEGORIES.map(
        (c) => scope.match(new RegExp(`--${tokenOf(c)}:\\s*(#[0-9A-Fa-f]{6})`))![1].toUpperCase()
      );
      const dupes = values.filter((v, i) => values.indexOf(v) !== i);
      expect(dupes, `duplicate category colours in ${name}`).toEqual([]);
    }
  });

  /* A category colour that equals --text-muted reads as "no category" — that
     is how `lifelesson` looked before it got its own rose token. */
  it('never reuses a muted/neutral text colour as a category colour', () => {
    for (const [name, scope] of [['light', LIGHT], ['dark', DARK]] as const) {
      const muted = scope.match(/--text-muted:\s*(#[0-9A-Fa-f]{6})/)![1].toUpperCase();
      const clashing = KNOWN_CATEGORIES.filter(
        (c) => scope.match(new RegExp(`--${tokenOf(c)}:\\s*(#[0-9A-Fa-f]{6})`))![1].toUpperCase() === muted
      );
      expect(clashing, `category colour equals --text-muted in ${name}`).toEqual([]);
    }
  });
});

describe('tokens.css hygiene', () => {
  it('defines every token the dark theme overrides in the light theme too', () => {
    const darkTokens = [...DARK.matchAll(/^\s*--([\w-]+):/gm)].map((m) => m[1]);
    const lightTokens = new Set([...LIGHT.matchAll(/^\s*--([\w-]+):/gm)].map((m) => m[1]));
    expect(darkTokens.filter((t) => !lightTokens.has(t))).toEqual([]);
  });

  it('uses 6-digit hex for every category colour', () => {
    for (const scope of [LIGHT, DARK]) {
      for (const cat of KNOWN_CATEGORIES) {
        const value = scope.match(new RegExp(`--${tokenOf(cat)}:\\s*([^;]+);`))![1].trim();
        expect(value, `${cat} in tokens.css`).toMatch(/^#[0-9A-Fa-f]{6}$/);
      }
    }
  });
});
