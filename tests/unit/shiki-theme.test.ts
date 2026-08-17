import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import rawTheme from '../../src/lib/shiki-theme.mjs';

type ThemeSetting = { scope?: string[]; settings: { [k: string]: string } };
/* the module is typed as Astro's wide ShikiConfig['theme'] union (which
   includes preset name strings); narrow it to the object we actually export */
const theme = rawTheme as unknown as {
  name: string;
  type: string;
  colors: Record<string, string>;
  settings: ThemeSetting[];
};

const tokensCss = readFileSync(
  fileURLToPath(new URL('../../src/styles/tokens.css', import.meta.url)),
  'utf8'
);

/** Reads a custom property from a specific block of tokens.css. */
function cssToken(name: string, { dark = false } = {}): string {
  const matches = [...tokensCss.matchAll(new RegExp(`^\\s*--${name}:\\s*([^;]+);`, 'gm'))].map(
    (m) => m[1].trim()
  );
  if (matches.length === 0) throw new Error(`--${name} not found in tokens.css`);
  // the file lists light values first, then the dark-theme overrides
  return dark ? matches[matches.length - 1] : matches[0];
}

const scopesOf = (scope: string) =>
  theme.settings.find((s) => s.scope?.includes(scope));

describe('shiki-theme: shape', () => {
  it('is a dark theme with a stable name', () => {
    expect(theme.name).toBe('ioritro-code');
    expect(theme.type).toBe('dark');
  });

  it('declares editor colors', () => {
    expect(theme.colors['editor.background']).toMatch(/^#[0-9A-F]{6}$/i);
    expect(theme.colors['editor.foreground']).toMatch(/^#[0-9A-F]{6}$/i);
  });

  it('opens with a default background/foreground setting that has no scope', () => {
    const base = theme.settings[0];
    expect(base.scope).toBeUndefined();
    expect(base.settings.background).toBe(theme.colors['editor.background']);
    expect(base.settings.foreground).toBe(theme.colors['editor.foreground']);
  });

  it('uses uppercase 6-digit hex for every foreground', () => {
    for (const s of theme.settings) {
      if (s.settings.foreground) expect(s.settings.foreground).toMatch(/^#[0-9A-F]{6}$/);
    }
  });

  it('assigns each scope to exactly one setting', () => {
    const all = theme.settings.flatMap((s) => s.scope ?? []);
    expect(new Set(all).size).toBe(all.length);
  });

  it('covers the scopes every highlighted post relies on', () => {
    const all = theme.settings.flatMap((s) => s.scope ?? []);
    for (const scope of [
      'comment',
      'string',
      'constant.numeric',
      'keyword',
      'entity.name.function',
      'entity.name.tag',
      'variable',
      'punctuation',
    ]) {
      expect(all).toContain(scope);
    }
  });
});

describe('shiki-theme: alignment with tokens.css', () => {
  it('matches the code surface tokens', () => {
    expect(theme.colors['editor.background'].toLowerCase()).toBe(
      cssToken('code-bg').toLowerCase()
    );
    expect(theme.colors['editor.foreground'].toLowerCase()).toBe(
      cssToken('code-text').toLowerCase()
    );
  });

  it('renders plain variables in the body code color', () => {
    expect(scopesOf('variable')!.settings.foreground.toLowerCase()).toBe(
      cssToken('code-text').toLowerCase()
    );
  });

  it('renders operators and punctuation in the dim code color', () => {
    expect(scopesOf('keyword.operator')!.settings.foreground.toLowerCase()).toBe(
      cssToken('code-dim').toLowerCase()
    );
  });

  /* syntax colors are drawn from the dark-theme category palette so code
     surfaces stay coherent with the rest of the design system */
  it.each([
    ['constant.numeric', 'c-homelab'],
    ['keyword', 'c-llm'],
    ['entity.name.function', 'c-selfhost'],
    ['entity.name.tag', 'c-codebox'],
  ])('%s uses the dark %s token', (scope, token) => {
    expect(scopesOf(scope)!.settings.foreground.toLowerCase()).toBe(
      cssToken(token, { dark: true }).toLowerCase()
    );
  });

  it('italicizes comments', () => {
    expect(scopesOf('comment')!.settings.fontStyle).toBe('italic');
  });
});
