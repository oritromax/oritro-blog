import { describe, it, expect, beforeAll } from 'vitest';
import { experimental_AstroContainer as AstroContainer } from 'astro/container';
import { parseHTML } from 'linkedom';
import PostRow from '../../../src/components/PostRow.astro';

let container: AstroContainer;

beforeAll(async () => {
  container = await AstroContainer.create();
});

/** Minimal stand-in for a CollectionEntry<'blog'> — PostRow reads slug + data. */
function entry(overrides: Partial<Record<string, any>> = {}) {
  const { slug = 'a-post', ...data } = overrides;
  return {
    slug,
    data: {
      title: 'A Post',
      author: 'Oritro Ahmed',
      type: 'post',
      date: new Date('2025-04-01T14:43:11Z'),
      ...data,
    },
  } as any;
}

async function render(post: any) {
  const html = await container.renderToString(PostRow, { props: { post } });
  return parseHTML(`<body>${html}</body>`).document;
}

describe('PostRow', () => {
  it('links the title to the post', async () => {
    const doc = await render(entry({ slug: 'my-homelab-part-1', title: 'Building a Homelab' }));
    const link = doc.querySelector('.post-row-title a')!;
    expect(link.getAttribute('href')).toBe('/blog/my-homelab-part-1');
    expect(link.textContent).toBe('Building a Homelab');
  });

  it('NFC-normalizes the href for NFD Bengali slugs', async () => {
    const slug = 'বগা-লেক';
    const doc = await render(entry({ slug: slug.normalize('NFD') }));
    expect(doc.querySelector('.post-row-title a')!.getAttribute('href')).toBe(
      `/blog/${slug.normalize('NFC')}`
    );
  });

  it('renders a machine-readable and a human-readable date', async () => {
    const doc = await render(entry({ date: new Date('2025-04-01T14:43:11Z') }));
    const time = doc.querySelector('time.post-row-date')!;
    expect(time.getAttribute('datetime')).toBe('2025-04-01T14:43:11.000Z');
    expect(time.textContent).toMatch(/^Apr \d{2}, 2025$/);
  });

  it('shows the description as the excerpt', async () => {
    const doc = await render(entry({ description: 'A short summary.' }));
    expect(doc.querySelector('.post-row-excerpt')!.textContent).toBe('A short summary.');
  });

  it('omits the excerpt when there is no description', async () => {
    const doc = await render(entry());
    expect(doc.querySelector('.post-row-excerpt')).toBeNull();
  });

  describe('category channel', () => {
    it('sets --cat from the primary category', async () => {
      const doc = await render(entry({ categories: ['homelab'] }));
      expect(doc.querySelector('.post-row')!.getAttribute('style')).toBe('--cat: var(--c-homelab)');
    });

    it('falls back to gray for an unknown category', async () => {
      const doc = await render(entry({ categories: ['ভ্রমন'] }));
      expect(doc.querySelector('.post-row')!.getAttribute('style')).toBe('--cat: var(--c-life)');
    });

    it('falls back to gray when a post has no categories', async () => {
      const doc = await render(entry());
      expect(doc.querySelector('.post-row')!.getAttribute('style')).toBe('--cat: var(--c-life)');
    });
  });

  describe('chips and tags', () => {
    it('renders one linked chip per category, each with its own colour', async () => {
      const doc = await render(entry({ categories: ['homelab', 'linux'] }));
      const chips = [...doc.querySelectorAll('a.chip')];
      expect(chips.map((c) => c.textContent!.trim())).toEqual(['homelab', 'linux']);
      expect(chips.map((c) => c.getAttribute('href'))).toEqual([
        '/category/homelab',
        '/category/linux',
      ]);
      expect(chips.map((c) => c.getAttribute('style'))).toEqual([
        '--cat: var(--c-homelab)',
        '--cat: var(--c-linux)',
      ]);
    });

    it('trims the legacy trailing whitespace off displayed categories', async () => {
      const doc = await render(entry({ categories: ['homelab '] }));
      const chip = doc.querySelector('a.chip')!;
      expect(chip.textContent!.trim()).toBe('homelab');
      expect(chip.getAttribute('href')).toBe('/category/homelab');
    });

    it('renders one linked tag per tag', async () => {
      const doc = await render(entry({ tags: ['docker', 'podman'] }));
      const tags = [...doc.querySelectorAll('a.tag')];
      expect(tags.map((t) => t.textContent!.trim())).toEqual(['docker', 'podman']);
      expect(tags.map((t) => t.getAttribute('href'))).toEqual(['/tag/docker', '/tag/podman']);
    });

    it('percent-encodes non-ASCII category and tag hrefs', async () => {
      const doc = await render(entry({ categories: ['ভ্রমন'], tags: ['বাংলা'] }));
      const chip = doc.querySelector('a.chip')!.getAttribute('href')!;
      const tag = doc.querySelector('a.tag')!.getAttribute('href')!;
      expect(decodeURIComponent(chip.slice('/category/'.length))).toBe('ভ্রমন'.normalize('NFC'));
      expect(decodeURIComponent(tag.slice('/tag/'.length))).toBe('বাংলা'.normalize('NFC'));
    });

    it('separates chips from tags only when both are present', async () => {
      const both = await render(entry({ categories: ['ai'], tags: ['llm'] }));
      expect(both.querySelector('.token-sep')).not.toBeNull();

      const catsOnly = await render(entry({ categories: ['ai'] }));
      expect(catsOnly.querySelector('.token-sep')).toBeNull();

      const tagsOnly = await render(entry({ tags: ['llm'] }));
      expect(tagsOnly.querySelector('.token-sep')).toBeNull();
    });

    it('omits the token row entirely when there are no categories or tags', async () => {
      const doc = await render(entry());
      expect(doc.querySelector('.token-row')).toBeNull();
    });

    it('gives every chip and tag an accessible label', async () => {
      const doc = await render(entry({ categories: ['ai'], tags: ['llm'] }));
      expect(doc.querySelector('a.chip')!.getAttribute('aria-label')).toBe(
        'View all posts in ai'
      );
      expect(doc.querySelector('a.tag')!.getAttribute('aria-label')).toBe(
        'View all posts tagged with llm'
      );
    });
  });

  it('escapes HTML in the title rather than rendering it', async () => {
    const doc = await render(entry({ title: '<img src=x onerror=alert(1)>' }));
    expect(doc.querySelector('img')).toBeNull();
    expect(doc.querySelector('.post-row-title a')!.textContent).toBe('<img src=x onerror=alert(1)>');
  });
});
