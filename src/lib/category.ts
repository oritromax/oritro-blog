/**
 * Category → color-token resolution.
 *
 * Frontmatter carries `categories` as an ARRAY (posts are multi-category),
 * and legacy entries have trailing whitespace ("homelab ") — everything is
 * trimmed and lowercased before lookup. Unknown categories (the Bangla
 * long tail, one-offs) fall back to the gray `--c-life` channel and are
 * excluded from the homepage sidebar list.
 */
const CATEGORY_COLORS = {
  ai: 'ai',
  llm: 'llm',
  homelab: 'homelab',
  selfhost: 'selfhost',
  codebox: 'codebox',
  linux: 'linux',
  work: 'work',
  lecture: 'lecture',
  lifelesson: 'life',
} as const;

/** The nine categories that get a color and a sidebar row. */
export const KNOWN_CATEGORIES = Object.keys(CATEGORY_COLORS);

/** Returns a CSS custom-property reference. Unknown categories fall back to gray. */
export function categoryVar(cat?: string): string {
  const key = CATEGORY_COLORS[cat?.trim().toLowerCase() as keyof typeof CATEGORY_COLORS];
  return `var(--c-${key ?? 'life'})`;
}

/** First category of a post that maps to a known color — drives the page-level --cat. */
export function primaryCategory(categories?: string[]): string | undefined {
  return categories
    ?.map((c) => c.trim())
    .find((c) => c.toLowerCase() in CATEGORY_COLORS);
}

/** Page-level --cat value for a post: primary category's color, else gray. */
export function postCatVar(categories?: string[]): string {
  return categoryVar(primaryCategory(categories));
}

/** Case/whitespace-insensitive membership test used for counts and matching. */
export function hasCategory(categories: string[] | undefined, name: string): boolean {
  return !!categories?.some((c) => c.trim().toLowerCase() === name.trim().toLowerCase());
}
