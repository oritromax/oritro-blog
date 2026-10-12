import { describe, it, expect } from 'vitest';
import { relatedPosts, postNeighbors, chronological } from '../../src/lib/related';

interface Fixture {
  slug: string;
  data: { date: Date; tags?: string[]; categories?: string[] };
}

const post = (
  slug: string,
  date: string,
  extra: { tags?: string[]; categories?: string[] } = {}
): Fixture => ({ slug, data: { date: new Date(date), ...extra } });

const slugs = (posts: Fixture[]) => posts.map((p) => p.slug);

/** Deterministic shuffle, so "input order doesn't matter" is tested without randomness. */
const rotations = <T,>(xs: T[]) => xs.map((_, i) => [...xs.slice(i), ...xs.slice(0, i)]);

describe('relatedPosts', () => {
  it('ranks shared tags above recency', () => {
    const current = post('current', '2026-01-01', { tags: ['docker', 'podman'] });
    const all = [
      current,
      post('newest-unrelated', '2026-01-02'),
      post('old-one-tag', '2015-01-01', { tags: ['docker'] }),
      post('older-two-tags', '2013-01-01', { tags: ['podman', 'docker'] }),
    ];
    expect(slugs(relatedPosts(current, all))).toEqual([
      'older-two-tags',
      'old-one-tag',
      'newest-unrelated',
    ]);
  });

  it('compares tags by slug, so case and spacing variants count as shared', () => {
    const current = post('current', '2026-01-01', { tags: ['Name server', 'AI'] });
    const all = [
      current,
      post('near', '2025-12-31'),
      post('variant', '2010-01-01', { tags: ['name-server', ' ai '] }),
    ];
    expect(slugs(relatedPosts(current, all))).toEqual(['variant', 'near']);
  });

  it('does not count a tag repeated on one post twice', () => {
    const current = post('current', '2026-01-01', { tags: ['ai', 'AI', 'llm'] });
    const all = [
      current,
      post('repeats', '2026-01-02', { tags: ['ai', 'Ai', 'AI'] }),
      post('two-distinct', '2020-01-01', { tags: ['ai', 'llm'] }),
    ];
    expect(slugs(relatedPosts(current, all))).toEqual(['two-distinct', 'repeats']);
  });

  it('falls back to a shared category when no tags overlap', () => {
    const current = post('current', '2026-01-01', { tags: ['docker'], categories: ['homelab'] });
    const all = [
      current,
      post('newest-other-category', '2026-01-02', { tags: ['css'], categories: ['codebox'] }),
      post('old-same-category', '2014-01-01', { categories: ['HomeLab '] }),
    ];
    expect(slugs(relatedPosts(current, all))).toEqual([
      'old-same-category',
      'newest-other-category',
    ]);
  });

  it('lets a shared tag outrank a shared category', () => {
    const current = post('current', '2026-01-01', { tags: ['docker'], categories: ['homelab'] });
    const all = [
      current,
      post('same-category', '2025-12-31', { categories: ['homelab'] }),
      post('shared-tag', '2012-01-01', { tags: ['docker'], categories: ['linux'] }),
      post('both', '2011-01-01', { tags: ['docker'], categories: ['homelab'] }),
    ];
    expect(slugs(relatedPosts(current, all))).toEqual(['both', 'shared-tag', 'same-category']);
  });

  it('breaks score ties by the date nearest the current post, in either direction', () => {
    const current = post('current', '2020-06-15');
    const all = [
      current,
      post('five-years-later', '2025-06-15'),
      post('a-month-before', '2020-05-15'),
      post('a-week-after', '2020-06-22'),
      post('a-year-before', '2019-06-15'),
    ];
    expect(slugs(relatedPosts(current, all))).toEqual([
      'a-week-after',
      'a-month-before',
      'a-year-before',
    ]);
  });

  it('prefers the newer post, then the slug, when two are equally near', () => {
    const current = post('current', '2020-06-15');
    const equidistant = [
      current,
      post('day-before', '2020-06-14'),
      post('day-after', '2020-06-16'),
    ];
    expect(slugs(relatedPosts(current, equidistant))).toEqual(['day-after', 'day-before']);

    const sameDay = [current, post('b', '2020-06-16'), post('c', '2020-06-16'), post('a', '2020-06-16')];
    expect(slugs(relatedPosts(current, sameDay))).toEqual(['a', 'b', 'c']);
  });

  it('never includes the current post', () => {
    const current = post('current', '2026-01-01', { tags: ['ai'], categories: ['ai'] });
    const all = [current, post('other', '2020-01-01'), { ...current }];
    expect(slugs(relatedPosts(current, all))).toEqual(['other']);
  });

  it('returns the same order whatever order the posts arrive in', () => {
    const current = post('current', '2022-03-01', { tags: ['ai', 'llm'], categories: ['work'] });
    const all = [
      current,
      post('a', '2022-03-02', { tags: ['ai'] }),
      post('b', '2022-03-02', { tags: ['llm'] }),
      post('c', '2021-01-01', { categories: ['work'] }),
      post('d', '2023-02-01', { categories: ['work'] }),
      post('e', '2022-02-28'),
      post('f', '2019-01-01', { tags: ['ai', 'llm'] }),
    ];
    const expected = slugs(relatedPosts(current, all, 6));
    expect(expected).toEqual(['f', 'a', 'b', 'd', 'c', 'e']);
    for (const order of rotations(all)) {
      expect(slugs(relatedPosts(current, order, 6))).toEqual(expected);
      expect(slugs(relatedPosts(current, [...order].reverse(), 6))).toEqual(expected);
    }
  });

  it('returns three by default and honours a different limit', () => {
    const current = post('current', '2026-01-01');
    const all = [current, ...[1, 2, 3, 4, 5].map((n) => post(`p${n}`, `2025-0${n}-01`))];
    expect(relatedPosts(current, all)).toHaveLength(3);
    expect(relatedPosts(current, all, 2)).toHaveLength(2);
  });

  it('returns what there is when fewer than three candidates exist', () => {
    const current = post('current', '2026-01-01');
    expect(relatedPosts(current, [current])).toEqual([]);
    expect(relatedPosts(current, [])).toEqual([]);
    expect(slugs(relatedPosts(current, [current, post('only', '2020-01-01')]))).toEqual(['only']);
  });

  it('does not mutate its input', () => {
    const current = post('current', '2026-01-01');
    const all = [post('z', '2020-01-01'), current, post('a', '2025-01-01')];
    relatedPosts(current, all);
    expect(slugs(all)).toEqual(['z', 'current', 'a']);
  });
});

describe('postNeighbors', () => {
  const first = post('first', '2013-01-01');
  const middle = post('middle', '2020-01-01');
  const last = post('last', '2026-01-01');
  const all = [last, first, middle];

  it('returns the posts published just before and just after', () => {
    const { older, newer } = postNeighbors(middle, all);
    expect(older?.slug).toBe('first');
    expect(newer?.slug).toBe('last');
  });

  it('gives the first post no older neighbour', () => {
    const { older, newer } = postNeighbors(first, all);
    expect(older).toBeUndefined();
    expect(newer?.slug).toBe('middle');
  });

  it('gives the last post no newer neighbour', () => {
    const { older, newer } = postNeighbors(last, all);
    expect(older?.slug).toBe('middle');
    expect(newer).toBeUndefined();
  });

  it('orders posts sharing a timestamp by slug, giving one stable chain', () => {
    const tied = [
      post('tie-c', '2020-01-01'),
      post('after', '2021-01-01'),
      post('tie-a', '2020-01-01'),
      post('before', '2019-01-01'),
      post('tie-b', '2020-01-01'),
    ];
    const chain = ['before', 'tie-a', 'tie-b', 'tie-c', 'after'];
    expect(slugs(chronological(tied))).toEqual(chain);
    for (const order of rotations(tied)) {
      chain.forEach((slug, i) => {
        const { older, newer } = postNeighbors(order.find((p) => p.slug === slug)!, order);
        expect(older?.slug).toBe(chain[i - 1]);
        expect(newer?.slug).toBe(chain[i + 1]);
      });
    }
  });

  it('is symmetric: my newer neighbour names me as its older one', () => {
    for (const p of all) {
      const { newer } = postNeighbors(p, all);
      if (newer) expect(postNeighbors(newer, all).older?.slug).toBe(p.slug);
    }
  });

  it('returns nothing for a lone post or one that is not in the list', () => {
    expect(postNeighbors(first, [first])).toEqual({ older: undefined, newer: undefined });
    expect(postNeighbors(post('stranger', '2020-01-01'), all)).toEqual({});
  });
});
