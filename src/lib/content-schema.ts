/**
 * Frontmatter contract for the `blog` collection.
 *
 * Lives here rather than in `src/content/config.ts` so tests can import it
 * without pulling in the `astro:content` virtual module. `astro/zod` is the
 * exact zod instance Astro validates with, so this is the same check the
 * build performs — not a re-implementation of it.
 *
 * Per AGENTS.md: this schema is the contract. If a build fails on a
 * frontmatter field, fix the post — do NOT loosen the schema.
 */
import { z } from 'astro/zod';

export const blogSchema = z.object({
  title: z.string(),
  author: z.string().default('Oritro Ahmed'),
  type: z.string().default('post'),
  date: z.date(),
  url: z.string().optional(),
  featured_image: z.string().optional(),
  categories: z.array(z.string()).optional(),
  tags: z.array(z.string()).optional(),
  description: z.string().optional(),
});

export type BlogFrontmatter = z.infer<typeof blogSchema>;
