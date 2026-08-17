import { describe, it, expect, beforeAll } from 'vitest';
import { experimental_AstroContainer as AstroContainer } from 'astro/container';
import { parseHTML } from 'linkedom';
import Sidebar from '../../../src/components/Sidebar.astro';
import { KNOWN_CATEGORIES } from '../../../src/lib/category';

let container: AstroContainer;

beforeAll(async () => {
  container = await AstroContainer.create();
});

const post = (categories?: string[]) => ({ data: { categories } }) as any;

async function render(posts: any[]) {
  const html = await container.renderToString(Sidebar, { props: { posts } });
  return parseHTML(`<body>${html}</body>`).document;
}

const rows = (doc: Document) =>
  [...doc.querySelectorAll('.cat-list li')].map((li) => ({
    name: li.querySelector('.cat-name')!.textContent!.trim(),
    count: Number(li.querySelector('.cat-count')!.textContent!.trim()),
    href: li.querySelector('a')!.getAttribute('href'),
    color: li.getAttribute('style'),
  }));

describe('Sidebar', () => {
  it('renders the identity block once', async () => {
    const doc = await render([post(['ai'])]);
    expect(doc.querySelectorAll('h1.sidebar-role')).toHaveLength(1);
    expect(doc.querySelectorAll('.sidebar-bio').length).toBeGreaterThan(0);
    const avatar = doc.querySelector('img.avatar')!;
    expect(avatar.getAttribute('alt')).toBe('Nidal Siddique Oritro');
    expect(avatar.getAttribute('width')).toBe('220');
    expect(avatar.getAttribute('height')).toBe('275');
  });

  it('links to the portfolio and to all categories', async () => {
    const doc = await render([post(['ai'])]);
    expect(doc.querySelector('a.btn-solid')!.getAttribute('href')).toBe('/portfolio');
    expect(doc.querySelector('a.cat-all')!.getAttribute('href')).toBe('/categories');
  });

  it('opens social links safely in a new tab', async () => {
    const doc = await render([post(['ai'])]);
    const social = [...doc.querySelectorAll('.sidebar-social a')];
    expect(social.length).toBeGreaterThan(0);
    for (const a of social) {
      expect(a.getAttribute('target')).toBe('_blank');
      expect(a.getAttribute('rel')).toContain('noopener');
      expect(a.getAttribute('aria-label')).toBeTruthy();
    }
  });

  describe('category rows', () => {
    it('counts posts per category', async () => {
      const doc = await render([
        post(['ai']),
        post(['ai', 'llm']),
        post(['homelab']),
      ]);
      expect(rows(doc)).toEqual([
        { name: 'ai', count: 2, href: '/category/ai', color: '--cat: var(--c-ai)' },
        { name: 'llm', count: 1, href: '/category/llm', color: '--cat: var(--c-llm)' },
        { name: 'homelab', count: 1, href: '/category/homelab', color: '--cat: var(--c-homelab)' },
      ]);
    });

    it('sorts by count, descending', async () => {
      const doc = await render([
        post(['linux']),
        post(['work']),
        post(['work']),
        post(['work']),
        post(['linux']),
      ]);
      expect(rows(doc).map((r) => [r.name, r.count])).toEqual([
        ['work', 3],
        ['linux', 2],
      ]);
    });

    it('hides categories with no posts', async () => {
      const doc = await render([post(['ai'])]);
      expect(rows(doc).map((r) => r.name)).toEqual(['ai']);
    });

    it('counts case- and whitespace-variant categories as one', async () => {
      const doc = await render([post(['homelab']), post(['HomeLab ']), post(['  HOMELAB'])]);
      expect(rows(doc)).toEqual([
        { name: 'homelab', count: 3, href: '/category/homelab', color: '--cat: var(--c-homelab)' },
      ]);
    });

    it('ignores categories outside the nine colour-mapped ones', async () => {
      const doc = await render([post(['ভ্রমন']), post(['Uncategorized']), post(['ai'])]);
      expect(rows(doc).map((r) => r.name)).toEqual(['ai']);
    });

    it('tolerates posts with no categories at all', async () => {
      const doc = await render([post(undefined), post([]), post(['ai'])]);
      expect(rows(doc).map((r) => [r.name, r.count])).toEqual([['ai', 1]]);
    });

    it('renders an empty list when nothing maps to a known category', async () => {
      const doc = await render([post(['ভ্রমন'])]);
      expect(rows(doc)).toEqual([]);
      // the section and its "all categories" escape hatch still render
      expect(doc.querySelector('.sidebar-cats')).not.toBeNull();
      expect(doc.querySelector('a.cat-all')).not.toBeNull();
    });

    it('can show every known category at once', async () => {
      const doc = await render(KNOWN_CATEGORIES.map((c) => post([c])));
      expect(rows(doc).map((r) => r.name).sort()).toEqual([...KNOWN_CATEGORIES].sort());
      expect(rows(doc).every((r) => r.count === 1)).toBe(true);
    });

    it('gives each row a decorative dot and an accessible label', async () => {
      const doc = await render([post(['ai'])]);
      const li = doc.querySelector('.cat-list li')!;
      expect(li.querySelector('.cat-dot')!.getAttribute('aria-hidden')).toBe('true');
      expect(li.querySelector('a')!.getAttribute('aria-label')).toBe('View all posts in ai');
    });
  });
});
