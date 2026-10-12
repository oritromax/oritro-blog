/** schema.org structured data for post pages. */

export const AUTHOR = {
  '@type': 'Person',
  name: 'Nidal Siddique Oritro',
  url: 'https://ioritro.com/',
} as const;

export interface BlogPostingInput {
  title: string;
  description: string;
  /** canonical URL of the post */
  url: string;
  date: Date;
  /** frontmatter `featured_image`: absolute, or a path resolved against `url` */
  image?: string;
}

export function blogPostingJsonLd({ title, description, url, date, image }: BlogPostingInput) {
  const published = date.toISOString();
  return {
    '@context': 'https://schema.org',
    '@type': 'BlogPosting',
    headline: title,
    description,
    url,
    mainEntityOfPage: { '@type': 'WebPage', '@id': url },
    datePublished: published,
    dateModified: published,
    author: AUTHOR,
    ...(image ? { image: new URL(image, url).href } : {}),
  };
}

/**
 * JSON for a `<script type="application/ld+json">` body. `<` is escaped so a
 * title containing `</script>` (or `<!--`) can never end the element; `<`
 * is the same character to any JSON parser.
 */
export function serializeJsonLd(data: unknown): string {
  return JSON.stringify(data).replace(/</g, '\\u003c');
}
