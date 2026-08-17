import { describe, it, expect } from 'vitest';
import {
  KNOWN_CATEGORIES,
  categoryVar,
  primaryCategory,
  postCatVar,
  hasCategory,
  categorySlug,
  categoryHref,
  tagSlug,
  tagHref,
  postHref,
} from '../../src/lib/category';

describe('KNOWN_CATEGORIES', () => {
  it('is the nine color-mapped categories', () => {
    expect(KNOWN_CATEGORIES).toEqual([
      'ai',
      'llm',
      'homelab',
      'selfhost',
      'codebox',
      'linux',
      'work',
      'lecture',
      'lifelesson',
    ]);
  });

  it('maps every known category to a distinct, non-fallback token', () => {
    const vars = KNOWN_CATEGORIES.map((c) => categoryVar(c));
    expect(new Set(vars).size).toBe(KNOWN_CATEGORIES.length);
    // `lifelesson` is the only one that legitimately resolves to --c-life
    expect(vars.filter((v) => v === 'var(--c-life)')).toEqual(['var(--c-life)']);
  });
});

describe('categoryVar', () => {
  it('returns the token for a known category', () => {
    expect(categoryVar('ai')).toBe('var(--c-ai)');
    expect(categoryVar('homelab')).toBe('var(--c-homelab)');
  });

  it('maps lifelesson onto the life channel', () => {
    expect(categoryVar('lifelesson')).toBe('var(--c-life)');
  });

  it('is case-insensitive', () => {
    expect(categoryVar('HomeLab')).toBe('var(--c-homelab)');
    expect(categoryVar('AI')).toBe('var(--c-ai)');
  });

  it('tolerates the legacy trailing-whitespace frontmatter', () => {
    expect(categoryVar('homelab ')).toBe('var(--c-homelab)');
    expect(categoryVar('  work  ')).toBe('var(--c-work)');
  });

  it('falls back to gray for unknown categories', () => {
    expect(categoryVar('ভ্রমন')).toBe('var(--c-life)');
    expect(categoryVar('Uncategorized')).toBe('var(--c-life)');
  });

  it('falls back to gray for undefined and empty input', () => {
    expect(categoryVar()).toBe('var(--c-life)');
    expect(categoryVar('')).toBe('var(--c-life)');
  });

  it('does not resolve inherited Object.prototype keys', () => {
    expect(categoryVar('constructor')).toBe('var(--c-life)');
    expect(categoryVar('toString')).toBe('var(--c-life)');
    expect(categoryVar('hasOwnProperty')).toBe('var(--c-life)');
  });
});

describe('primaryCategory', () => {
  it('returns the first category that maps to a color', () => {
    expect(primaryCategory(['homelab', 'ai'])).toBe('homelab');
  });

  it('skips unknown categories to find a known one', () => {
    expect(primaryCategory(['ভ্রমন', 'linux'])).toBe('linux');
  });

  it('preserves the original casing of the matched category', () => {
    expect(primaryCategory(['HomeLab'])).toBe('HomeLab');
  });

  it('trims the returned value', () => {
    expect(primaryCategory(['homelab '])).toBe('homelab');
  });

  it('returns undefined when nothing is known', () => {
    expect(primaryCategory(['ভ্রমন', 'random'])).toBeUndefined();
    expect(primaryCategory([])).toBeUndefined();
    expect(primaryCategory()).toBeUndefined();
  });

  it('does not treat inherited Object.prototype keys as known categories', () => {
    expect(primaryCategory(['toString', 'constructor'])).toBeUndefined();
    expect(primaryCategory(['toString', 'ai'])).toBe('ai');
  });
});

describe('postCatVar', () => {
  it('uses the primary category colour', () => {
    expect(postCatVar(['ভ্রমন', 'selfhost'])).toBe('var(--c-selfhost)');
  });

  it('falls back to gray when no category is known', () => {
    expect(postCatVar(['ভ্রমন'])).toBe('var(--c-life)');
    expect(postCatVar(undefined)).toBe('var(--c-life)');
  });
});

describe('hasCategory', () => {
  it('matches ignoring case and surrounding whitespace on both sides', () => {
    expect(hasCategory(['HomeLab '], 'homelab')).toBe(true);
    expect(hasCategory(['homelab'], ' HOMELAB ')).toBe(true);
  });

  it('does not match on substrings', () => {
    expect(hasCategory(['homelab'], 'lab')).toBe(false);
  });

  it('returns false for undefined or empty categories', () => {
    expect(hasCategory(undefined, 'ai')).toBe(false);
    expect(hasCategory([], 'ai')).toBe(false);
  });
});

describe('categorySlug', () => {
  it('lowercases, trims, and NFC-normalizes', () => {
    expect(categorySlug('  HomeLab ')).toBe('homelab');
  });

  it('collapses NFD and NFC spellings of the same Bengali word', () => {
    const word = 'ভ্রমন';
    expect(categorySlug(word.normalize('NFD'))).toBe(categorySlug(word.normalize('NFC')));
    expect(categorySlug(word.normalize('NFD'))).toBe(word.normalize('NFC').toLowerCase());
  });

  it('collapses trailing-space variants onto one slug', () => {
    expect(categorySlug('homelab ')).toBe(categorySlug('homelab'));
  });
});

describe('categoryHref', () => {
  it('builds a /category/ URL from the canonical slug', () => {
    expect(categoryHref('HomeLab ')).toBe('/category/homelab');
  });

  it('percent-encodes non-ASCII slugs', () => {
    const href = categoryHref('ভ্রমন');
    expect(href.startsWith('/category/%')).toBe(true);
    expect(decodeURIComponent(href.slice('/category/'.length))).toBe('ভ্রমন'.normalize('NFC'));
  });

  it('encodes characters that would otherwise break the path', () => {
    expect(categoryHref('c/c++')).toBe('/category/c%2Fc%2B%2B');
  });
});

describe('tagSlug / tagHref', () => {
  it('preserves case (routes are built case-sensitively for tags)', () => {
    expect(tagSlug('Docker')).toBe('Docker');
  });

  it('trims and NFC-normalizes', () => {
    expect(tagSlug(' Docker ')).toBe('Docker');
    const word = 'ভ্রমন';
    expect(tagSlug(word.normalize('NFD'))).toBe(word.normalize('NFC'));
  });

  it('builds an encoded /tag/ URL', () => {
    expect(tagHref('Docker')).toBe('/tag/Docker');
    expect(decodeURIComponent(tagHref('ভ্রমন').slice('/tag/'.length))).toBe(
      'ভ্রমন'.normalize('NFC')
    );
  });
});

describe('postHref', () => {
  it('builds a /blog/ URL', () => {
    expect(postHref('my-homelab-part-1')).toBe('/blog/my-homelab-part-1');
  });

  it('NFC-normalizes slugs that came from NFD filenames', () => {
    const slug = 'একটি-থ্রিজি-গল্প';
    expect(postHref(slug.normalize('NFD'))).toBe(`/blog/${slug.normalize('NFC')}`);
  });

  it('produces byte-identical hrefs for NFD and NFC spellings', () => {
    const slug = 'বগা-লেক';
    expect(postHref(slug.normalize('NFD'))).toBe(postHref(slug.normalize('NFC')));
  });
});
