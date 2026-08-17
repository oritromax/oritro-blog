import { describe, it, expect, beforeAll } from 'vitest';
import { experimental_AstroContainer as AstroContainer } from 'astro/container';
import { parseHTML } from 'linkedom';
import Pagination from '../../../src/components/Pagination.astro';

let container: AstroContainer;

beforeAll(async () => {
  container = await AstroContainer.create();
});

async function render(props: { currentPage: number; totalPages: number }) {
  const html = await container.renderToString(Pagination, { props });
  return parseHTML(`<body>${html}</body>`).document;
}

describe('Pagination', () => {
  it('renders nothing when there is only one page', async () => {
    const doc = await render({ currentPage: 1, totalPages: 1 });
    expect(doc.querySelector('nav.pagination')).toBeNull();
  });

  it('renders nothing when there are no pages', async () => {
    const doc = await render({ currentPage: 1, totalPages: 0 });
    expect(doc.querySelector('nav.pagination')).toBeNull();
  });

  it('renders a labelled nav with one link per page', async () => {
    const doc = await render({ currentPage: 2, totalPages: 5 });
    const nav = doc.querySelector('nav.pagination')!;
    expect(nav.getAttribute('aria-label')).toBe('Pagination');
    expect(doc.querySelectorAll('.page-num')).toHaveLength(5);
    expect([...doc.querySelectorAll('.page-num')].map((a) => a.textContent!.trim())).toEqual([
      '1',
      '2',
      '3',
      '4',
      '5',
    ]);
  });

  it('links page 1 to / and the rest to /page/N', async () => {
    const doc = await render({ currentPage: 3, totalPages: 4 });
    expect([...doc.querySelectorAll('.page-num')].map((a) => a.getAttribute('href'))).toEqual([
      '/',
      '/page/2',
      '/page/3',
      '/page/4',
    ]);
  });

  it('marks only the current page with aria-current and .current', async () => {
    const doc = await render({ currentPage: 3, totalPages: 4 });
    const current = [...doc.querySelectorAll('[aria-current="page"]')];
    expect(current).toHaveLength(1);
    expect(current[0].textContent!.trim()).toBe('3');
    expect(current[0].className).toContain('current');

    const marked = [...doc.querySelectorAll('.page-num.current')];
    expect(marked).toHaveLength(1);
  });

  it('labels each page link for screen readers', async () => {
    const doc = await render({ currentPage: 1, totalPages: 3 });
    expect([...doc.querySelectorAll('.page-num')].map((a) => a.getAttribute('aria-label'))).toEqual([
      'Page 1',
      'Page 2',
      'Page 3',
    ]);
  });

  describe('previous / next affordances', () => {
    it('disables Previous on the first page and links Next', async () => {
      const doc = await render({ currentPage: 1, totalPages: 3 });
      const [prev, next] = [...doc.querySelectorAll('.pagination > .btn')];
      expect(prev.tagName.toLowerCase()).toBe('span');
      expect(prev.getAttribute('aria-disabled')).toBe('true');
      expect(next.tagName.toLowerCase()).toBe('a');
      expect(next.getAttribute('href')).toBe('/page/2');
    });

    it('disables Next on the last page and links Previous', async () => {
      const doc = await render({ currentPage: 3, totalPages: 3 });
      const [prev, next] = [...doc.querySelectorAll('.pagination > .btn')];
      expect(prev.tagName.toLowerCase()).toBe('a');
      expect(prev.getAttribute('href')).toBe('/page/2');
      expect(next.tagName.toLowerCase()).toBe('span');
      expect(next.getAttribute('aria-disabled')).toBe('true');
    });

    it('links Previous back to / from page 2', async () => {
      const doc = await render({ currentPage: 2, totalPages: 3 });
      const [prev] = [...doc.querySelectorAll('.pagination > .btn')];
      expect(prev.getAttribute('href')).toBe('/');
    });

    it('links both directions on a middle page', async () => {
      const doc = await render({ currentPage: 3, totalPages: 5 });
      const [prev, next] = [...doc.querySelectorAll('.pagination > .btn')];
      expect(prev.getAttribute('href')).toBe('/page/2');
      expect(next.getAttribute('href')).toBe('/page/4');
    });

    it('never emits an href on a disabled control', async () => {
      const doc = await render({ currentPage: 1, totalPages: 2 });
      for (const el of doc.querySelectorAll('[aria-disabled="true"]')) {
        expect(el.getAttribute('href')).toBeNull();
      }
    });
  });
});
