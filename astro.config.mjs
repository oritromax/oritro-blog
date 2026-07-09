// @ts-check
import { defineConfig } from 'astro/config';

import tailwindcss from '@tailwindcss/vite';

import sitemap from '@astrojs/sitemap';
import remarkDirective from 'remark-directive';
import remarkAside from './src/lib/remark-aside.mjs';
import rehypeCode from './src/lib/rehype-code.mjs';

// https://astro.build/config
export default defineConfig({
  vite: {
    plugins: [tailwindcss()],
    server: {
      fs: {
        allow: ['..']
      }
    },
    optimizeDeps: {
      exclude: ['astro:content']
    }
  },
  site: 'https://ioritro.com',
  integrations: [sitemap()],
  markdown: {
    // code surfaces stay dark in both themes — deliberate
    shikiConfig: { theme: 'github-dark' },
    remarkPlugins: [remarkDirective, remarkAside],
    rehypePlugins: [rehypeCode]
  }
});
