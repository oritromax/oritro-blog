import { defineCollection, z } from 'astro:content';

const blogCollection = defineCollection({
  type: 'content',
  schema: z.object({
    title: z.string(),
    author: z.string().default('Oritro Ahmed'),
    type: z.string().default('post'),
    date: z.date(),
    url: z.string().optional(),
    featured_image: z.string().optional(),
    categories: z.array(z.string()).optional(),
    tags: z.array(z.string()).optional(),
    description: z.string().optional()
  })
});

export const collections = {
  'blog': blogCollection
};