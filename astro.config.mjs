// @ts-check
import { defineConfig } from 'astro/config';

import tailwindcss from '@tailwindcss/vite';

import sitemap from '@astrojs/sitemap';

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
  integrations: [sitemap()]
});