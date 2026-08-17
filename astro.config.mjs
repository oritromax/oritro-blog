// @ts-check
import { defineConfig } from 'astro/config';

import tailwindcss from '@tailwindcss/vite';

import sitemap from '@astrojs/sitemap';
import remarkDirective from 'remark-directive';
import remarkAside from './src/lib/remark-aside.mjs';
import rehypeCode from './src/lib/rehype-code.mjs';
import shikiTheme from './src/lib/shiki-theme.mjs';

// https://astro.build/config
export default defineConfig({
  vite: {
    /* astro pins vite 6.x while @tailwindcss/vite pulls 7.x, so the two Plugin
       types are nominally different despite being interchangeable at runtime.
       Drop the cast once both land on the same major. */
    plugins: [/** @type {any} */ (tailwindcss())],
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
    // code surfaces stay dark in both themes — custom theme matches tokens.css
    shikiConfig: { theme: shikiTheme },
    remarkPlugins: [remarkDirective, remarkAside],
    rehypePlugins: [rehypeCode]
  }
});
