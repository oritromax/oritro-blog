/**
 * Post-to-post linking: the "Keep reading" ranking and the chronological
 * prev/next neighbours. Both are pure so they can be unit-tested without
 * `astro:content` — they only read `slug` and a few frontmatter fields.
 */
import { categorySlug, tagSlug } from './category';

export interface LinkablePost {
  slug: string;
  data: {
    date: Date;
    tags?: string[];
    categories?: string[];
  };
}

/* slugs, not raw strings: "AI"/"ai" and "Name server"/"name-server" are one tag */
const slugSet = (values: string[] | undefined, slug: (s: string) => string) =>
  new Set((values ?? []).map(slug).filter(Boolean));

const overlap = (a: Set<string>, b: Set<string>) => [...a].filter((x) => b.has(x)).length;

/* locale-independent, so the order is the same on every build machine */
const bySlug = (a: string, b: string) => (a < b ? -1 : a > b ? 1 : 0);

/**
 * The `limit` posts most related to `current`, best first.
 *
 * Ranked by shared tags, then by sharing a category, then by how close the
 * publish date is to the current post's. The remaining ties fall to the newer
 * post and finally to the slug, so the result never depends on input order.
 * Posts with nothing in common still qualify — an old post with no tags gets
 * its nearest neighbours in time rather than an empty section.
 */
export function relatedPosts<T extends LinkablePost>(current: T, all: T[], limit = 3): T[] {
  const tags = slugSet(current.data.tags, tagSlug);
  const categories = slugSet(current.data.categories, categorySlug);
  const now = current.data.date.valueOf();

  return all
    .filter((p) => p.slug !== current.slug)
    .map((post) => ({
      post,
      sharedTags: overlap(tags, slugSet(post.data.tags, tagSlug)),
      sameCategory: overlap(categories, slugSet(post.data.categories, categorySlug)) > 0 ? 1 : 0,
      distance: Math.abs(post.data.date.valueOf() - now),
    }))
    .sort(
      (a, b) =>
        b.sharedTags - a.sharedTags ||
        b.sameCategory - a.sameCategory ||
        a.distance - b.distance ||
        b.post.data.date.valueOf() - a.post.data.date.valueOf() ||
        bySlug(a.post.slug, b.post.slug)
    )
    .slice(0, limit)
    .map(({ post }) => post);
}

/** Oldest first; posts sharing a timestamp are ordered by slug. */
export function chronological<T extends LinkablePost>(posts: T[]): T[] {
  return [...posts].sort(
    (a, b) => a.data.date.valueOf() - b.data.date.valueOf() || bySlug(a.slug, b.slug)
  );
}

/** The posts published immediately before and after `current`, if any. */
export function postNeighbors<T extends LinkablePost>(
  current: T,
  all: T[]
): { older?: T; newer?: T } {
  const ordered = chronological(all);
  const i = ordered.findIndex((p) => p.slug === current.slug);
  if (i === -1) return {};
  return { older: ordered[i - 1], newer: ordered[i + 1] };
}
