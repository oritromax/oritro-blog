import { defineCollection, z } from 'astro:content';

const blogCollection = defineCollection({
  type: 'content',
  schema: z.object({
    title: z.string(),
    description: z.string().optional(),
    pubDate: z.date(),
    updatedDate: z.date().optional(),
    author: z.string().default('Anonymous'),
    image: z.string().optional(),
    tags: z.array(z.string()).optional(),
    category: z.string().optional().default('Uncategorized')
  })
});

export const collections = {
  'blog': blogCollection
};