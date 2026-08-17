import { defineCollection } from 'astro:content';
import { blogSchema } from '../lib/content-schema';

const blogCollection = defineCollection({
  type: 'content',
  schema: blogSchema
});

export const collections = {
  'blog': blogCollection
};
